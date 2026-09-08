import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import paramiko
import time

HOST = "192.168.90.144"
USER = "dlugo"
PASS = "VOv8q86@F5dA"
TARGET_DIR = "/var/opt/sistema"
OLD_DIR = "/var/opt/sistem-admin-wifi-solution"

DB_USER = "sistema_user"
DB_PASS = "sistema_pass_2026"
DB_NAME = "sistema_db"

def get_ssh():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=30)
    return ssh

def run(ssh, cmd, sudo=False):
    print(f"\n=======================================================")
    print(f"[EXEC {'SUDO' if sudo else 'USER'}] {cmd}")
    print(f"=======================================================")
    if sudo:
        stdin, stdout, stderr = ssh.exec_command(f"sudo -S bash -c \"{cmd}\"", get_pty=False)
        stdin.write(f"{PASS}\n")
        stdin.flush()
    else:
        stdin, stdout, stderr = ssh.exec_command(f"bash -c \"{cmd}\"", get_pty=False)
    
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    print(out)
    if err and "password for" not in err:
        print("[STDERR]", err)
    
    status = stdout.channel.recv_exit_status()
    print(f"[STATUS] {status}")
    return status, out

def main():
    ssh = get_ssh()
    
    # 1. Stop all pm2 processes
    print("\n--- Step 1: Stopping all PM2 processes ---")
    run(ssh, "pm2 delete all || true")
    
    # 2. Prepare /var/opt/sistema directory and permissions
    print("\n--- Step 2: Creating /var/opt/sistema and setting permissions ---")
    run(ssh, f"mkdir -p {TARGET_DIR}", sudo=True)
    run(ssh, f"chown -R {USER}:{USER} /var/opt", sudo=True)
    
    # Copy project files if not already in /var/opt/sistema
    run(ssh, f"""
if [ -d "{OLD_DIR}" ]; then
    cp -ru {OLD_DIR}/* {TARGET_DIR}/ 2>/dev/null || true
    cp -ru {OLD_DIR}/.[!.]* {TARGET_DIR}/ 2>/dev/null || true
fi
""")
    
    # 3. Install required system dependencies (libvips, postgresql, node/npm, build tools)
    print("\n--- Step 3: Installing system packages (PostgreSQL, libvips-dev, build tools) ---")
    run(ssh, "DEBIAN_FRONTEND=noninteractive apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-contrib libvips-dev build-essential python3 curl ca-certificates git libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2t64 libpango-1.0-0 libpangocairo-1.0-0", sudo=True)
    run(ssh, "systemctl enable postgresql && systemctl start postgresql", sudo=True)
    
    # 4. Configure PostgreSQL database and user via SQL file
    print("\n--- Step 4: Creating database and user in PostgreSQL ---")
    sql_script = f"""DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '{DB_USER}') THEN
      CREATE ROLE {DB_USER} WITH LOGIN PASSWORD '{DB_PASS}' SUPERUSER CREATEDB;
   ELSE
      ALTER ROLE {DB_USER} WITH PASSWORD '{DB_PASS}' SUPERUSER CREATEDB;
   END IF;
END
$$;
SELECT 'CREATE DATABASE {DB_NAME} OWNER {DB_USER}' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '{DB_NAME}')\\gexec
GRANT ALL PRIVILEGES ON DATABASE {DB_NAME} TO {DB_USER};
"""
    sftp = ssh.open_sftp()
    with sftp.file("/tmp/setup_db.sql", "w") as f:
        f.write(sql_script)
    sftp.close()
    
    run(ssh, "sudo -u postgres psql -f /tmp/setup_db.sql", sudo=True)
    run(ssh, f"PGPASSWORD='{DB_PASS}' psql -h localhost -U {DB_USER} -d {DB_NAME} -c '\\conninfo'")
    
    # 5. Write .env in /var/opt/sistema
    print("\n--- Step 5: Generating .env configuration ---")
    env_content = f"""# ===========================================
# OpenWA - Environment Configuration (Production)
# ===========================================
PORT=2785
NODE_ENV=production

# Database (PostgreSQL)
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME={DB_USER}
DATABASE_PASSWORD={DB_PASS}
DATABASE_NAME={DB_NAME}
DATABASE_SYNCHRONIZE=true
DATABASE_LOGGING=false

# WhatsApp Engine
ENGINE_TYPE=whatsapp-web.js
SESSION_DATA_PATH=./data/sessions
PUPPETEER_HEADLESS=true
PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage

# Webhook
WEBHOOK_TIMEOUT=10000
WEBHOOK_RETRY_DELAY=5000

# Storage
STORAGE_TYPE=local
STORAGE_LOCAL_PATH=./data/media

# Services
REDIS_ENABLED=false
QUEUE_ENABLED=false
CACHE_ENABLED=false

# API Security
API_MASTER_KEY=owa_k1_c781d47782561dbaf74bb17918e42fe39ff0f57264cab2afe3e3a43ff751da04
ALLOW_DEV_API_KEY=true

# Dashboard & Swagger
SERVE_DASHBOARD=true
ENABLE_SWAGGER=true
"""
    sftp = ssh.open_sftp()
    with sftp.file(f"{TARGET_DIR}/.env", "w") as f:
        f.write(env_content)
    sftp.close()
    run(ssh, f"rm -f {TARGET_DIR}/data/.env.generated")
    print(f".env written to {TARGET_DIR}/.env successfully.")
    
    # 6. Build sharp from source for this CPU architecture
    print("\n--- Step 6: Building sharp from source for host CPU architecture ---")
    run(ssh, f"cd {TARGET_DIR} && rm -rf node_modules/sharp && npm install --build-from-source sharp")
    run(ssh, f"cd {TARGET_DIR} && node -e \"console.log('SHARP LOAD TEST:', require('sharp').versions)\"")
    
    # 7. Build dashboard and backend
    print("\n--- Step 7: Compiling dashboard & backend ---")
    run(ssh, f"cd {TARGET_DIR} && npm run build:all")
    
    # 8. Start with PM2 under the name 'sistema'
    print("\n--- Step 8: Starting PM2 process 'sistema' ---")
    run(ssh, f"cd {TARGET_DIR} && pm2 start dist/main.js --name 'sistema' --time")
    run(ssh, "pm2 save")
    run(ssh, f"sudo env PATH=$PATH:/usr/bin /usr/bin/pm2 startup systemd -u {USER} --hp /home/{USER} || true", sudo=True)
    
    # 9. Verify deployment
    print("\n--- Step 9: Verifying deployment status ---")
    time.sleep(6)
    run(ssh, "pm2 status")
    run(ssh, "pm2 logs sistema --lines 30 --nostream")
    run(ssh, "curl -s http://localhost:2785/api/health || true")
    run(ssh, "curl -I http://localhost:2785/ || true")
    
    ssh.close()
    print("\n>>> DEPLOYMENT COMPLETED SUCCESSFULLY! <<<")

if __name__ == '__main__':
    main()
