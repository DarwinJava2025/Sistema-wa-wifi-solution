import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("192.168.90.144", username="dlugo", password="VOv8q86@F5dA", timeout=30)
TARGET_DIR = "/var/opt/sistema"

# Let's test require('@img/sharp-linux-x64/sharp.node') directly
stdin, stdout, stderr = ssh.exec_command(f"""
node -e "
try {{
  const bin = require('{TARGET_DIR}/node_modules/@img/sharp-linux-x64/sharp.node');
  console.log('Direct binary loaded successfully:', Object.keys(bin));
  console.log('isUsingX64V2:', bin._isUsingX64V2 ? bin._isUsingX64V2() : 'no method');
}} catch(e) {{
  console.error('Error loading binary directly:', e);
}}
"
""")
print(stdout.read().decode('utf-8', errors='replace'))
print(stderr.read().decode('utf-8', errors='replace'))
ssh.close()
