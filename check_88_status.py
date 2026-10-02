import paramiko
import sys

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("192.168.90.88", username="alobo", password="6ug-2;q3,1Or", timeout=15)

commands = [
    "pm2 list",
    "ss -tulpn | grep 2785",
    "curl -s http://localhost:2785/api/health",
    "curl -s http://localhost:2785/ | head -n 30"
]

for cmd in commands:
    print(f"=== CMD: {cmd} ===")
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
