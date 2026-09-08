import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko
import time

HOST = "192.168.90.144"
USER = "dlugo"
PASS = "VOv8q86@F5dA"
TARGET_DIR = "/var/opt/sistem-admin-wifi-solution"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)

def run(cmd):
    print(f"\n[EXEC] {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, get_pty=True)
    out = stdout.read().decode('utf-8', errors='replace')
    print(out)
    return out

run(f"node -e \"console.log('Sharp version:', require('{TARGET_DIR}/node_modules/sharp').versions)\"")

# Restart PM2
run(f"cd {TARGET_DIR} && pm2 restart sistem-admin-wifi --update-env")
run("pm2 save")

time.sleep(6)

run("pm2 status")
run("pm2 logs sistem-admin-wifi --lines 35 --nostream")
run("curl -I http://localhost:2785/api/health")
run("curl -s http://localhost:2785/api/health")
run("curl -I http://localhost:2785/")

ssh.close()
