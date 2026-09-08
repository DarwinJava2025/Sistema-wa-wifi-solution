import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("192.168.90.144", username="dlugo", password="VOv8q86@F5dA", timeout=30)
TARGET_DIR = "/var/opt/sistema"

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

# 1. Install node-addon-api and build-essential / libvips
run(f"cd {TARGET_DIR} && npm install node-addon-api node-gyp")

# 2. Build sharp natively
run(f"cd {TARGET_DIR}/node_modules/sharp && node install/build.js")

# 3. Test require sharp
run(f"cd {TARGET_DIR} && node -e 'const s = require(\"sharp\"); console.log(\"SHARP IS WORKING:\", typeof s);'")

# 4. If sharp is working, restart pm2
run(f"cd {TARGET_DIR} && pm2 restart sistema --update-env")
run("pm2 save")

time.sleep(6)
run("pm2 status")
run("pm2 logs sistema --lines 30 --nostream")
run("curl -s http://localhost:2785/api/health")
print("\n")
run("curl -I http://localhost:2785/")

ssh.close()
