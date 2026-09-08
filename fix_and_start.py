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

# 1. Inspect lines around line 115 in sharp.cjs
sftp = ssh.open_sftp()
sharp_path = f"{TARGET_DIR}/node_modules/sharp/dist/sharp.cjs"
with sftp.file(sharp_path, "r") as f:
    content = f.read().decode('utf-8')

print("Found sharp.cjs length:", len(content))

# Look for err.code.endsWith
if "err.code.endsWith" in content:
    print("Found 'err.code.endsWith', patching it to safe check...")
    content = content.replace("!err.code.endsWith", "!(err.code && err.code.endsWith)")
    with sftp.file(sharp_path, "w") as f:
        f.write(content.encode('utf-8'))
    print("Patch written successfully!")
else:
    print("err.code.endsWith not directly matched, searching lines...")

sftp.close()

# 2. Test sharp require
run(f"cd {TARGET_DIR} && node -e \"try {{ const s = require('sharp'); console.log('SHARP SUCCESS:', s.versions); }} catch(e) {{ console.error('SHARP ERR:', e); }}\"")

# 3. Restart PM2 'sistema'
run(f"cd {TARGET_DIR} && pm2 restart sistema --update-env")
run("pm2 save")

# 4. Wait and check logs
time.sleep(8)
run("pm2 status")
run("pm2 logs sistema --lines 40 --nostream")
run("curl -s http://localhost:2785/api/health")
print("\n")
run("curl -I http://localhost:2785/")

ssh.close()
