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

def run_sudo(cmd):
    print(f"\n[SUDO] {cmd}")
    stdin, stdout, stderr = ssh.exec_command(f"echo '{PASS}' | sudo -S bash -c '{cmd}'", get_pty=True)
    out = stdout.read().decode('utf-8', errors='replace')
    print(out)
    return out

def run(cmd):
    print(f"\n[EXEC] {cmd}")
    stdin, stdout, stderr = ssh.exec_command(f"bash -c '{cmd}'", get_pty=True)
    out = stdout.read().decode('utf-8', errors='replace')
    print(out)
    return out

# 1. Install libvips-dev on the system so sharp can compile natively for this CPU
run_sudo("DEBIAN_FRONTEND=noninteractive apt-get install -y libvips-dev")

# 2. Rebuild sharp from source matching this exact CPU
run(f"cd {TARGET_DIR} && rm -rf node_modules/sharp && npm install --build-from-source sharp")

# 3. Test require sharp
run(f"cd {TARGET_DIR} && node -e \"console.log('SHARP SUCCESS:', require('sharp').versions)\"")

# 4. Restart PM2 and verify
run(f"cd {TARGET_DIR} && pm2 restart sistem-admin-wifi --update-env")
run("pm2 save")

time.sleep(6)

run("pm2 status")
run("pm2 logs sistem-admin-wifi --lines 30 --nostream")
run("curl -I http://localhost:2785/api/health")
run("curl -s http://localhost:2785/api/health")
run("curl -I http://localhost:2785/")

ssh.close()
