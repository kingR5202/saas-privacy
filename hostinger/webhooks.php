<?php
/**
 * Webhook handler for Hostinger
 * Recebe callbacks de PushinPay, Blackout, NovaPlex, etc e credita o painel
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

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
    curl_close($ch);
    return json_decode($resp, true);
}

function supabasePatch($table, $filters, $data) {
    global $SUPABASE_URL, $SUPABASE_KEY;
    $parts = [];
    foreach ($filters as $k => $v) { $parts[] = urlencode($k) . '=' . $v; }
    $url = "$SUPABASE_URL/rest/v1/$table?" . implode('&', $parts);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => 'PATCH',
        CURLOPT_POSTFIELDS => json_encode($data),
        CURLOPT_HTTPHEADER => ["apikey: $SUPABASE_KEY", "Authorization: Bearer $SUPABASE_KEY", 'Content-Type: application/json', 'Prefer: return=representation'],
    ]);
    $resp = curl_exec($ch);
    curl_close($ch);
    return json_decode($resp, true);
}

function supabasePost($table, $data) {
    global $SUPABASE_URL, $SUPABASE_KEY;
    $ch = curl_init("$SUPABASE_URL/rest/v1/$table");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($data),
        CURLOPT_HTTPHEADER => ["apikey: $SUPABASE_KEY", "Authorization: Bearer $SUPABASE_KEY", 'Content-Type: application/json', 'Prefer: return=representation'],
    ]);
    $resp = curl_exec($ch);
    curl_close($ch);
    return json_decode($resp, true);
}

// 1. Recebendo Payload do Webhook do Gateway e do User (owner) vinculado
$ownerId = $_GET['u'] ?? null;
$raw_input = file_get_contents('php://input');
$input = json_decode($raw_input, true);

if (!$input) {
    $input = $_POST; // Fallback se enviaram form-urlencoded
}

// Log temporário em arquivo txt para debugar o payload de todos os gateways (inclusive NovaPlex)
$logLine = "[" . date('Y-m-d H:i:s') . "] RAW=" . $raw_input . " | PARSED=" . print_r($input, true) . "\n";
file_put_contents(__DIR__ . '/webhook_log.txt', $logLine, FILE_APPEND);

// O ID Externo que o Gateway manda varia conforme o gateway 
$txId = $input['transaction_id'] ?? $input['id'] ?? $input['transactionId'] ?? null;
if (!$txId && isset($input['transaction']['id'])) $txId = $input['transaction']['id'];
if (!$txId && isset($input['transaction']['transactionId'])) $txId = $input['transaction']['transactionId'];
if (!$txId && isset($input['data']['id'])) $txId = $input['data']['id'];
if (!$txId && isset($input['data']['transactionId'])) $txId = $input['data']['transactionId'];

// Algumas respostas trazem o status aninhado
$status = $input['status'] ?? $input['payment_status'] ?? null;
if (!$status && isset($input['transaction']['transactionState'])) {
    $status = $input['transaction']['transactionState']; // Novaplex
}
if (!$status && isset($input['data']['status'])) {
    $status = $input['data']['status']; // Blackout/Buckpay
}

error_log("[WEBHOOK] Raw: " . $raw_input);
error_log("[WEBHOOK] Parsed TxId: " . $txId . " | Status: " . $status);

$isPaid = false;
if ($status) {
    // NovaPlex manda "COMPLETED" em maiusculo, etc. Converter tudo pra minusculo
    $lowerStatus = strtolower(trim($status));
    $isPaid = in_array($lowerStatus, ['completed', 'succeeded', 'paid', 'approved', 'confirmed', 'completo']);
}

// 2. Se for PAGO e tiver ID da transacao (externalId do gateway)
if ($txId && $isPaid && $ownerId) {
    // Busca a transaction pelo id externo (+ segurança pro owner)
    $txs = supabaseGet('transactions', ['externalTransactionId' => "eq.$txId", 'limit' => '1', 'select' => '*']);
    
    if (is_array($txs) && count($txs) > 0) {
        $txData = $txs[0];
        
        // Se ela ainda nao foi computada
        if ($txData['status'] !== 'completed' && $txData['status'] !== 'paid') {
            
            // A) ATUALIZAR TABELA DE TRANSACAO -> PARA PAGO
            supabasePatch('transactions', ['id' => "eq." . $txData['id']], [
                'status' => 'completed'
            ]);
            
            // B) ATUALIZAR CARTEIRA E GANHOS DO MODELO (WALLET)
            $creatorEarnings = isset($txData['creatorEarningsInCents']) ? intval($txData['creatorEarningsInCents']) : 0;
            $profileId = isset($txData['profileId']) ? intval($txData['profileId']) : 0;
            
            if ($profileId) {
                $wallets = supabaseGet('wallets', ['profileId' => "eq.$profileId", 'limit' => '1', 'select' => '*']);
                
                if (is_array($wallets) && count($wallets) > 0) {
                    $walletData = $wallets[0];
                    supabasePatch('wallets', ['id' => "eq." . $walletData['id']], [
                        'balanceInCents' => intval($walletData['balanceInCents']) + $creatorEarnings,
                        'totalEarningsInCents' => intval($walletData['totalEarningsInCents']) + $creatorEarnings
                    ]);
                } else {
                    supabasePost('wallets', [
                        'profileId' => $profileId,
                        'balanceInCents' => $creatorEarnings,
                        'totalEarningsInCents' => $creatorEarnings
                    ]);
                }
            }
            
            echo json_encode(['received' => true, 'action' => 'updated_wallet', 'earnings_credited' => $creatorEarnings]);
            exit;
        }
    }
}

// Retorna 200 pro gateway de qualquer forma
echo json_encode(['received' => true, 'action' => 'ignored']);
