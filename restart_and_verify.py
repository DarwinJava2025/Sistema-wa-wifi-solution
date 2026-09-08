import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko
import time

HOST = "192.168.90.144"
USER = "dlugo"
PASS = "VOv8q86@F5dA"
TARGET_DIR = "/var/opt/sistema"

DB_USER = "sistema_user"
DB_PASS = "sistema_pass_2026"
DB_NAME = "sistema_db"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)

def run(cmd):
    print(f"\n=======================================================")
    print(f"[EXEC] {cmd}")
    print(f"=======================================================")
    stdin, stdout, stderr = ssh.exec_command(f"bash -c '{cmd}'", get_pty=False)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    print(out)
    if err:
        print("[STDERR]", err)
    return out

# 1. Write clean production .env
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
ALLOW_DEV_API_KEY=false

# Dashboard & Swagger
SERVE_DASHBOARD=true
ENABLE_SWAGGER=true
"""

sftp = ssh.open_sftp()
with sftp.file(f"{TARGET_DIR}/.env", "w") as f:
    f.write(env_content)
sftp.close()

run(f"rm -f {TARGET_DIR}/data/.env.generated")
print("Updated .env successfully.")

# 2. Restart PM2 'sistema'
run(f"cd {TARGET_DIR} && pm2 restart sistema --update-env")
run("pm2 save")

time.sleep(10)

# 3. Check status
run("pm2 status")
run("pm2 logs sistema --lines 45 --nostream")
run("curl -s http://localhost:2785/api/health")
print("\n")
run("curl -I http://localhost:2785/")

ssh.close()
