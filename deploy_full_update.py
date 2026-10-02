import os
import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

SERVERS = [
    {
        "host": "192.168.90.88",
        "user": "alobo",
        "pass": "6ug-2;q3,1Or",
        "port": 22,
        "remote_dir": "/var/opt/sistema-wa-wifi-solution",
        "pm2_name": "sistema-wa-wifi",
    },
    {
        "host": "192.168.90.144",
        "user": "dlugo",
        "pass": "VOv8q86@F5dA",
        "port": 22,
        "remote_dir": "/var/opt/sistema",
        "pm2_name": "sistema",
    }
]

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

workspace = os.path.dirname(os.path.abspath(__file__))
local_dist = os.path.join(workspace, "dashboard", "dist")
local_src = os.path.join(workspace, "dashboard", "src")
backend_dist = os.path.join(workspace, "dist")
backend_src = os.path.join(workspace, "src")

for s in SERVERS:
    print(f"\n=======================================================")
    print(f"Connecting to {s['host']} as {s['user']}...")
    print(f"=======================================================")
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(s['host'], port=s['port'], username=s['user'], password=s['pass'], timeout=10)
        sftp = ssh.open_sftp()
        print(f"Connected to {s['host']}.")

        print(f"Uploading backend dist -> {s['remote_dir']}/dist...")
        upload_folder(sftp, backend_dist, f"{s['remote_dir']}/dist")

        print(f"Uploading backend src -> {s['remote_dir']}/src...")
        upload_folder(sftp, backend_src, f"{s['remote_dir']}/src")

        print(f"Uploading {local_src} -> {s['remote_dir']}/dashboard/src...")
        upload_folder(sftp, local_src, f"{s['remote_dir']}/dashboard/src")

        print(f"Uploading {local_dist} -> {s['remote_dir']}/dashboard/dist...")
        upload_folder(sftp, local_dist, f"{s['remote_dir']}/dashboard/dist")

        sftp.close()

        # Restart PM2
        cmd = f"cd {s['remote_dir']} && pm2 restart all"
        print(f"[EXEC] {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        print(stdout.read().decode('utf-8', errors='ignore'))
        
        stdin, stdout, stderr = ssh.exec_command("pm2 list")
        print(stdout.read().decode('utf-8', errors='ignore'))

        stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost:2785/api/health")
        print("[HEALTH]", stdout.read().decode('utf-8', errors='ignore'))

        ssh.close()
        print(f"SUCCESS for {s['host']}.")
    except Exception as e:
        print(f"Error on {s['host']}: {e}")

print("\n=== ALL DEPLOYMENTS COMPLETED ===")
