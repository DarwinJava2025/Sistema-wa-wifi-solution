import os
import sys
import tarfile
import paramiko
import time

HOST = "192.168.90.144"
USER = "dlugo"
PASS = "VOv8q86@F5dA"
LOCAL_DIR = r"c:\Users\alodi\Downloads\System-WA-Wifi\Sistem-admin-wifi-solution"
ARCHIVE_PATH = r"C:\Users\alodi\.gemini\antigravity-ide\brain\66c320c6-0220-4931-8c40-32b5c0b4712b\scratch\project.tar.gz"

REMOTE_UPLOAD_DIR = "/home/dlugo/upload_project"
REMOTE_TARGET_DIR = "/var/opt/sistem-admin-wifi-solution"

def make_tarfile(output_filename, source_dir):
    print("Creating archive of project...")
    exclude_dirs = {"node_modules", "dist", ".git", "data", "coverage", ".idea", ".vscode"}
    
    with tarfile.open(output_filename, "w:gz") as tar:
        for root, dirs, files in os.walk(source_dir):
            # filter out excluded dirs
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, source_dir)
                tar.add(full_path, arcname=rel_path)
    print(f"Archive created: {output_filename} ({os.path.getsize(output_filename) / (1024*1024):.2f} MB)")

def get_ssh():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=30)
    return ssh

def run_cmd(ssh, cmd, sudo=False):
    print(f"\n[EXEC] {cmd}")
    if sudo:
        cmd_full = f"echo '{PASS}' | sudo -S bash -c \"{cmd}\""
    else:
        cmd_full = f"bash -c \"{cmd}\""
    
    stdin, stdout, stderr = ssh.exec_command(cmd_full, get_pty=True)
    while True:
        line = stdout.readline()
        if not line:
            break
        print(line, end="")
    
    status = stdout.channel.recv_exit_status()
    if status != 0:
        print(f"\n[WARNING/ERROR] Command exited with status {status}")
    return status

def main():
    # 1. Create Archive
    make_tarfile(ARCHIVE_PATH, LOCAL_DIR)
    
    ssh = get_ssh()
    sftp = ssh.open_sftp()
    
    # 2. Prepare upload folder in /home/dlugo
    print("\n--- Step 1: Creating upload directory in /home/dlugo ---")
    run_cmd(ssh, f"mkdir -p {REMOTE_UPLOAD_DIR}")
    
    # 3. Upload project archive
    print("\n--- Step 2: Uploading archive via SFTP ---")
    remote_archive = f"{REMOTE_UPLOAD_DIR}/project.tar.gz"
    
    def sftp_progress(transferred, total):
        sys.stdout.write(f"\rUploading: {transferred / (1024*1024):.2f} MB / {total / (1024*1024):.2f} MB ({100.0 * transferred / total:.1f}%)")
        sys.stdout.flush()
        
    sftp.put(ARCHIVE_PATH, remote_archive, callback=sftp_progress)
    print("\nUpload complete.")
    sftp.close()
    
    # 4. Prepare /var/opt/sistem-admin-wifi-solution
    print("\n--- Step 3: Preparing /var/opt/sistem-admin-wifi-solution ---")
    run_cmd(ssh, f"mkdir -p {REMOTE_TARGET_DIR} && chown -R {USER}:{USER} {REMOTE_TARGET_DIR}", sudo=True)
    run_cmd(ssh, f"tar -xzf {remote_archive} -C {REMOTE_TARGET_DIR}")
    run_cmd(ssh, f"ls -la {REMOTE_TARGET_DIR}")
    
    ssh.close()

if __name__ == '__main__':
    main()
