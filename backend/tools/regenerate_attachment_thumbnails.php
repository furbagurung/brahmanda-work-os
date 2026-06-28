<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/image_optimizer.php';

function regeneratedAttachmentUrl(array $attachment, string $filename): string
{
    foreach (['file_url', 'optimized_url', 'thumbnail_url', 'url'] as $key) {
        $existingUrl = trim((string) ($attachment[$key] ?? ''));
        if ($existingUrl === '' || !filter_var($existingUrl, FILTER_VALIDATE_URL)) {
            continue;
        }
        $parts = parse_url($existingUrl);
        if (!$parts || empty($parts['host'])) {
            continue;
        }
        $scheme = $parts['scheme'] ?? 'http';
        $port = isset($parts['port']) ? ':' . $parts['port'] : '';
        $directory = rtrim(str_replace('\\', '/', dirname($parts['path'] ?? '/')), '/.');
        return $scheme . '://' . $parts['host'] . $port
            . ($directory === '' ? '' : $directory) . '/' . rawurlencode($filename);
    }

    return taskAttachmentPublicUrl($filename);
}

function attachmentDiagnostic(array $attachment, string $status, string $reason, ?string $resolvedPath = null): array
{
    return [
        'id' => (int) $attachment['id'],
        'original_filename' => $attachment['original_filename'] ?? null,
        'file_path' => $attachment['file_path'] ?? null,
        'file_url' => $attachment['file_url'] ?? null,
        'resolved_path' => $resolvedPath,
        'status' => $status,
        'reason' => $reason,
    ];
}

function resolveAttachmentSourcePath(array $attachment, string $uploadDirectory): array
{
    $attempted = [];
    foreach (['file_path', 'file_url', 'url'] as $key) {
        $storedValue = trim((string) ($attachment[$key] ?? ''));
        if ($storedValue === '') {
            continue;
        }

        $pathValue = $storedValue;
        if (filter_var($storedValue, FILTER_VALIDATE_URL)) {
            $pathValue = (string) (parse_url($storedValue, PHP_URL_PATH) ?? '');
        }
        $pathValue = rawurldecode(str_replace('\\', '/', $pathValue));

        if (is_file($pathValue)) {
            $realDirectPath = realpath($pathValue);
            if (
                $realDirectPath !== false
                && str_starts_with($realDirectPath, $uploadDirectory . DIRECTORY_SEPARATOR)
            ) {
                return [$realDirectPath, $attempted];
            }
        }

        $filename = basename($pathValue);
        if ($filename === '' || $filename === '.' || $filename === '..') {
            continue;
        }
        $candidate = $uploadDirectory . DIRECTORY_SEPARATOR . $filename;
        $attempted[] = $candidate;
        $realCandidate = realpath($candidate);
        if (
            $realCandidate !== false
            && str_starts_with($realCandidate, $uploadDirectory . DIRECTORY_SEPARATOR)
            && is_file($realCandidate)
        ) {
            return [$realCandidate, $attempted];
        }
    }

    return [null, $attempted];
}

$summary = [
    'total_checked' => 0,
    'regenerated' => 0,
    'skipped' => 0,
    'skipped_missing_file' => 0,
    'skipped_too_large' => 0,
    'failed' => 0,
    'message' => null,
    'details' => [],
];

