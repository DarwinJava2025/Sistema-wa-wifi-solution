import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko
import time

HOST = "192.168.90.144"
USER = "dlugo"
PASS = "VOv8q86@F5dA"
TARGET_DIR = "/var/opt/sistem-admin-wifi-solution"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USER, password=PASS, timeout=30)

def run(cmd):
    print(f"\n[EXEC] {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, get_pty=True)
    out = stdout.read().decode('utf-8', errors='replace')
    print(out)
    return out

# Fix sharp.cjs line 115 safe check: (!err.code || !err.code.endsWith("MODULE_NOT_FOUND"))
patch_cmd = """python3 -c "
path = '/var/opt/sistem-admin-wifi-solution/node_modules/sharp/dist/sharp.cjs'
with open(path, 'r') as f:
    content = f.read()
new_content = content.replace('if (!err.code.endsWith', 'if (!err.code || !err.code.endsWith')
with open(path, 'w') as f:
    f.write(new_content)
print('Patch applied successfully')
"
"""
run(patch_cmd)

# Now test what node says when requiring sharp
run("node -e \"try { console.log('Loaded sharp:', require('/var/opt/sistem-admin-wifi-solution/node_modules/sharp')); } catch (e) { console.error('Sharp error:', e); }\"")

ssh.close()
