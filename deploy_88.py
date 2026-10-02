import os
import sys
import paramiko

HOST = "192.168.90.88"
USER = "alobo"
PASS = "6ug-2;q3,1Or"
PORT = 22
REMOTE_BASE = "/var/opt/sistema-wa-wifi-solution"

print(f"Connecting to {HOST} as {USER}...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=15)
sftp = ssh.open_sftp()
print("Connected successfully.")

def sftp_mkdirs(sftp_client, remote_directory):
    dirs = []
    d = remote_directory
    while d and d != "/":
        dirs.append(d)
        d = os.path.dirname(d)
    for d in reversed(dirs):
        try:
            sftp_client.stat(d)
        except IOError:
            try:
                sftp_client.mkdir(d)
            except Exception:
                pass

def upload_folder(sftp_client, local_folder, remote_folder):
    for root, dirs, files in os.walk(local_folder):
        rel = os.path.relpath(root, local_folder).replace("\\", "/")
        rem_dir = remote_folder if rel == "." else f"{remote_folder}/{rel}"
        sftp_mkdirs(sftp_client, rem_dir)
        for f in files:
            local_file = os.path.join(root, f)
            rem_file = f"{rem_dir}/{f}"
            sftp_client.put(local_file, rem_file)

# 1. Upload dashboard/src
local_src = os.path.abspath("dashboard/src")
remote_src = f"{REMOTE_BASE}/dashboard/src"
print(f"Uploading {local_src} -> {remote_src}...")
upload_folder(sftp, local_src, remote_src)

# 2. Upload dashboard/dist
local_dist = os.path.abspath("dashboard/dist")
remote_dist = f"{REMOTE_BASE}/dashboard/dist"
print(f"Uploading {local_dist} -> {remote_dist}...")
upload_folder(sftp, local_dist, remote_dist)

sftp.close()

# 3. Find and restart the PM2 process or start it
commands = [
    f"cd {REMOTE_BASE} && pm2 restart all || pm2 start dist/main.js --name sistema-wa-wifi --time",
    "pm2 save",
    "pm2 list",
    "curl -s http://localhost:2785/api/health",
    "curl -I http://localhost:2785/",
    "cat /var/opt/sistema-wa-wifi-solution/dashboard/dist/index.html",
]

for cmd in commands:
    print(f"\n=======================================================")
    print(f"[EXEC] {cmd}")
    print(f"=======================================================")
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
print("\n=== DEPLOYMENT TO 192.168.90.88 COMPLETED SUCCESSFULLY ===")
