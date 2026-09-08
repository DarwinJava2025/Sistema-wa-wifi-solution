import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko

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

# Install @img/sharp-wasm32 or run sharp build
run(f"cd {TARGET_DIR} && npm install @img/sharp-wasm32 --save-optional")

# Also let's check what install/build.js does
run(f"cd {TARGET_DIR}/node_modules/sharp && node install/build.js || true")

# Test requiring sharp now
run(f"cd {TARGET_DIR} && node -e \"console.log('SHARP REQUIRE SUCCESS:', require('sharp'))\"")

ssh.close()
