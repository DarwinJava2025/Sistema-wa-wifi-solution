import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("192.168.90.144", username="dlugo", password="VOv8q86@F5dA", timeout=30)
TARGET_DIR = "/var/opt/sistema"

def run(cmd):
    print(f"\n=======================================================")
    print(f"[EXEC] {cmd}")
    print(f"=======================================================")
    stdin, stdout, stderr = ssh.exec_command(f"bash -c '{cmd}'", get_pty=False)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    print(out)
    if err:
        print("[STDERR]", err)
    return out

# Read sharp.cjs and patch it cleanly
sftp = ssh.open_sftp()
sharp_path = f"{TARGET_DIR}/node_modules/sharp/dist/sharp.cjs"
with sftp.file(sharp_path, "r") as f:
    content = f.read().decode('utf-8')

# Remove the sharp = null on line 90
content = content.replace("sharp = null;", "// sharp = null;")
# Fix line 115 safe check
content = content.replace("!(err.code && err.code.endsWith)", "!Boolean(err.code && err.code.endsWith && err.code.endsWith('MODULE_NOT_FOUND'))")
content = content.replace("if (!err.code.endsWith(\"MODULE_NOT_FOUND\"))", "if (!Boolean(err.code && err.code.endsWith && err.code.endsWith('MODULE_NOT_FOUND')))")

with sftp.file(sharp_path, "w") as f:
    f.write(content.encode('utf-8'))
sftp.close()

# Test sharp in Node.js
print("--- Testing sharp in node ---")
test_script = """node -e 'const sharp = require("/var/opt/sistema/node_modules/sharp"); console.log("SHARP LOADED:", typeof sharp); sharp({create: {width: 10, height: 10, channels: 4, background: {r: 255, g: 0, b: 0, alpha: 0.5}}}).png().toBuffer().then(buf => console.log("SHARP BUFFER SUCCESS, LEN:", buf.length)).catch(err => console.error("SHARP BUFFER ERR:", err));'"""
run(test_script)

# If working, restart PM2
run(f"cd {TARGET_DIR} && pm2 restart sistema --update-env")
run("pm2 save")

time.sleep(8)
run("pm2 status")
run("pm2 logs sistema --lines 35 --nostream")
run("curl -s http://localhost:2785/api/health")
print("\n")
run("curl -I http://localhost:2785/")

ssh.close()
