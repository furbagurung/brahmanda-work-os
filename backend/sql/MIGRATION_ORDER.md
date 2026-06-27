# Database migration order

Back up the database before every schema change. Run migrations against a staging copy first.

## Fresh installation

`database.sql` is the current complete schema. For a new empty database:

1. Import `database.sql`.
2. Optionally import `seed.sql`.
3. Do **not** run the `add_*` migrations afterward; their columns and tables are already included in the current schema.
4. If seed data was imported, immediately replace the demo administrator password.

```bash
mysql -u DB_USER -p < backend/sql/database.sql
mysql -u DB_USER -p brahmanda_work_os < backend/sql/seed.sql
```

## Existing or legacy database upgrade

Apply only migrations that have not already been applied. The historical order is:

1. `database.sql` — original/current baseline; do not re-import over an existing database.
2. `seed.sql` — optional demo data; not a schema migration.
3. `add_task_attachments.sql`
4. `add_api_tokens.sql`
5. `add_user_status.sql`
6. `add_task_reminders.sql`
7. `add_recurring_tasks.sql`
8. `add_activity_logs.sql`
9. `add_settings.sql`
10. `add_task_assignment.sql`
11. `add_client_portal_shares.sql`
12. `add_notifications.sql`

Example:

```bash
mysql -u DB_USER -p DB_NAME < backend/sql/add_task_attachments.sql
mysql -u DB_USER -p DB_NAME < backend/sql/add_api_tokens.sql
mysql -u DB_USER -p DB_NAME < backend/sql/add_user_status.sql
mysql -u DB_USER -p DB_NAME < backend/sql/add_task_reminders.sql
mysql -u DB_USER -p DB_NAME < backend/sql/add_recurring_tasks.sql
mysql -u DB_USER -p DB_NAME < backend/sql/add_activity_logs.sql
mysql -u DB_USER -p DB_NAME < backend/sql/add_settings.sql
```

Use `SHOW COLUMNS FROM tasks`, `SHOW COLUMNS FROM users`, and `SHOW TABLES` to determine what is already installed. An `add_*` migration may fail with a duplicate-column error if it is run twice.
