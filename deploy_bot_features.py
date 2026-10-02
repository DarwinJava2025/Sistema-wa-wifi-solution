import sys
import os
import time
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import paramiko

HOST = "192.168.90.144"
USER = "dlugo"
PASS = "VOv8q86@F5dA"
TARGET_DIR = "/var/opt/sistema"

def get_ssh():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {HOST} as {USER}...")
    ssh.connect(HOST, username=USER, password=PASS, timeout=30)
    print("Connected successfully.")
    return ssh

def run(ssh, cmd, sudo=False):
    print(f"\n=======================================================")
    print(f"[EXEC {'SUDO' if sudo else 'USER'}] {cmd}")
    print(f"=======================================================")
    if sudo:
        stdin, stdout, stderr = ssh.exec_command(f"sudo -S bash -c '{cmd}'", get_pty=False)
        stdin.write(f"{PASS}\n")
        stdin.flush()
    else:
        stdin, stdout, stderr = ssh.exec_command(f"bash -c '{cmd}'", get_pty=False)
    
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    print(out)
    if err and "password for" not in err:
        print("[STDERR]", err)
    
    status = stdout.channel.recv_exit_status()
    print(f"[STATUS] {status}")
    return status, out

def upload_dir(sftp, local_dir, remote_dir):
    print(f"Uploading {local_dir} -> {remote_dir}...")
    for root, dirs, files in os.walk(local_dir):
        rel_path = os.path.relpath(root, local_dir)
        if rel_path == ".":
            dest_dir = remote_dir
        else:
            dest_dir = os.path.join(remote_dir, rel_path).replace("\\", "/")
        
        try:
            sftp.mkdir(dest_dir)
        except Exception:
            pass
        
        for f in files:
            local_file = os.path.join(root, f)
            remote_file = os.path.join(dest_dir, f).replace("\\", "/")
            try:
                sftp.put(local_file, remote_file)
            except Exception as e:
                print(f"Error uploading {local_file}: {e}")

def main():
    ssh = get_ssh()
    sftp = ssh.open_sftp()
    
    workspace = os.path.dirname(os.path.abspath(__file__))
    local_dashboard_dist = os.path.join(workspace, "dashboard", "dist")
    local_dashboard_src = os.path.join(workspace, "dashboard", "src")
    
    print("\n--- 1. Uploading modified source files ---")
    # Upload src
    upload_dir(sftp, local_dashboard_src, f"{TARGET_DIR}/dashboard/src")
    
    print("\n--- 2. Uploading compiled dashboard dist ---")
    upload_dir(sftp, local_dashboard_dist, f"{TARGET_DIR}/dashboard/dist")
    
    sftp.close()
    
    print("\n--- 3. Restarting PM2 process 'sistema' ---")
    run(ssh, f"cd {TARGET_DIR} && pm2 restart sistema || pm2 start dist/main.js --name 'sistema' --time")
    run(ssh, "pm2 save")
    
    print("\n--- 4. Verifying health & logs ---")
    time.sleep(5)
    run(ssh, "pm2 status")
    run(ssh, "curl -s http://localhost:2785/api/health")
    print("\n")
    run(ssh, "curl -I http://localhost:2785/")
    
    ssh.close()
    print("\n=== DEPLOYMENT COMPLETED SUCCESSFULLY ===")

if __name__ == '__main__':
    main()
