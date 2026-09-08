import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("192.168.90.144", username="dlugo", password="VOv8q86@F5dA", timeout=30)
stdin, stdout, stderr = ssh.exec_command("cat /var/opt/sistema/node_modules/sharp/package.json")
print(stdout.read().decode('utf-8', errors='replace'))
ssh.close()
