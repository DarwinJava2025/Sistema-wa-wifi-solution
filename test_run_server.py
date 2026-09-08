import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("192.168.90.144", username="dlugo", password="VOv8q86@F5dA", timeout=30)

def run(cmd):
    print(f"\n=== {cmd} ===")
    stdin, stdout, stderr = ssh.exec_command(f"bash -c \"{cmd}\"", get_pty=True)
    while True:
        line = stdout.readline()
        if not line:
            break
        print(line, end="", flush=True)
    print(f"Exit: {stdout.channel.recv_exit_status()}")

# Let's test running node dist/main.js directly to see the exact real error output
run("cd /var/opt/sistem-admin-wifi-solution && npm run build")
run("cd /var/opt/sistem-admin-wifi-solution && node dist/main.js & pid=$!; sleep 4; kill $pid 2>/dev/null || true")

ssh.close()
