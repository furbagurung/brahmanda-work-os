<?php

declare(strict_types=1);

function taskAttachmentUploadDirectory(): string
{
    return dirname(__DIR__) . '/uploads/task-attachments';
}

function taskAttachmentPublicUrl(string $filename): string
{
    $configuredBase = trim((string) appConfig('uploads_base_url', ''));
    if ($configuredBase !== '') {
        return rtrim($configuredBase, '/') . '/task-attachments/' . rawurlencode($filename);
    }

    $forwardedProtocol = trim(explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''))[0]);
    $scheme = $forwardedProtocol !== ''
        ? $forwardedProtocol
        : ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http');
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $scriptName = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? '/api/attachments.php'));
    $backendPath = rtrim(str_replace('\\', '/', dirname(dirname($scriptName))), '/.');

    return $scheme . '://' . $host . ($backendPath === '' ? '' : $backendPath)
        . '/uploads/task-attachments/' . rawurlencode($filename);
}

function taskAttachmentImageResource(string $sourcePath, string $mimeType)
{
    if (!extension_loaded('gd')) {
        return false;
    }

    return match ($mimeType) {
        'image/jpeg' => function_exists('imagecreatefromjpeg') ? @imagecreatefromjpeg($sourcePath) : false,
        'image/png' => function_exists('imagecreatefrompng') ? @imagecreatefrompng($sourcePath) : false,
        'image/webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($sourcePath) : false,
        default => false,
    };
}

function taskAttachmentMemoryLimitBytes(): ?int
{
    $value = trim((string) ini_get('memory_limit'));
    if ($value === '' || $value === '-1') {
        return null;
    }

    $unit = strtolower(substr($value, -1));
    $number = (float) $value;
    return match ($unit) {
        'g' => (int) ($number * 1024 * 1024 * 1024),
        'm' => (int) ($number * 1024 * 1024),
        'k' => (int) ($number * 1024),
        default => (int) $number,
    };
}

function taskAttachmentImageSafetyError(string $sourcePath): ?string
{
    $imageInfo = @getimagesize($sourcePath);
    if ($imageInfo === false || empty($imageInfo[0]) || empty($imageInfo[1])) {
        return 'The image dimensions could not be read safely.';
    }

    $width = (int) $imageInfo[0];
    $height = (int) $imageInfo[1];
    $pixels = $width * $height;
    if ($pixels > 25_000_000) {
        return 'Image is too large to optimize safely. Please upload a smaller image.';
    }

    // GD keeps decoded source and destination bitmaps in memory simultaneously.
    $estimatedBytes = (int) ceil($pixels * 14);
    $memoryLimit = taskAttachmentMemoryLimitBytes();
    if ($memoryLimit !== null) {
        $reservedBytes = 32 * 1024 * 1024;
        $availableBytes = max(
            0,
            $memoryLimit - memory_get_usage(true) - $reservedBytes
        );
        if ($estimatedBytes > $availableBytes) {
            return 'Image is too large to optimize safely. Please upload a smaller image.';
        }
    }

    return null;
}

function taskAttachmentSaveImage($image, string $destination, string $mimeType): bool
{
    return match ($mimeType) {
        'image/jpeg' => function_exists('imagejpeg') && imagejpeg($image, $destination, 82),
        'image/png' => function_exists('imagepng') && imagepng($image, $destination, 7),
        'image/webp' => function_exists('imagewebp') && imagewebp($image, $destination, 82),
        default => false,
    };
}

