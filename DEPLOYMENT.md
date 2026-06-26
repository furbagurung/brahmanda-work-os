# Production deployment

This guide deploys the Vite frontend at `https://yourdomain.com/` and the PHP API at `https://yourdomain.com/api`.

## Requirements

- PHP 8.1+ with PDO MySQL, JSON, OpenSSL, and mbstring
- MySQL 5.7+/MariaDB 10.4+
- Apache with `mod_rewrite` or Nginx
- HTTPS certificate
- Node.js 18+ only for building the frontend

## Build the frontend

Create a local `.env` from `.env.example` and set:

```env
VITE_API_BASE_URL=https://yourdomain.com/api
```

Vite embeds this value at build time. Rebuild after changing it:

```bash
npm install
npm run build
```

Upload the contents of `dist/`, not the `dist` directory itself, to the web document root. The generated `.htaccess` supports frontend fallback routing and forwards bearer authorization headers.

## cPanel deployment

### 1. Create MySQL resources

In cPanel MySQL Databases:

1. Create a database.
2. Create a database user with a strong unique password.
3. Assign the user to the database with required privileges.
4. Note the cPanel-prefixed database and user names.

For a fresh install, import `backend/sql/database.sql` in phpMyAdmin. Import `seed.sql` only if demo data is required. See [migration order](backend/sql/MIGRATION_ORDER.md).

### 2. Upload the API

Create this layout under `public_html`:

```text
public_html/
  api/          # contents of backend/api/
  config/       # database.php and optional app.php
  helpers/      # contents of backend/helpers/
  assets/       # generated frontend assets
  index.html
  .htaccess
```

Do not upload `backend/sql/` into the public directory. If the host permits directories above `public_html`, store private configuration there and adjust the PHP `require_once` paths accordingly.

Copy:

```text
backend/config/database.example.php -> public_html/config/database.php
backend/config/app.example.php      -> public_html/config/app.php
```

Edit the copies with production database values and the exact frontend origin. Do not add a trailing slash to `cors_origin`.

### 3. Upload the frontend

Build with the production `VITE_API_BASE_URL`, then upload all contents of `dist/` to `public_html/`. Confirm that `.htaccess` was uploaded; cPanel file managers often hide dotfiles.

### 4. Permissions

- Directories: `755`
- Public PHP/static files: `644`
- Private config files: `640` where supported, otherwise `644` with web access denied
- Never use `777`

Verify `https://yourdomain.com/api/health.php`, then follow the deployment test checklist.

## VPS deployment

### Apache

1. Install Apache, PHP-FPM or mod_php, PDO MySQL, MySQL/MariaDB, and Certbot.
2. Use a dedicated application directory and database user.
3. Set the virtual-host `DocumentRoot` to the directory containing the frontend build, `api`, `config`, and `helpers`.
4. Enable rewrite and headers:

```bash
sudo a2enmod rewrite headers
sudo systemctl reload apache2
```

5. Allow `.htaccess` for the document root or move its rules into the virtual host.
6. Obtain TLS with Certbot and redirect HTTP to HTTPS.

### Nginx

Use the frontend build as `root`, pass `/api/*.php` to PHP-FPM, deny private paths, preserve the Authorization header, and use SPA fallback:

```nginx
location ~ ^/(config|helpers|sql)/ { deny all; }

location / {
    try_files $uri $uri/ /index.html;
}

location ~ ^/api/.*\.php$ {
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    fastcgi_param HTTP_AUTHORIZATION $http_authorization;
    fastcgi_pass unix:/run/php/php8.2-fpm.sock;
}
```

Adjust the PHP-FPM socket for the installed version. Reload Nginx and PHP-FPM after validation.

### Environment configuration

Prefer server environment variables:

```text
APP_NAME=Brahmanda Work OS
APP_ENV=production
TIMEZONE=Asia/Kathmandu
CORS_ORIGIN=https://yourdomain.com
DB_HOST=localhost
DB_PORT=3306
DB_NAME=brahmanda_work_os
DB_USER=brahmanda_app
DB_PASSWORD=strong-secret
```

When environment variables are unavailable, use ignored `config/database.php` and `config/app.php` files copied from the examples.

## Updating production

1. Back up files and database.
2. Put the application behind a maintenance page if schema changes are required.
3. Apply only new migrations.
4. Build the frontend with the production API URL.
5. Upload frontend and backend changes.
6. Clear hosting/PHP opcode caches if enabled.
7. Run the health check and deployment checklist.

## CORS

Use the exact browser origin, including scheme and non-standard port:

```text
CORS_ORIGIN=https://yourdomain.com
```

Do not use `*` in production. If frontend and API share the same origin, use that same origin.

## Troubleshooting

- **401 Authentication required:** verify the `Authorization: Bearer` header reaches PHP, the token is unexpired, the user is active, and server time is correct.
- **CORS blocked:** confirm `CORS_ORIGIN` exactly matches the frontend origin and that OPTIONS requests reach PHP.
- **Database disconnected:** verify database host, cPanel prefixes, credentials, PDO MySQL, and user privileges.
- **Missing table/column:** compare the database with `MIGRATION_ORDER.md`; do not blindly rerun all migrations.
- **Blank page or API fallback mode:** inspect browser developer tools and confirm the build-time `VITE_API_BASE_URL`.
- **404 after refresh:** install the generated `.htaccess` or Nginx `try_files` rule.
- **500 API response:** check the PHP error log; temporarily use `APP_ENV=development` only on a protected staging environment.
