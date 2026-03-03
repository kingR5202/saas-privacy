<?php
/**
 * Image Upload API for Hostinger
 * Accepts image files, converts to WebP, saves in /uploads/
 * Returns the public URL of the uploaded image
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'Only POST allowed']); http_response_code(405); exit;
}

// Config
$uploadDir = __DIR__ . '/../uploads/';
$maxSize = 10 * 1024 * 1024; // 10MB
$quality = 80; // WebP quality

// Ensure upload directory exists
if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

if (!isset($_FILES['image'])) {
    echo json_encode(['error' => 'No image uploaded']); http_response_code(400); exit;
}

$file = $_FILES['image'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    echo json_encode(['error' => 'Upload error: ' . $file['error']]); http_response_code(400); exit;
}
if ($file['size'] > $maxSize) {
    echo json_encode(['error' => 'File too large (max 10MB)']); http_response_code(400); exit;
}

// Detect image type
$mime = mime_content_type($file['tmp_name']);
$allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
if (!in_array($mime, $allowedTypes)) {
    echo json_encode(['error' => 'Invalid image type: ' . $mime]); http_response_code(400); exit;
}

// Load image based on type
switch ($mime) {
    case 'image/jpeg': $img = imagecreatefromjpeg($file['tmp_name']); break;
    case 'image/png':
        $img = imagecreatefrompng($file['tmp_name']);
        // Preserve transparency
        imagepalettetotruecolor($img);
        imagealphablending($img, true);
        imagesavealpha($img, true);
        break;
    case 'image/gif': $img = imagecreatefromgif($file['tmp_name']); break;
    case 'image/webp': $img = imagecreatefromwebp($file['tmp_name']); break;
    case 'image/bmp': $img = imagecreatefrombmp($file['tmp_name']); break;
    default: echo json_encode(['error' => 'Unsupported format']); http_response_code(400); exit;
}

if (!$img) {
    echo json_encode(['error' => 'Failed to process image']); http_response_code(500); exit;
}

// Generate unique filename
$filename = bin2hex(random_bytes(8)) . '_' . time() . '.webp';
$filepath = $uploadDir . $filename;

// Convert to WebP
$success = imagewebp($img, $filepath, $quality);
imagedestroy($img);

if (!$success) {
    echo json_encode(['error' => 'WebP conversion failed']); http_response_code(500); exit;
}

// Build public URL
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'];
$url = "$protocol://$host/uploads/$filename";

echo json_encode([
    'url' => $url,
    'filename' => $filename,
    'size' => filesize($filepath),
    'format' => 'webp',
]);
