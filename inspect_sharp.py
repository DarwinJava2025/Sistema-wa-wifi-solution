import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("192.168.90.144", username="dlugo", password="VOv8q86@F5dA", timeout=30)
sftp = ssh.open_sftp()
with sftp.file('/var/opt/sistema/node_modules/sharp/dist/sharp.cjs') as f:
    lines = f.readlines()
for i in range(0, 26):
    print(f"{i+1}: {lines[i]}", end="")
sftp.close()
ssh.close()
