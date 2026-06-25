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

For an existing database created before proof attachments were added, run:

```bash
mysql -u root -p brahmanda_work_os < backend/sql/add_task_attachments.sql
```

For an existing database created before task reminders were added, run:

```bash
mysql -u root -p brahmanda_work_os < backend/sql/add_task_reminders.sql
```

For an existing database created before recurring tasks were added, run:

```bash
mysql -u root -p brahmanda_work_os < backend/sql/add_recurring_tasks.sql
```

For an existing database created before activity history was added, run:

```bash
mysql -u root -p brahmanda_work_os < backend/sql/add_activity_logs.sql
```

For an existing database created before token authentication was added, run:

```bash
mysql -u root -p brahmanda_work_os < backend/sql/add_api_tokens.sql
```

For an existing database created before team account status was added, run:

```bash
mysql -u root -p brahmanda_work_os < backend/sql/add_user_status.sql
```

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

## Authentication

`POST api/auth.php` accepts:

```json
{
  "email": "admin@brahmandatech.com",
  "password": "change-me"
}
```

Successful login returns an opaque bearer token that expires after seven days. The database stores only a SHA-256 hash of the token.

Send the token to every private endpoint:

```text
Authorization: Bearer <token>
```

Private endpoints return HTTP `401` when the token is missing, invalid, expired, or logged out.

Invalidate the active token:

```text
POST api/auth.php?action=logout
Authorization: Bearer <token>
```

Quick test:

```bash
curl -X POST http://localhost:8000/api/auth.php \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@brahmandatech.com\",\"password\":\"change-me\"}"

curl http://localhost:8000/api/clients.php \
  -H "Authorization: Bearer <token>"
```

The React frontend stores the token in localStorage for now. For higher-security deployments, move authentication to secure, HTTP-only cookies.

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
| POST | `api/tasks.php?action=generate_recurring` | Generate normal tasks from recurring templates due today or earlier |
| GET | `api/activity_logs.php` | List activity logs; optional `user_id`, `client_id`, `module`, `action_type`, `date_from`, `date_to` filters |
| DELETE | `api/tasks.php?id=1` | Delete task |
| GET | `api/attachments.php?task_id=1` | List proof links for a task |
| GET | `api/attachments.php?client_id=1` | List all proof links for a client, grouped by task data |
| POST | `api/attachments.php` | Add a proof link |
| DELETE | `api/attachments.php?id=1` | Delete a proof link |
| GET | `api/logs.php` | List daily logs; optional `client_id`, `date` filters |
| GET | `api/billing.php` | List billable tasks and totals |
| PATCH | `api/billing.php?id=1` | Update payment or invoice status by task id |
| GET | `api/reports.php?client_id=1&month=6&year=2026` | Generate monthly report data |
| GET | `api/reports.php?client_id=1` | List saved reports for a client |
| GET | `api/reports.php` | List saved reports across all clients |
| POST | `api/reports.php` | Save or update a generated report |
| POST | `api/auth.php` | Verify email and password |
| POST | `api/auth.php?action=logout` | Invalidate the active bearer token |
| GET | `api/users.php` | Admin: list users; manager/member: own profile |
| POST | `api/users.php` | Admin: create a user |
| PUT | `api/users.php?id=1` | Admin: update name, email, role, and status |
| PATCH | `api/users.php?id=1&action=password` | Admin: change a password |
| DELETE | `api/users.php?id=1` | Admin: deactivate a user and revoke their token |

When a task becomes billable, its billing row is inserted or updated automatically. When a task is marked completed, its daily log is inserted once inside the same database transaction.
