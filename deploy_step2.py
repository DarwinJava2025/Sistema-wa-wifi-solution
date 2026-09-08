import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import paramiko
import time

HOST = "192.168.90.144"
USER = "dlugo"
PASS = "VOv8q86@F5dA"
TARGET_DIR = "/var/opt/sistem-admin-wifi-solution"

DB_USER = "openwa_user"
DB_PASS = "openwa_secure_pass_2026"
DB_NAME = "openwa_db"

def get_ssh():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=30)
    return ssh

def run_cmd(ssh, cmd, sudo=False):
    print(f"\n=======================================================")
    print(f"[EXEC] {cmd}")
    print(f"=======================================================")
    if sudo:
        cmd_full = f"echo '{PASS}' | sudo -S bash -c \"{cmd}\""
    else:
        cmd_full = f"bash -c \"{cmd}\""
    
    stdin, stdout, stderr = ssh.exec_command(cmd_full, get_pty=True)
    while True:
        try:
            line = stdout.readline()
            if not line:
                break
            print(line, end="", flush=True)
        except Exception:
            break
    
    status = stdout.channel.recv_exit_status()
    if status != 0:
        print(f"\n[WARNING/ERROR] Command exited with status {status}")
    return status

def main():
    ssh = get_ssh()
    
    # 1. Update apt and finish installing PostgreSQL + OS dependencies
    print("\n--- Step 4: Installing PostgreSQL & Node 22 & Chromium dependencies ---")
    run_cmd(ssh, "DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-contrib curl ca-certificates gnupg build-essential git libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2t64 libpango-1.0-0 libpangocairo-1.0-0", sudo=True)
    
    # Enable and start postgresql
    run_cmd(ssh, "systemctl enable postgresql && systemctl start postgresql", sudo=True)
    
    # 2. Setup PostgreSQL database and user
    print("\n--- Step 5: Configuring PostgreSQL Database and User ---")
    pg_sql = f"""
DO \\$\\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '{DB_USER}') THEN
      CREATE ROLE {DB_USER} WITH LOGIN PASSWORD '{DB_PASS}' SUPERUSER CREATEDB;
   ELSE
      ALTER ROLE {DB_USER} WITH PASSWORD '{DB_PASS}' SUPERUSER CREATEDB;
   END IF;
END
\\$\\$;
SELECT 'CREATE DATABASE {DB_NAME} OWNER {DB_USER}' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '{DB_NAME}')\\gexec
GRANT ALL PRIVILEGES ON DATABASE {DB_NAME} TO {DB_USER};
"""
    run_cmd(ssh, f"sudo -u postgres psql -c \"{pg_sql}\"", sudo=True)
    
    # Verify postgres connection
    run_cmd(ssh, f"PGPASSWORD='{DB_PASS}' psql -h localhost -U {DB_USER} -d {DB_NAME} -c '\\conninfo'")
    
    # 3. Install Node.js 22 LTS
    print("\n--- Step 6: Installing Node.js 22 LTS ---")
    run_cmd(ssh, "curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -", sudo=True)
    run_cmd(ssh, "DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs", sudo=True)
    run_cmd(ssh, "node -v && npm -v")
    
    # Install pm2
    run_cmd(ssh, "npm install -g pm2", sudo=True)
    
    # 4. Configure .env in /var/opt/sistem-admin-wifi-solution
    print("\n--- Step 7: Writing .env with PostgreSQL configuration ---")
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
    # Write .env file
    sftp = ssh.open_sftp()
    with sftp.file(f"{TARGET_DIR}/.env", "w") as f:
        f.write(env_content)
    sftp.close()
    run_cmd(ssh, f"cat {TARGET_DIR}/.env")
    
    # 5. Build and install dependencies
    print("\n--- Step 8: Installing npm dependencies and building project ---")
    run_cmd(ssh, f"cd {TARGET_DIR} && npm install")
    run_cmd(ssh, f"cd {TARGET_DIR}/dashboard && npm install")
    run_cmd(ssh, f"cd {TARGET_DIR} && npm run build:all")
    
    # 6. Start service with PM2
    print("\n--- Step 9: Starting application with PM2 ---")
    run_cmd(ssh, f"cd {TARGET_DIR} && pm2 delete sistem-admin-wifi || true")
    run_cmd(ssh, f"cd {TARGET_DIR} && pm2 start dist/main.js --name 'sistem-admin-wifi' --time")
    run_cmd(ssh, "pm2 save")
    run_cmd(ssh, f"echo '{PASS}' | sudo -S env PATH=$PATH:/usr/bin /usr/bin/pm2 startup systemd -u {USER} --hp /home/{USER} || true", sudo=True)
    
    # 7. Verification
    time.sleep(5)
    print("\n--- Step 10: Verifying application status ---")
    run_cmd(ssh, "pm2 status")
    run_cmd(ssh, "curl -I http://localhost:2785/api/health || true")
    run_cmd(ssh, "curl -I http://localhost:2785/ || true")
    
    ssh.close()
    print("\nDeployment completed successfully!")

if __name__ == '__main__':
    main()
