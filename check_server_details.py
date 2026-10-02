import paramiko
import sys

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.90.144', username='dlugo', password='VOv8q86@F5dA')

commands = [
    'ss -tulpn',
    'ps aux | grep node',
    'ls -lat /var/opt/sistema/dashboard/dist/assets | head -n 15',
    'cat /var/opt/sistema/dashboard/dist/index.html',
    'curl -s http://localhost:2785/ | head -n 30',
]

for cmd in commands:
    print(f'=== CMD: {cmd} ===')
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    sys.stdout.buffer.write(out.encode('utf-8'))
    sys.stdout.buffer.write(b'\n')
    if err:
        sys.stdout.buffer.write(b'[STDERR]: ')
        sys.stdout.buffer.write(err.encode('utf-8'))
        sys.stdout.buffer.write(b'\n')

ssh.close()
