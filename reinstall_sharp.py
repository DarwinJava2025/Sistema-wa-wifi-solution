import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko

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

run("cd /var/opt/sistem-admin-wifi-solution && rm -rf node_modules/sharp node_modules/@img")
run("cd /var/opt/sistem-admin-wifi-solution && npm install sharp")
run("cd /var/opt/sistem-admin-wifi-solution && ls -la node_modules/@img || true")
run("cd /var/opt/sistem-admin-wifi-solution && node -e \"try { console.log(require('sharp').versions); } catch(e) { console.error('Full Error:', e); }\"")

ssh.close()
