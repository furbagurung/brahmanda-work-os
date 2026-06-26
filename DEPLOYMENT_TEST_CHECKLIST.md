# Deployment test checklist

Run these checks after every production deployment.

## Infrastructure

- [ ] HTTPS is valid and HTTP redirects to HTTPS.
- [ ] `GET /api/health.php` returns `status: ok` and `database: connected`.
- [ ] `/config`, `/helpers`, and `/sql` are not publicly readable.
- [ ] The frontend calls the intended production API URL.
- [ ] Browser requests have no CORS errors.

## Application

- [ ] Login works with a non-demo administrator password.
- [ ] Logout invalidates the bearer token.
- [ ] Clients load and a client detail page opens.
- [ ] Tasks load and task create/update works.
- [ ] Proof links can be added and opened.
- [ ] Reports generate and download with saved branding.
- [ ] Settings load; an admin can save; a member/manager cannot update.
- [ ] Activity logs record the test actions.
- [ ] Calendar, reminders, and recurring tasks load.
- [ ] Billing payment/invoice updates persist.

## Final security check

- [ ] `.env`, `database.php`, `app.php`, SQL dumps, logs, and private keys are not in the deployment archive or Git history.
- [ ] Demo seed credentials are disabled or changed.
- [ ] Database user permissions are limited to this application database.
- [ ] `APP_ENV` is `production`.
- [ ] CORS allows only the deployed frontend origin.
