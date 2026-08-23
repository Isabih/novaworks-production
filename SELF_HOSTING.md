# NOVAWORKS — MySQL self-hosting

NOVAWORKS is a TanStack Start / React application using MySQL 8 for business data and authentication, Cloudflare R2 for media, Resend for email, an external SMS Hub for SMS delivery, NIDA/HIE for authorized citizen verification, and an OpenAI-compatible AI provider for NOVA.

## Ubuntu install

From the project directory:

```bash
sudo bash scripts/install-novaworks.sh
```

The installer installs Node.js 22, MySQL Server, Nginx, application dependencies, the MySQL schema, an initial IT user, a systemd service and an Nginx reverse proxy.

## Environment

Copy `.env.mysql.example` to `.env.production` and set real credentials for:

- MySQL
- NIDA/HIE citizen verification
- SMS Hub
- Resend
- Cloudflare R2
- NOVA AI provider
- Flutterwave if payments are enabled

Secrets must remain server-side. Do not expose NIDA, SMS, R2 secret, Resend or AI keys in browser environment variables.

## Services

```bash
sudo systemctl status mysql
sudo systemctl status nginx
sudo systemctl status novaworks
sudo journalctl -u novaworks -f
```

After editing `.env.production`:

```bash
sudo systemctl restart novaworks
```

## Initial IT account

The installer prints the initial IT email and a generated strong temporary password. The user is required to change a temporary password after login. You can override the generated values before running the installer:

```bash
sudo IT_EMAIL=it@novaworks.rw IT_NAME='NOVAWORKS IT' IT_PASSWORD='Strong!Password9' bash scripts/install-novaworks.sh
```

## Production checklist

- Configure TLS/HTTPS for Nginx or place the service behind Cloudflare.
- Fill all required `.env.production` values.
- Test MySQL, SMS, email, NIDA and R2 in IT → System Health.
- Create regular encrypted MySQL backups and test restoration.
- Keep API secrets out of source control.
- Review IT feature toggles before opening the site to users.
