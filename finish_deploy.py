import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import paramiko
import time

HOST = "192.168.90.144"
USER = "dlugo"
PASS = "VOv8q86@F5dA"
TARGET_DIR = "/var/opt/sistema"

def get_ssh():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=30)
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

def main():
    ssh = get_ssh()
    
    # 1. Clean dist completely
    run(ssh, f"cd {TARGET_DIR} && rm -rf dist && npx rimraf dist")
    
    # 2. Test sharp
    run(ssh, f"cd {TARGET_DIR} && node -e \"console.log('SHARP TEST:', require('sharp').versions)\"")
    
    # 3. Build backend
    print("\n--- Compiling NestJS Backend ---")
    run(ssh, f"cd {TARGET_DIR} && npm run build")
    
    # 4. Build dashboard
    print("\n--- Compiling Dashboard ---")
    run(ssh, f"cd {TARGET_DIR} && npm run dashboard:build")
    
    # 5. Start in PM2 as 'sistema'
    print("\n--- Starting in PM2 ---")
    run(ssh, f"cd {TARGET_DIR} && pm2 delete sistema || true")
    run(ssh, f"cd {TARGET_DIR} && pm2 start dist/main.js --name 'sistema' --time")
    run(ssh, "pm2 save")
    
    # 6. Verify status and health check
    print("\n--- Verifying application status ---")
    time.sleep(6)
    run(ssh, "pm2 status")
    run(ssh, "pm2 logs sistema --lines 35 --nostream")
    run(ssh, "curl -s http://localhost:2785/api/health")
    print("\n")
    run(ssh, "curl -I http://localhost:2785/")
    
    ssh.close()

if __name__ == '__main__':
    main()
