import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("192.168.90.144", username="dlugo", password="VOv8q86@F5dA", timeout=15)

stdin, stdout, stderr = ssh.exec_command("sed -n '105,125p' /var/opt/sistem-admin-wifi-solution/node_modules/sharp/dist/sharp.cjs")
print(stdout.read().decode())

stdin, stdout, stderr = ssh.exec_command("cd /var/opt/sistem-admin-wifi-solution && node -e \"require('sharp')\"")
print("Node require error:\n", stderr.read().decode())

ssh.close()