function taskAttachmentCreateDerivative(
    string $sourcePath,
    string $destination,
    string $mimeType,
    int $maxWidth
): bool {
    if (taskAttachmentImageSafetyError($sourcePath) !== null) {
        return false;
    }
    $source = taskAttachmentImageResource($sourcePath, $mimeType);
    if ($source === false) {
        return false;
    }

    $sourceWidth = imagesx($source);
    $sourceHeight = imagesy($source);
    if ($sourceWidth < 1 || $sourceHeight < 1) {
        imagedestroy($source);
        return false;
    }

    $targetWidth = min($sourceWidth, $maxWidth);
    $targetHeight = max(1, (int) round($sourceHeight * ($targetWidth / $sourceWidth)));
    $target = imagecreatetruecolor($targetWidth, $targetHeight);
    if ($target === false) {
        imagedestroy($source);
        return false;
    }

    if (in_array($mimeType, ['image/png', 'image/webp'], true)) {
        imagealphablending($target, false);
        imagesavealpha($target, true);
        $transparent = imagecolorallocatealpha($target, 0, 0, 0, 127);
        imagefilledrectangle($target, 0, 0, $targetWidth, $targetHeight, $transparent);
    }

    $resampled = imagecopyresampled(
        $target,
        $source,
        0,
        0,
        0,
        0,
        $targetWidth,
        $targetHeight,
        $sourceWidth,
        $sourceHeight
    );
    $saved = $resampled && taskAttachmentSaveImage($target, $destination, $mimeType);
    imagedestroy($target);
    imagedestroy($source);

    return $saved;
}

function taskAttachmentImageSupportError(string $mimeType): ?string
{
    if (!extension_loaded('gd') || !function_exists('imagecreatetruecolor')) {
        return 'PHP GD extension is not enabled. Enable extension=gd in php.ini.';
    }
    if ($mimeType === 'image/gif') {
        return 'Animated GIF optimization is not supported; the original GIF was left unchanged.';
    }

    $requiredFunctions = match ($mimeType) {
        'image/jpeg' => ['imagecreatefromjpeg', 'imagejpeg'],
        'image/png' => ['imagecreatefrompng', 'imagepng'],
        'image/webp' => ['imagecreatefromwebp', 'imagewebp'],
        default => [],
    };
    if ($requiredFunctions === []) {
        return 'Unsupported image MIME type: ' . ($mimeType ?: 'unknown') . '.';
    }
    foreach ($requiredFunctions as $function) {
        if (!function_exists($function)) {
            return 'PHP GD is missing required image function: ' . $function . '().';
        }
    }
    return null;
}

function optimizeTaskAttachmentImage(
    string $sourcePath,
    string $destinationDirectory,
    string $baseName,
    string $mimeType,
    string $extension
): array {
    if (!is_file($sourcePath)) {
        return ['error' => 'Source image file does not exist.'];
    }
    if (!is_readable($sourcePath)) {
        return ['error' => 'Source image file is not readable.'];
    }
    $supportError = taskAttachmentImageSupportError($mimeType);
    if ($supportError !== null) {
        return ['error' => $supportError];
    }
    $safetyError = taskAttachmentImageSafetyError($sourcePath);
    if ($safetyError !== null) {
        return ['error' => $safetyError, 'too_large' => true];
    }

    $optimizedFilename = $baseName . '-optimized.' . $extension;
    $thumbnailFilename = $baseName . '-thumbnail.' . $extension;
    $optimizedPhysicalPath = $destinationDirectory . '/' . $optimizedFilename;
    $thumbnailPhysicalPath = $destinationDirectory . '/' . $thumbnailFilename;

    if (!taskAttachmentCreateDerivative($sourcePath, $optimizedPhysicalPath, $mimeType, 1600)) {
        if (is_file($optimizedPhysicalPath)) {
            @unlink($optimizedPhysicalPath);
        }
        return ['error' => 'Failed to decode or create the optimized image.'];
    }

    $result = [
        'optimized_filename' => $optimizedFilename,
        'optimized_physical_path' => $optimizedPhysicalPath,
    ];

    if (taskAttachmentCreateDerivative($sourcePath, $thumbnailPhysicalPath, $mimeType, 400)) {
        $result['thumbnail_filename'] = $thumbnailFilename;
        $result['thumbnail_physical_path'] = $thumbnailPhysicalPath;
    } elseif (is_file($thumbnailPhysicalPath)) {
        @unlink($thumbnailPhysicalPath);
        $result['thumbnail_error'] = 'Failed to create the thumbnail image.';
    } else {
        $result['thumbnail_error'] = 'Failed to decode or create the thumbnail image.';
    }

    return $result;
}
