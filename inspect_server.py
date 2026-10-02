import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.90.144', username='dlugo', password='VOv8q86@F5dA')

commands = [
    'pm2 list',
    'pm2 show sistema',
    'sudo ss -tulpn || ss -tulpn',
    'cat /etc/nginx/sites-enabled/* 2>/dev/null || true',
    'cat /etc/nginx/conf.d/* 2>/dev/null || true',
    'ls -la /var/opt/sistema',
    'ls -la /var/opt/sistema/dashboard',
    'ls -la /var/opt/sistema/dashboard/dist',
    'ls -la /var/www 2>/dev/null || true',
    'ls -la /var/www/html 2>/dev/null || true',
    'find /var/opt/ -maxdepth 3',
    'grep -rn "dist" /var/opt/sistema/dist/ | head -n 30',
    'curl -I http://localhost:2785/',
    'curl -s http://localhost:2785/ | head -n 30',
]

import sys

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
