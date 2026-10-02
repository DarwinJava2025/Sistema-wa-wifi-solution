import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.90.88', username='alobo', password='6ug-2;q3,1Or', timeout=15)

def run(cmd):
    print(f"\n[RUN] {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, get_pty=True)
    out = stdout.read().decode('utf-8', errors='replace')
    print(out)
    return out

run("node -e \"console.log(require('/var/opt/Bancaribe-Wifi/node_modules/sharp'))\"")
run("node -e \"console.log(require('/var/opt/sistema-wa-wifi-solution/node_modules/sharp'))\"")

ssh.close()
