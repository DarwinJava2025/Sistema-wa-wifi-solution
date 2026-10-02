import os
import sys
import paramiko

HOST = "192.168.90.88"
USER = "alobo"
PASS = "6ug-2;q3,1Or"
PORT = 22

print(f"Connecting to {HOST} as {USER}...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=15)
print("Connected successfully!")

commands = [
    "pm2 list",
    "ls -la /var/opt",
    "ls -la /var/opt/sistema-wa-wifi-solution 2>/dev/null || ls -la /var/opt/sistema 2>/dev/null || true",
    "curl -s http://localhost:2785/api/health || true",
]

for cmd in commands:
    print(f"\n=== CMD: {cmd} ===")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="ignore")
    err = stderr.read().decode("utf-8", errors="ignore")
    sys.stdout.buffer.write(out.encode("utf-8"))
    sys.stdout.buffer.write(b"\n")
    if err:
        sys.stdout.buffer.write(b"[STDERR]: ")
        sys.stdout.buffer.write(err.encode("utf-8"))
        sys.stdout.buffer.write(b"\n")

ssh.close()
