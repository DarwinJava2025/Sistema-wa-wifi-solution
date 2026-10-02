import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import paramiko

HOST = "192.168.90.144"
USER = "dlugo"
PASS = "VOv8q86@F5dA"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=15)

stdin, stdout, stderr = ssh.exec_command("pm2 status && pm2 logs sistema --lines 20 --nostream && echo -e '\\n--- HEALTH ---' && curl -s http://localhost:2785/api/health && echo -e '\\n--- HTTP HEAD ---' && curl -I http://localhost:2785/")
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))
ssh.close()
