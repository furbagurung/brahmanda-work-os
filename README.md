# Brahmanda Work OS

Brahmanda Work OS is a React/Vite agency workspace backed by a PHP REST API and MySQL. It includes clients, tasks, reports, billing, proof links, reminders, calendar, recurring tasks, activity history, users, and report branding.

## Requirements

- Node.js 18+
- npm
- PHP 8.1+ with PDO MySQL
- MySQL 5.7+ or MariaDB 10.4+

## Local setup

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Configure the database

Create the current schema:

```bash
mysql -u root -p < backend/sql/database.sql
```

Optional demo data:

```bash
mysql -u root -p brahmanda_work_os < backend/sql/seed.sql
```

The demo administrator password must be changed before any public deployment. For existing databases, follow [MIGRATION_ORDER.md](backend/sql/MIGRATION_ORDER.md).

### 3. Configure PHP

The existing local `backend/config/database.php` reads:

```text
DB_HOST
DB_PORT
DB_NAME
DB_USER
DB_PASSWORD
```

For a fresh checkout, copy:

```text
backend/config/database.example.php -> backend/config/database.php
backend/config/app.example.php      -> backend/config/app.php
```

Local application settings:

```php
return [
    'app_name' => 'Brahmanda Work OS',
    'app_env' => 'development',
    'cors_origin' => 'http://localhost:5173',
    'timezone' => 'Asia/Kathmandu',
];
```

### 4. Run the PHP API

From the repository root:

```bash
php -S localhost:8000 -t backend
```

Health check:

```text
http://localhost:8000/api/health.php
```

### 5. Configure and run Vite

Copy `.env.example` to `.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

Then run:

```bash
npm run dev
```

## Production build

Set the production API URL before building:

```env
VITE_API_BASE_URL=https://yourdomain.com/api
```

```bash
npm install
npm run build
```

Deploy the contents of `dist/`. See [DEPLOYMENT.md](DEPLOYMENT.md) for cPanel and VPS instructions.

## Database files

- `database.sql`: complete schema for fresh installations
- `seed.sql`: optional demonstration data
- `MIGRATION_ORDER.md`: ordered legacy upgrade checklist

Do not run all `add_*` migrations after importing the current `database.sql`; those changes are already included.

## Security

The following local files are ignored and must never be committed:

- `.env` and environment-specific variants
- `backend/config/database.php`
- `backend/config/app.php`
- private keys, credentials, secrets, and logs

Bearer tokens are stored hashed in MySQL. Production must use HTTPS, a non-demo administrator password, restricted CORS, and a dedicated least-privilege database user.

## Useful commands

```bash
npm run dev
npm run lint
npm run build
php -l backend/api/health.php
```

## Stabilization checks

Before merging application changes, run the lint, build, and PHP syntax checks
above. With the local PHP server and database running, open:

```text
http://localhost:8000/api/health.php
```

The response should report `status: ok` and `database: connected`. If a
feature reports a missing table or column, compare the local database against
`backend/sql/MIGRATION_ORDER.md` before debugging the frontend.

## Deployment verification

Use [DEPLOYMENT_TEST_CHECKLIST.md](DEPLOYMENT_TEST_CHECKLIST.md) after deployment. At minimum verify:

- Login
- Clients
- Tasks
- Reports
- Settings
- Activity logs

## Troubleshooting

- **401:** confirm bearer headers reach PHP, token expiry, account status, and server time.
- **CORS:** match `CORS_ORIGIN` exactly to the frontend origin.
- **Database error:** verify credentials, PDO MySQL, database name prefixes, and grants.
- **Missing migration:** inspect [MIGRATION_ORDER.md](backend/sql/MIGRATION_ORDER.md).
- **Wrong API URL:** Vite environment values are embedded during `npm run build`; correct `.env` and rebuild.
- **Fallback mode:** open browser developer tools and call `/api/health.php` directly.

API-specific documentation remains in [backend/README.md](backend/README.md).
