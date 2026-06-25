# Brahmanda Work OS PHP API

Simple PHP PDO and MySQL backend intended for cPanel, Apache, Nginx, or a small VPS.

## Local setup

### 1. Create and import the MySQL database

Import the schema:

```bash
mysql -u root -p < backend/sql/database.sql
```

Optionally import the Brahmanda demo clients and tasks:

```bash
mysql -u root -p brahmanda_work_os < backend/sql/seed.sql
```

The seed file is idempotent: running it again does not duplicate clients or tasks with the same names.

Demo administrator:

```text
Email: admin@brahmandatech.com
Password: change-me
```

Change this password before using the application outside local development.

### 2. Configure the PHP database connection

Set environment variables or update the local defaults in `config/database.php`.

Supported environment variables:

```text
DB_HOST=localhost
DB_PORT=3306
DB_NAME=brahmanda_work_os
DB_USER=root
DB_PASSWORD=
CORS_ORIGIN=http://localhost:5173
APP_ENV=production
```

### 3. Run the PHP backend

From the project root:

```bash
php -S localhost:8000 -t backend
```

Verify the connection:

```text
http://localhost:8000/api/clients.php
```

### 4. Create the React environment file

Create `.env` in the project root:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

Restart Vite whenever `.env` changes.

### 5. Run the React frontend

```bash
npm install
npm run dev
```

The frontend displays `Connected to API` when all initial requests succeed. If the PHP API is unavailable, it displays `API Error` and continues with locally cached demo data.

## cPanel or VPS setup

Point the web server document root at `backend/`, or upload the folder beneath an existing public root. Set `CORS_ORIGIN` to the deployed React application origin.

All request bodies use JSON. All responses have this shape:

```json
{
  "success": true,
  "message": "Optional message",
  "data": {}
}
```

## Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `api/clients.php` | List clients |
| GET | `api/clients.php?id=1` | Get one client with task totals |
| POST | `api/clients.php` | Add client |
| PUT | `api/clients.php?id=1` | Update client |
| DELETE | `api/clients.php?id=1` | Delete client and related records |
| GET | `api/tasks.php` | List tasks; optional `client_id`, `status`, `priority` filters |
| POST | `api/tasks.php` | Add task |
| PUT | `api/tasks.php?id=1` | Update task |
| PATCH | `api/tasks.php?id=1&action=complete` | Mark completed and create daily log |
| DELETE | `api/tasks.php?id=1` | Delete task |
| GET | `api/logs.php` | List daily logs; optional `client_id`, `date` filters |
| GET | `api/billing.php` | List billable tasks and totals |
| PATCH | `api/billing.php?id=1` | Update payment or invoice status by task id |
| GET | `api/reports.php?client_id=1&month=6&year=2026` | Generate monthly report data |
| POST | `api/reports.php` | Save or update a generated report |
| POST | `api/auth.php` | Verify email and password |

When a task becomes billable, its billing row is inserted or updated automatically. When a task is marked completed, its daily log is inserted once inside the same database transaction.