try {
    $pdo = Database::connect();
    $statement = $pdo->query(
        'SELECT id, file_path, file_url, url, original_filename, mime_type,
                thumbnail_path, thumbnail_url, optimized_path, optimized_url
         FROM task_attachments
         WHERE is_image = 1
           AND (thumbnail_url IS NULL OR thumbnail_url = ""
                OR optimized_url IS NULL OR optimized_url = "")
         ORDER BY id ASC'
    );
    $attachments = $statement->fetchAll();
    $summary['total_checked'] = count($attachments);

    if (!extension_loaded('gd') || !function_exists('imagecreatetruecolor')) {
        $message = 'PHP GD extension is not enabled. Enable extension=gd in php.ini.';
        $summary['message'] = $message;
        foreach ($attachments as $attachment) {
            $summary['failed']++;
            $summary['details'][] = attachmentDiagnostic(
                $attachment,
                'failed_with_reason',
                $message
            );
        }
        echo json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
        exit(1);
    }

    $uploadDirectory = realpath(taskAttachmentUploadDirectory());
    if ($uploadDirectory === false || !is_dir($uploadDirectory)) {
        throw new RuntimeException(
            'Upload directory was not found: ' . taskAttachmentUploadDirectory()
        );
    }

    foreach ($attachments as $attachment) {
        try {
        $sourcePath = null;
        [$sourcePath, $attemptedPaths] = resolveAttachmentSourcePath(
            $attachment,
            $uploadDirectory
        );
        if ($sourcePath === null) {
            $summary['skipped']++;
            $summary['skipped_missing_file']++;
            $summary['details'][] = attachmentDiagnostic(
                $attachment,
                'skipped_missing_file',
                'Original image file was not found. Checked: '
                    . ($attemptedPaths ? implode(', ', $attemptedPaths) : 'no usable stored path')
            );
            continue;
        }

        $detectedMimeType = (new finfo(FILEINFO_MIME_TYPE))->file($sourcePath);
        $mimeType = in_array(
            $detectedMimeType,
            ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            true
        ) ? $detectedMimeType : (string) ($attachment['mime_type'] ?? '');

        if ($mimeType === 'image/gif') {
            $summary['skipped']++;
            $summary['details'][] = attachmentDiagnostic(
                $attachment,
                'skipped_unsupported',
                'GIF optimization is skipped to preserve animation.',
                $sourcePath
            );
            continue;
        }

        $supportError = taskAttachmentImageSupportError($mimeType);
        if ($supportError !== null) {
            $summary['failed']++;
            $summary['details'][] = attachmentDiagnostic(
                $attachment,
                'failed_with_reason',
                $supportError,
                $sourcePath
            );
            continue;
        }

        $extension = strtolower(pathinfo($sourcePath, PATHINFO_EXTENSION));
        $allowedExtensions = [
            'image/jpeg' => ['jpg', 'jpeg'],
            'image/png' => ['png'],
            'image/webp' => ['webp'],
        ];
        if (!in_array($extension, $allowedExtensions[$mimeType] ?? [], true)) {
            $summary['failed']++;
            $summary['details'][] = attachmentDiagnostic(
                $attachment,
                'failed_with_reason',
                'File extension .' . ($extension ?: '(none)')
                    . ' does not match detected MIME type ' . ($mimeType ?: 'unknown') . '.',
                $sourcePath
            );
            continue;
        }

        $baseName = 'attachment-' . (int) $attachment['id'] . '-'
            . bin2hex(random_bytes(8));
        $derivatives = optimizeTaskAttachmentImage(
            $sourcePath,
            $uploadDirectory,
            $baseName,
            $mimeType,
            $extension
        );
        if (
            empty($derivatives['optimized_filename'])
            || empty($derivatives['thumbnail_filename'])
        ) {
            foreach (['optimized_physical_path', 'thumbnail_physical_path'] as $pathKey) {
                if (!empty($derivatives[$pathKey]) && is_file($derivatives[$pathKey])) {
                    @unlink($derivatives[$pathKey]);
                }
            }
            $reason = $derivatives['error']
                ?? $derivatives['thumbnail_error']
                ?? 'Image optimization did not create both required derivatives.';
            $tooLarge = !empty($derivatives['too_large']);
            if ($tooLarge) {
                $summary['skipped']++;
                $summary['skipped_too_large']++;
            } else {
                $summary['failed']++;
            }
            $summary['details'][] = attachmentDiagnostic(
                $attachment,
                $tooLarge ? 'skipped_too_large' : 'failed_with_reason',
                $reason,
                $sourcePath
            );
            continue;
        }

        $optimizedPath = 'uploads/task-attachments/' . $derivatives['optimized_filename'];
        $thumbnailPath = 'uploads/task-attachments/' . $derivatives['thumbnail_filename'];
        $optimizedUrl = regeneratedAttachmentUrl($attachment, $derivatives['optimized_filename']);
        $thumbnailUrl = regeneratedAttachmentUrl($attachment, $derivatives['thumbnail_filename']);

        try {
            $update = $pdo->prepare(
                'UPDATE task_attachments
                 SET optimized_path = ?, optimized_url = ?,
                     thumbnail_path = ?, thumbnail_url = ?, url = ?
                 WHERE id = ?'
            );
            $update->execute([
                $optimizedPath,
                $optimizedUrl,
                $thumbnailPath,
                $thumbnailUrl,
                $optimizedUrl,
                (int) $attachment['id'],
            ]);
            $summary['regenerated']++;
        } catch (Throwable $exception) {
            @unlink($derivatives['optimized_physical_path']);
            @unlink($derivatives['thumbnail_physical_path']);
            $summary['failed']++;
            $summary['details'][] = attachmentDiagnostic(
                $attachment,
                'failed_with_reason',
                'Database update failed: ' . $exception->getMessage(),
                $sourcePath
            );
        }
        } catch (Throwable $exception) {
            $summary['failed']++;
            $summary['details'][] = attachmentDiagnostic(
                $attachment,
                'failed_with_reason',
                'Unexpected processing error: ' . $exception->getMessage(),
                $sourcePath ?? null
            );
            continue;
        }
    }
} catch (Throwable $exception) {
    $summary['failed']++;
    $summary['message'] = $exception->getMessage();
    $summary['details'][] = [
        'status' => 'fatal_error',
        'reason' => $exception->getMessage(),
    ];
}

echo json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
