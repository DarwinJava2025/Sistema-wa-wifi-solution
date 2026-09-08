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
    out = stdout.read().decode('utf-8', errors='replace')
    print(out)
    return out

run("cd /var/opt/sistem-admin-wifi-solution && node -v")
run("cd /var/opt/sistem-admin-wifi-solution && node -e 'require(\"sharp\")'")
run("cd /var/opt/sistem-admin-wifi-solution && npm ls sharp")

ssh.close()
