<?php

declare(strict_types=1);

/*
 * Copy this file to database.php and set hosting values there, or supply
 * DB_HOST, DB_PORT, DB_NAME, DB_USER, and DB_PASSWORD as server environment
 * variables. Environment variables take precedence.
 */
$localDatabase = [
    'host' => 'localhost',
    'port' => '3306',
    'name' => 'brahmanda_work_os',
    'user' => 'replace_with_database_user',
    'password' => 'replace_with_strong_database_password',
];

final class Database
{
    private static $connection = null;

    public static function connect(): PDO
    {
        global $localDatabase;

        if (self::$connection instanceof PDO) {
            return self::$connection;
        }

        $host = getenv('DB_HOST') ?: $localDatabase['host'];
        $port = getenv('DB_PORT') ?: $localDatabase['port'];
        $name = getenv('DB_NAME') ?: $localDatabase['name'];
        $user = getenv('DB_USER') ?: $localDatabase['user'];
        $password = getenv('DB_PASSWORD') !== false
            ? getenv('DB_PASSWORD')
            : $localDatabase['password'];

        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            $host,
            $port,
            $name
        );

        self::$connection = new PDO($dsn, $user, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);

        return self::$connection;
    }
}
