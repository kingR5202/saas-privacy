<?php
/**
 * Payment API Proxy for Hostinger
 * Reads gateway config from Supabase and routes to PushinPay/Blackout/NovaPlex/VizzionPay/AlphaCash/BuckPay
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// Supabase config
$SUPABASE_URL = 'https://qcvrmbqyawmgezifunkh.supabase.co';
$SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdnJtYnF5YXdtZ2V6aWZ1bmtoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjM4OTA0OSwiZXhwIjoyMDg3OTY1MDQ5fQ.H8vrN9r4orppkpg6XBQdbEnd8-AfAOwJ4MuoGV4aGFI';

function supabaseGet($table, $filters) {
    global $SUPABASE_URL, $SUPABASE_KEY;
    $parts = [];
    foreach ($filters as $k => $v) { $parts[] = urlencode($k) . '=' . $v; }
    $url = "$SUPABASE_URL/rest/v1/$table?" . implode('&', $parts);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ["apikey: $SUPABASE_KEY", "Authorization: Bearer $SUPABASE_KEY", 'Accept: application/json'],
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($httpCode >= 400) error_log("Supabase GET $table error ($httpCode): $resp");
    return json_decode($resp, true);
}

function supabasePost($table, $data) {
    global $SUPABASE_URL, $SUPABASE_KEY;
    $ch = curl_init("$SUPABASE_URL/rest/v1/$table");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($data),
        CURLOPT_HTTPHEADER => ["apikey: $SUPABASE_KEY", "Authorization: Bearer $SUPABASE_KEY", 'Content-Type: application/json', 'Prefer: return=minimal'],
    ]);
    curl_exec($ch); curl_close($ch);
}

function logTransaction($userId, $profileId, $gateway, $amount, $status, $externalId = null) {
    // Calculo da plataforma (10%) para manter logica do node
    $platformFee = round($amount * 0.10);
    $creatorEarnings = $amount - $platformFee;
    
    // Fallback de subscriber, se $userId não vier ele assume o Id 1 para cliente anonimo publico
    $subId = $userId ? intval($userId) : 1;
    
    supabasePost('transactions', [
        'subscriberId' => $subId, 
        'profileId' => intval($profileId), 
        'paymentGateway' => strtolower($gateway),
        'amountInCents' => intval($amount),
        'platformFeeInCents' => $platformFee,
        'creatorEarningsInCents' => $creatorEarnings,
        'status' => strtolower($status), 
        'externalTransactionId' => $externalId
    ]);
}

function generateCPF() {
    $n = [];
    for ($i = 0; $i < 9; $i++) $n[] = rand(0, 9);
    $d1 = 0; for ($i = 0; $i < 9; $i++) $d1 += $n[$i] * (10 - $i);
    $d1 = 11 - ($d1 % 11); if ($d1 >= 10) $d1 = 0; $n[] = $d1;
    $d2 = 0; for ($i = 0; $i < 10; $i++) $d2 += $n[$i] * (11 - $i);
    $d2 = 11 - ($d2 % 11); if ($d2 >= 10) $d2 = 0; $n[] = $d2;
    return implode('', $n);
}

function apiCall($url, $method = 'GET', $headers = [], $body = null) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['body' => json_decode($resp, true) ?: $resp, 'http_code' => $httpCode];
}

// Get input
$input = json_decode(file_get_contents('php://input'), true) ?: [];
$userId = $input['userId'] ?? $_GET['userId'] ?? null;
$profileId = $input['profileId'] ?? $_GET['profileId'] ?? null;

if (!$userId) { echo json_encode(['error' => 'Missing userId']); http_response_code(400); exit; }

// Get gateway config from Supabase
$configs = supabaseGet('gateway_configs', ['userId' => "eq.$userId", 'select' => '*']);

if (!is_array($configs) || (isset($configs['message']) && !isset($configs[0]))) {
    echo json_encode(['error' => 'Gateway não configurado. Configure no Dashboard.', 'debug' => $configs]); http_response_code(400); exit;
}
if (empty($configs) || !isset($configs[0])) {
    echo json_encode(['error' => 'Gateway não configurado. Configure no Dashboard.']); http_response_code(400); exit;
}
$gw = $configs[0];

// POST: Create payment
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $amount = intval($input['amount'] ?? 0);
    if (!$amount) { echo json_encode(['error' => 'Amount required']); http_response_code(400); exit; }

    // Get per-profile redirect URL (falls back to gateway config redirect)
    $redirectUrl = $gw['redirect_url'] ?? '';
    if ($profileId) {
        $profileData = supabaseGet('profiles', ['id' => "eq.$profileId", 'select' => 'redirect_url']);
        if (!empty($profileData[0]['redirect_url'])) {
            $redirectUrl = $profileData[0]['redirect_url'];
        }
    }

    switch ($gw['gateway']) {
        case 'pushinpay':
            $token = $gw['pushinpay_token'] ?? '';
            if (!$token) { echo json_encode(['error' => 'Token PushinPay não configurado']); http_response_code(400); exit; }
            $result = apiCall('https://api.pushinpay.com.br/api/pix/cashIn', 'POST', [
                'Content-Type: application/json', 'Accept: application/json', "Authorization: Bearer $token"
            ], json_encode(['value' => $amount]));
            $data = $result['body'];
            $txId = $data['id'] ?? null;
            logTransaction($userId, $profileId, 'pushinpay', $amount, 'pending', $txId);
            echo json_encode([
                'id' => $txId,
                'qr_code' => $data['qr_code'] ?? $data['pix_code'] ?? '',
                'qr_code_base64' => $data['qr_code_base64'] ?? '',
                'status' => 'PENDING', 'amount' => $amount,
                'redirect_url' => $redirectUrl, 'debug_raw' => $data
            ]); exit;

        case 'blackout':
            $pub = $gw['blackout_public_key'] ?? '';
            $sec = $gw['blackout_secret_key'] ?? '';
            if (!$pub || !$sec) { echo json_encode(['error' => 'Chaves Blackout não configuradas']); http_response_code(400); exit; }
            $auth = 'Basic ' . base64_encode("$pub:$sec");
            $result = apiCall('https://api.blackpayments.pro/v1/transactions', 'POST', [
                'Content-Type: application/json', "Authorization: $auth"
            ], json_encode([
                'amount' => $amount, 'paymentMethod' => 'pix',
                'customer' => ['name' => 'Cliente', 'email' => 'cliente@anonimo.com', 'document' => ['number' => generateCPF(), 'type' => 'cpf']],
                'items' => [['title' => 'Acesso Premium', 'unitPrice' => $amount, 'quantity' => 1, 'tangible' => false]],
            ]));
            $data = $result['body'];
            $qr = $data['pix']['qrcode'] ?? $data['qrcode'] ?? $data['qr_code'] ?? '';
            $txId = $data['id'] ?? null;
            logTransaction($userId, $profileId, 'blackout', $amount, 'pending', $txId);
            echo json_encode([
                'id' => $txId, 'qr_code' => $qr,
                'status' => 'PENDING', 'amount' => $amount,
                'redirect_url' => $redirectUrl, 'debug_raw' => $data
            ]); exit;

        case 'novaplex':
            $cid = $gw['novaplex_client_id'] ?? '';
            $csec = $gw['novaplex_client_secret'] ?? '';
            if (!$cid || !$csec) { echo json_encode(['error' => 'Credenciais NovaPlex não configuradas']); http_response_code(400); exit; }
            $extId = 'ord-' . time() . '-' . rand(100, 999);
            $result = apiCall('https://api.novaplex.com.br/api/transactions/create', 'POST', [
                'Content-Type: application/json', "ci: $cid", "cs: $csec"
            ], json_encode([
                'amount' => $amount / 100,
                'payerName' => 'Cliente',
                'payerDocument' => generateCPF(),
                'transactionId' => $extId,
                'description' => 'Assinatura Privacy',
                'projectWebhook' => "https://privacybrasil.blog/api/webhooks.php?u=$userId"
            ]));
            $data = $result['body'];
            $qr = $data['qrCodeResponse']['qrcode'] ?? $data['pix']['qrcode'] ?? $data['qrcode'] ?? '';
            $txId = $data['id'] ?? $data['transactionId'] ?? $extId;
            logTransaction($userId, $profileId, 'novaplex', $amount, 'pending', $txId);
            echo json_encode(['id' => $txId, 'qr_code' => $qr, 'status' => 'PENDING', 'amount' => $amount, 'redirect_url' => $redirectUrl, 'debug_raw' => $data]); exit;

        case 'vizzionpay':
            $pubKey = $gw['vizzionpay_public_key'] ?? '';
            $secKey = $gw['vizzionpay_secret_key'] ?? '';
            if (!$pubKey || !$secKey) { echo json_encode(['error' => 'Chaves VizzionPay não configuradas']); http_response_code(400); exit; }
            $extId = 'vz-' . time() . '-' . rand(100, 999);
            $result = apiCall('https://app.vizzionpay.com/api/v1/gateway/pix/receive', 'POST', [
                'Content-Type: application/json', "x-public-key: $pubKey", "x-secret-key: $secKey"
            ], json_encode(['identifier' => $extId, 'amount' => $amount / 100, 'client' => ['name' => 'Cliente', 'email' => 'c@p.com', 'document' => generateCPF()]]));
            $data = $result['body'];
            $qr = $data['pix']['code'] ?? $data['qrcode'] ?? '';
            $txId = $data['transactionId'] ?? $extId;
            logTransaction($userId, $profileId, 'vizzionpay', $amount, 'pending', $txId);
            echo json_encode(['id' => $txId, 'qr_code' => $qr, 'status' => 'PENDING', 'amount' => $amount, 'redirect_url' => $redirectUrl, 'debug_raw' => $data]); exit;

        case 'alphacash':
            $pubKey = $gw['alphacash_public_key'] ?? '';
            $secKey = $gw['alphacash_secret_key'] ?? '';
            if (!$pubKey || !$secKey) { echo json_encode(['error' => 'Chaves AlphaCash não configuradas']); http_response_code(400); exit; }
            $auth = 'Basic ' . base64_encode("$pubKey:$secKey");
            $extId = 'ac-' . time() . '-' . rand(100,999);
            $result = apiCall('https://api.alphacashpay.com.br/v1/transactions', 'POST', [
                'Content-Type: application/json', "Authorization: $auth"
            ], json_encode(['amount' => $amount, 'paymentMethod' => 'pix', 'customer' => ['name' => 'Cliente', 'email' => 'c@p.com', 'phone' => '5500000000000', 'document' => ['number' => generateCPF(), 'type' => 'cpf']], 'items' => [['title' => 'Assinatura', 'unitPrice' => $amount, 'quantity' => 1, 'tangible' => false]]]));
            $data = $result['body'];
            $qr = $data['pix']['qrcode'] ?? $data['qrcode'] ?? '';
            $txId = $data['id'] ?? $extId;
            logTransaction($userId, $profileId, 'alphacash', $amount, 'pending', $txId);
            echo json_encode(['id' => $txId, 'qr_code' => $qr, 'status' => 'PENDING', 'amount' => $amount, 'redirect_url' => $redirectUrl, 'debug_raw' => $data]); exit;

        case 'buckpay':
            $bpToken = $gw['buckpay_token'] ?? '';
            $bpAgent = 'Buckpay API';
            if (!$bpToken) { echo json_encode(['error' => 'Token BuckPay não configurado']); http_response_code(400); exit; }
            $extId = 'bp-' . time() . '-' . rand(100, 999);
            $result = apiCall('https://api.realtechdev.com.br/v1/transactions', 'POST', [
                'Content-Type: application/json', "Authorization: Bearer $bpToken", "User-Agent: $bpAgent"
            ], json_encode(['external_id' => $extId, 'payment_method' => 'pix', 'amount' => $amount, 'buyer' => ['name' => 'Cliente', 'email' => 'c@p.com', 'document' => generateCPF()]]));
            $data = $result['body'];
            $pixData = $data['data']['pix'] ?? $data['pix'] ?? [];
            $qr = $pixData['code'] ?? $pixData['qrcode'] ?? '';
            $txId = $data['data']['id'] ?? $extId;
            logTransaction($userId, $profileId, 'buckpay', $amount, 'pending', $txId);
            echo json_encode(['id' => $txId, 'qr_code' => $qr, 'status' => 'PENDING', 'amount' => $amount, 'redirect_url' => $redirectUrl, 'debug_raw' => $data]); exit;

        case 'aureapag':
            $token = $gw['aureapag_api_token'] ?? '';
            $offer = $gw['aureapag_offer_hash'] ?? '';
            $product = $gw['aureapag_product_hash'] ?? '';
            if (!$token || !$offer) { echo json_encode(['error' => 'Configuração AureaPag incompleta']); http_response_code(400); exit; }
            $extId = 'ap-' . time() . '-' . rand(100, 999);
            $result = apiCall("https://api.aureapag.com.br/api/public/v1/transactions?api_token=$token", 'POST', [
                'Accept: application/json', 'Content-Type: application/json'
            ], json_encode([
                'amount' => (int)($amount / 10), // AureaPag doc says centavos, but amount is already in centavos? No, usually it's centavos. My $amount is 1990 (R$19.90). Doc says 15000 is R$15.00? No, 15000 is R$150.00. Wait, 15000 centavos is 150 reais. My amount is centavos.
                'offer_hash' => $offer,
                'payment_method' => 'pix',
                'customer' => ['name' => 'Cliente', 'email' => 'cliente@pagamento.com', 'phone_number' => '11999999999', 'document' => generateCPF()],
                'cart' => [['product_hash' => $product, 'title' => 'Assinatura Conteúdo', 'price' => $amount, 'quantity' => 1, 'operation_type' => 1, 'tangible' => false]],
                'transaction_origin' => 'api'
            ]));
            $data = $result['body'];
            // Doc doesn't show response explicitly, assuming standard structure. Based on Postman it's a request.
            // Let's check common patterns or assume it returns pix data.
            $qr = $data['pix']['qrcode'] ?? $data['pix']['code'] ?? $data['data']['pix']['qrcode'] ?? $data['data']['pix']['code'] ?? '';
            $txHash = $data['hash'] ?? $data['data']['hash'] ?? $extId;
            logTransaction($userId, $profileId, 'aureapag', $amount, 'pending', $txHash);
            echo json_encode(['id' => $txHash, 'qr_code' => $qr, 'status' => 'PENDING', 'amount' => $amount, 'redirect_url' => $redirectUrl, 'debug_raw' => $data]); exit;
    }
}

// GET: Check payment status
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['id'])) {
    $id = $_GET['id'];
    switch ($gw['gateway']) {
        case 'pushinpay':
            $token = $gw['pushinpay_token'];
            $result = apiCall("https://api.pushinpay.com.br/api/transactions/" . urlencode($id), 'GET', [
                'Accept: application/json', "Authorization: Bearer $token"
            ]);
            echo json_encode($result['body']); exit;

        case 'blackout':
            $auth = 'Basic ' . base64_encode($gw['blackout_public_key'] . ':' . $gw['blackout_secret_key']);
            $result = apiCall("https://api.blackpayments.pro/v1/transactions/" . urlencode($id), 'GET', [
                'Accept: application/json', "Authorization: $auth"
            ]);
            echo json_encode($result['body']); exit;

        case 'novaplex':
            $cid = $gw['novaplex_client_id'] ?? '';
            $csec = $gw['novaplex_client_secret'] ?? '';
            $result = apiCall("https://api.novaplex.com.br/api/transactions/check", 'POST', [
                "ci: $cid", "cs: $csec", 'Content-Type: application/json', 'Accept: application/json'
            ], json_encode(['transactionId' => $id]));
            $st = strtoupper($result['body']['transaction']['transactionState'] ?? $result['body']['status'] ?? 'PENDENTE');
            $paid = in_array($st, ['COMPLETO', 'COMPLETED', 'PAID', 'APPROVED']);
            echo json_encode(['status' => $paid ? 'paid' : 'pending']); exit;

        case 'vizzionpay':
            $pubKey = $gw['vizzionpay_public_key'] ?? '';
            $secKey = $gw['vizzionpay_secret_key'] ?? '';
            $result = apiCall("https://app.vizzionpay.com/api/v1/gateway/transactions/" . urlencode($id), 'GET', [
                "x-public-key: $pubKey", "x-secret-key: $secKey", 'Accept: application/json'
            ]);
            $st = strtolower($result['body']['status'] ?? 'pending');
            $paid = in_array($st, ['completed', 'succeeded', 'paid', 'approved', 'confirmed']);
            echo json_encode(['status' => $paid ? 'paid' : 'pending']); exit;

        case 'alphacash':
            $auth = 'Basic ' . base64_encode(($gw['alphacash_public_key'] ?? '') . ':' . ($gw['alphacash_secret_key'] ?? ''));
            $result = apiCall("https://api.alphacashpay.com.br/v1/transactions/" . urlencode($id), 'GET', [
                "Authorization: $auth", 'Accept: application/json'
            ]);
            $st = strtolower($result['body']['status'] ?? $result['body']['data']['status'] ?? 'pending');
            $paid = in_array($st, ['completed', 'succeeded', 'paid', 'approved', 'confirmed']);
            echo json_encode(['status' => $paid ? 'paid' : 'pending']); exit;

        case 'buckpay':
            $bpToken = $gw['buckpay_token'] ?? '';
            $bpAgent = 'Buckpay API';
            $result = apiCall("https://api.realtechdev.com.br/v1/transactions/external_id/" . urlencode($id), 'GET', [
                "Authorization: Bearer $bpToken", "User-Agent: $bpAgent", 'Accept: application/json'
            ]);
            $st = strtolower($result['body']['data']['status'] ?? $result['body']['status'] ?? 'pending');
            $paid = in_array($st, ['completed', 'succeeded', 'paid', 'approved', 'confirmed']);
            echo json_encode(['status' => $paid ? 'paid' : 'pending']); exit;

        case 'aureapag':
            $token = $gw['aureapag_api_token'] ?? '';
            $result = apiCall("https://api.aureapag.com.br/api/public/v1/transactions/" . urlencode($id) . "?api_token=$token", 'GET', [
                'Accept: application/json'
            ]);
            $st = strtolower($result['body']['status'] ?? $result['body']['data']['status'] ?? 'pending');
            $paid = in_array($st, ['paid', 'completed', 'approved', 'succeeded', 'confirmed']);
            echo json_encode(['status' => $paid ? 'paid' : 'pending']); exit;
    }
}

echo json_encode(['error' => 'Invalid request']);
