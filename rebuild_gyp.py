import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko

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

run(f"cd {TARGET_DIR} && npm install --build-from-source sharp")
run(f"cd {TARGET_DIR}/node_modules/sharp && npx node-gyp rebuild")
run("node -e \"console.log('Sharp native:', require('/var/opt/sistem-admin-wifi-solution/node_modules/sharp').versions)\"")

ssh.close()
