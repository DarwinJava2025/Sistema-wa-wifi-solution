import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("192.168.90.144", username="dlugo", password="VOv8q86@F5dA", timeout=30)

def run(cmd):
    print(f"\n=== {cmd} ===")
    stdin, stdout, stderr = ssh.exec_command(cmd, get_pty=True)
    out = stdout.read().decode('utf-8', errors='replace')
    print(out)
    return out

run("node -e \"const s=require('/var/opt/sistem-admin-wifi-solution/node_modules/sharp'); console.log('SHARP SUCCESS:', typeof s)\"")

# Run node dist/main.js in foreground for 5 seconds and capture full output
run("cd /var/opt/sistem-admin-wifi-solution && timeout 6 node dist/main.js || true")

ssh.close()
