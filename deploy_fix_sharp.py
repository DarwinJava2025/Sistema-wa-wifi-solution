import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import paramiko
import time

HOST = "192.168.90.144"
USER = "dlugo"
PASS = "VOv8q86@F5dA"
TARGET_DIR = "/var/opt/sistem-admin-wifi-solution"

def get_ssh():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=30)
    return ssh

def run_cmd(ssh, cmd, sudo=False):
    print(f"\n=======================================================")
    print(f"[EXEC] {cmd}")
    print(f"=======================================================")
    if sudo:
        cmd_full = f"echo '{PASS}' | sudo -S bash -c \"{cmd}\""
    else:
        cmd_full = f"bash -c \"{cmd}\""
    
    stdin, stdout, stderr = ssh.exec_command(cmd_full, get_pty=True)
    while True:
        try:
            line = stdout.readline()
            if not line:
                break
            print(line, end="", flush=True)
        except Exception:
            break
    
    status = stdout.channel.recv_exit_status()
    if status != 0:
        print(f"\n[WARNING/ERROR] Command exited with status {status}")
    return status

def main():
    ssh = get_ssh()
    
    print("\n--- Installing sharp linux-x64 bindings ---")
    run_cmd(ssh, f"cd {TARGET_DIR} && npm install --include=optional @img/sharp-linux-x64 @img/sharp-libvips-linux-x64")
    
    # Test node loading sharp directly
    run_cmd(ssh, f"cd {TARGET_DIR} && node -e \"const sharp = require('sharp'); console.log('Sharp loaded successfully:', sharp.versions)\"")
    
    # Restart app in PM2
    run_cmd(ssh, f"cd {TARGET_DIR} && pm2 restart sistem-admin-wifi --update-env")
    run_cmd(ssh, "pm2 save")
    
    time.sleep(6)
    
    print("\n--- Verifying PM2 and Service ---")
    run_cmd(ssh, "pm2 status")
    run_cmd(ssh, "pm2 logs sistem-admin-wifi --lines 40 --nostream")
    
    print("\n--- Verifying Endpoints ---")
    run_cmd(ssh, "curl -I http://localhost:2785/api/health")
    run_cmd(ssh, "curl -I http://localhost:2785/")
    run_cmd(ssh, "curl -s http://localhost:2785/api/health")
    
    ssh.close()
    print("\nFinished sharp fix.")

if __name__ == '__main__':
    main()
