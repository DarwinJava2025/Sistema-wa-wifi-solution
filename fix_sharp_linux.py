import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("192.168.90.144", username="dlugo", password="VOv8q86@F5dA", timeout=30)

def run(cmd):
    print(f"=== {cmd} ===")
    stdin, stdout, stderr = ssh.exec_command(f"bash -c \"{cmd}\"", get_pty=True)
    while True:
        line = stdout.readline()
        if not line:
            break
        print(line, end="", flush=True)
    print(f"Exit: {stdout.channel.recv_exit_status()}")

run("cd /var/opt/sistem-admin-wifi-solution && npm install sharp --platform=linux --arch=x64 --save")
run("cd /var/opt/sistem-admin-wifi-solution && node -e \"const s = require('sharp'); console.log('Sharp OK:', s.versions)\"")

# If sharp OK, restart PM2 and check
run("cd /var/opt/sistem-admin-wifi-solution && pm2 restart sistem-admin-wifi --update-env")
time.sleep(5)
run("pm2 status")
run("pm2 logs sistem-admin-wifi --lines 30 --nostream")
run("curl -s http://localhost:2785/api/health")
run("curl -I http://localhost:2785/")

ssh.close()
