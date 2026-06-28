<?php

declare(strict_types=1);

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/response.php';
require_once __DIR__ . '/../helpers/auth_guard.php';
require_once __DIR__ . '/../helpers/activity_logger.php';

bootstrapApi();

const TASK_ATTACHMENT_MAX_SIZE = 25 * 1024 * 1024;
const TASK_ATTACHMENT_COLUMNS = 'id, task_id, attachment_type, title, url, file_path, file_url,
    original_filename, mime_type, file_size, is_image, thumbnail_path, thumbnail_url,
    optimized_path, optimized_url, created_at';

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

function findAttachmentTask(PDO $pdo, int $taskId): array
{
    $statement = $pdo->prepare('SELECT id, client_id, title FROM tasks WHERE id = ?');
    $statement->execute([$taskId]);
    $task = $statement->fetch();
    if (!$task) {
        errorResponse('Task not found.', 404);
    }
    return $task;
}

try {
    $pdo = Database::connect();
    $currentUser = requireAuth($pdo);
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET' && ($_GET['action'] ?? '') === 'download') {
        $id = queryId();
        $statement = $pdo->prepare(
            'SELECT file_path, original_filename, mime_type
             FROM task_attachments
             WHERE id = ? AND attachment_type = "file"'
        );
        $statement->execute([$id]);
        $attachment = $statement->fetch();
        if (!$attachment || empty($attachment['file_path'])) {
            errorResponse('Attachment file not found.', 404);
        }

        $uploadDirectory = realpath(taskAttachmentUploadDirectory());
        $physicalPath = realpath(
            taskAttachmentUploadDirectory() . '/' . basename((string) $attachment['file_path'])
        );
        if (
            $uploadDirectory === false
            || $physicalPath === false
            || !str_starts_with($physicalPath, $uploadDirectory . DIRECTORY_SEPARATOR)
            || !is_file($physicalPath)
        ) {
            errorResponse('Attachment file not found.', 404);
        }

        $downloadName = preg_replace(
            '/[\r\n"]+/',
            '_',
            basename((string) ($attachment['original_filename'] ?: 'attachment'))
        );
        header_remove('Content-Type');
        header('Content-Type: ' . ($attachment['mime_type'] ?: 'application/octet-stream'));
        header('Content-Length: ' . filesize($physicalPath));
        header('Content-Disposition: attachment; filename="' . $downloadName . '"');
        header('X-Content-Type-Options: nosniff');
        readfile($physicalPath);
        exit;
    }

    if ($method === 'GET') {
        $taskId = filter_input(INPUT_GET, 'task_id', FILTER_VALIDATE_INT);
        $clientId = filter_input(INPUT_GET, 'client_id', FILTER_VALIDATE_INT);

        if ($taskId && $taskId > 0) {
            $statement = $pdo->prepare(
                'SELECT ' . TASK_ATTACHMENT_COLUMNS . '
                 FROM task_attachments
                 WHERE task_id = ?
                 ORDER BY created_at ASC, id ASC'
            );
            $statement->execute([$taskId]);
        } elseif ($clientId && $clientId > 0) {
            $statement = $pdo->prepare(
                'SELECT a.id, a.task_id, a.attachment_type, a.title, a.url, a.file_path,
                        a.file_url, a.original_filename, a.mime_type, a.file_size,
                        a.is_image, a.thumbnail_path, a.thumbnail_url,
                        a.optimized_path, a.optimized_url, a.created_at,
                        t.title AS task_title
                 FROM task_attachments a
                 INNER JOIN tasks t ON t.id = a.task_id
                 WHERE t.client_id = ?
                 ORDER BY t.title ASC, a.created_at ASC, a.id ASC'
            );
            $statement->execute([$clientId]);
        } else {
            errorResponse('A valid task_id or client_id query parameter is required.', 422);
        }

        jsonResponse($statement->fetchAll());
    }

    if ($method === 'POST' && isset($_FILES['file'])) {
        $taskId = filter_var($_POST['task_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$taskId || $taskId < 1) {
            errorResponse('A valid task_id is required.', 422);
        }
        $task = findAttachmentTask($pdo, $taskId);
        $file = $_FILES['file'];

        if (!isset($file['error']) || (int) $file['error'] !== UPLOAD_ERR_OK) {
            errorResponse('The attachment upload failed.', 422);
        }
        if ((int) $file['size'] < 1 || (int) $file['size'] > TASK_ATTACHMENT_MAX_SIZE) {
            errorResponse('Attachments must be 25MB or smaller.', 422);
        }
        if (!is_uploaded_file((string) $file['tmp_name'])) {
            errorResponse('The uploaded file is invalid.', 422);
        }

        $allowedMimeTypes = [
            'image/jpeg' => ['jpg', 'jpeg'],
            'image/png' => ['png'],
            'image/webp' => ['webp'],
            'image/gif' => ['gif'],
            'video/mp4' => ['mp4'],
            'video/quicktime' => ['mov'],
            'video/webm' => ['webm'],
            'application/pdf' => ['pdf'],
            'application/msword' => ['doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => ['docx'],
            'application/vnd.ms-excel' => ['xls', 'csv'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => ['xlsx'],
            'application/vnd.ms-powerpoint' => ['ppt'],
            'application/vnd.openxmlformats-officedocument.presentationml.presentation' => ['pptx'],
            'text/plain' => ['txt', 'csv'],
            'text/csv' => ['csv'],
            'application/csv' => ['csv'],
        ];
        $mimeType = (new finfo(FILEINFO_MIME_TYPE))->file((string) $file['tmp_name']);
        $originalFilename = trim(basename((string) $file['name']));
        $originalExtension = strtolower(pathinfo($originalFilename, PATHINFO_EXTENSION));

        if (!isset($allowedMimeTypes[$mimeType]) || !in_array($originalExtension, $allowedMimeTypes[$mimeType], true)) {
            errorResponse('This file type is not supported. Upload an image, video, PDF, or supported document.', 422);
        }

        $safeExtension = $originalExtension;
        $storedBaseName = bin2hex(random_bytes(20));
        $storedFilename = $storedBaseName . '.' . $safeExtension;
        $uploadDirectory = taskAttachmentUploadDirectory();
        if (!is_dir($uploadDirectory) && !mkdir($uploadDirectory, 0755, true) && !is_dir($uploadDirectory)) {
            throw new RuntimeException('The attachment upload directory could not be created.');
        }

        $destination = $uploadDirectory . '/' . $storedFilename;
        if (!move_uploaded_file((string) $file['tmp_name'], $destination)) {
            throw new RuntimeException('The attachment could not be stored.');
        }

        $isImage = str_starts_with($mimeType, 'image/') ? 1 : 0;
        $filePath = 'uploads/task-attachments/' . $storedFilename;
        $fileUrl = taskAttachmentPublicUrl($storedFilename);
        $thumbnailPath = null;
        $thumbnailUrl = null;
        $optimizedPath = null;
        $optimizedUrl = null;
        $generatedPhysicalPaths = [$destination];

        $canOptimize = $isImage === 1
            && $mimeType !== 'image/gif'
            && extension_loaded('gd');

        if ($canOptimize) {
            $optimizedFilename = $storedBaseName . '-optimized.' . $safeExtension;
            $optimizedDestination = $uploadDirectory . '/' . $optimizedFilename;
            $optimizedCreated = taskAttachmentCreateDerivative(
                $destination,
                $optimizedDestination,
                $mimeType,
                1600
            );

            if ($optimizedCreated) {
                $generatedPhysicalPaths[] = $optimizedDestination;
                $optimizedPath = 'uploads/task-attachments/' . $optimizedFilename;
                $optimizedUrl = taskAttachmentPublicUrl($optimizedFilename);

                $thumbnailFilename = $storedBaseName . '-thumbnail.' . $safeExtension;
                $thumbnailDestination = $uploadDirectory . '/' . $thumbnailFilename;
                if (taskAttachmentCreateDerivative(
                    $destination,
                    $thumbnailDestination,
                    $mimeType,
                    400
                )) {
                    $generatedPhysicalPaths[] = $thumbnailDestination;
                    $thumbnailPath = 'uploads/task-attachments/' . $thumbnailFilename;
                    $thumbnailUrl = taskAttachmentPublicUrl($thumbnailFilename);
                } elseif (is_file($thumbnailDestination)) {
                    @unlink($thumbnailDestination);
                }
            } elseif (is_file($optimizedDestination)) {
                @unlink($optimizedDestination);
            }
        }

        $title = trim((string) ($_POST['title'] ?? '')) ?: $originalFilename;

        try {
            $statement = $pdo->prepare(
                'INSERT INTO task_attachments
                    (task_id, attachment_type, title, url, file_path, file_url,
                     original_filename, mime_type, file_size, is_image,
                     thumbnail_path, thumbnail_url, optimized_path, optimized_url)
                 VALUES
                    (:task_id, :attachment_type, :title, :url, :file_path, :file_url,
                     :original_filename, :mime_type, :file_size, :is_image,
                     :thumbnail_path, :thumbnail_url, :optimized_path, :optimized_url)'
            );
            $statement->execute([
                ':task_id' => $taskId,
                ':attachment_type' => 'file',
                ':title' => $title,
                ':url' => $optimizedUrl ?: $fileUrl,
                ':file_path' => $filePath,
                ':file_url' => $fileUrl,
                ':original_filename' => $originalFilename,
                ':mime_type' => $mimeType,
                ':file_size' => (int) $file['size'],
                ':is_image' => $isImage,
                ':thumbnail_path' => $thumbnailPath,
                ':thumbnail_url' => $thumbnailUrl,
                ':optimized_path' => $optimizedPath,
                ':optimized_url' => $optimizedUrl,
            ]);
        } catch (Throwable $exception) {
            foreach ($generatedPhysicalPaths as $generatedPhysicalPath) {
                if (is_file($generatedPhysicalPath)) {
                    @unlink($generatedPhysicalPath);
                }
            }
            throw $exception;
        }

        $id = (int) $pdo->lastInsertId();
        logActivity($pdo, $currentUser, [
            'action_type' => 'added',
            'module' => 'attachments',
            'item_id' => $id,
            'item_title' => $originalFilename,
            'client_id' => $task['client_id'],
            'description' => 'Attachment uploaded to ' . $task['title'] . '.',
            'new_value' => [
                'task_id' => $taskId,
                'filename' => $originalFilename,
                'mime_type' => $mimeType,
                'file_size' => (int) $file['size'],
            ],
        ]);

        $resultStatement = $pdo->prepare(
            'SELECT ' . TASK_ATTACHMENT_COLUMNS . ' FROM task_attachments WHERE id = ?'
        );
        $resultStatement->execute([$id]);
        jsonResponse($resultStatement->fetch(), 201, 'Attachment uploaded.');
    }

    if ($method === 'POST') {
        $data = requestBody();
        requireFields($data, ['task_id', 'title', 'url']);

        if (!filter_var($data['url'], FILTER_VALIDATE_URL)) {
            errorResponse('Attachment URL must be valid.', 422);
        }

        $task = findAttachmentTask($pdo, (int) $data['task_id']);
        $statement = $pdo->prepare(
            'INSERT INTO task_attachments (task_id, attachment_type, title, url)
             VALUES (:task_id, :attachment_type, :title, :url)'
        );
        $statement->execute([
            ':task_id' => (int) $data['task_id'],
            ':attachment_type' => trim((string) ($data['attachment_type'] ?? 'link')) ?: 'link',
            ':title' => trim((string) $data['title']),
            ':url' => trim((string) $data['url']),
        ]);

        $id = (int) $pdo->lastInsertId();
        logActivity($pdo, $currentUser, [
            'action_type' => 'added',
            'module' => 'proofs',
            'item_id' => $id,
            'item_title' => trim((string) $data['title']),
            'client_id' => $task['client_id'],
            'description' => 'Proof link added to ' . $task['title'] . '.',
            'new_value' => ['task_id' => $task['id'], 'title' => $data['title'], 'url' => $data['url']],
        ]);
        jsonResponse(['id' => $id], 201, 'Attachment added.');
    }

    if ($method === 'DELETE') {
        $id = queryId();
        $currentStatement = $pdo->prepare(
            'SELECT a.*, t.client_id, t.title AS task_title
             FROM task_attachments a INNER JOIN tasks t ON t.id = a.task_id WHERE a.id = ?'
        );
        $currentStatement->execute([$id]);
        $current = $currentStatement->fetch();
        if (!$current) {
            errorResponse('Attachment not found.', 404);
        }

        $statement = $pdo->prepare('DELETE FROM task_attachments WHERE id = ?');
        $statement->execute([$id]);
        if ($statement->rowCount() === 0) {
            errorResponse('Attachment not found.', 404);
        }

        $storedPaths = array_unique(array_filter([
            $current['file_path'] ?? null,
            $current['optimized_path'] ?? null,
            $current['thumbnail_path'] ?? null,
        ]));
        foreach ($storedPaths as $storedPath) {
            $physicalPath = taskAttachmentUploadDirectory() . '/' . basename((string) $storedPath);
            if (is_file($physicalPath)) {
                @unlink($physicalPath);
            }
        }

        $isFile = ($current['attachment_type'] ?? 'link') === 'file';
        logActivity($pdo, $currentUser, [
            'action_type' => 'deleted',
            'module' => $isFile ? 'attachments' : 'proofs',
            'item_id' => $id,
            'item_title' => $current['original_filename'] ?: ($current['title'] ?? 'Attachment'),
            'client_id' => $current['client_id'] ?? null,
            'description' => ($isFile ? 'Attachment deleted from ' : 'Proof link deleted from ')
                . ($current['task_title'] ?? 'task') . '.',
            'old_value' => $current,
        ]);

        jsonResponse(['id' => $id], 200, 'Attachment deleted.');
    }

    errorResponse('Method not allowed.', 405);
} catch (Throwable $exception) {
    handleException($exception);
}
