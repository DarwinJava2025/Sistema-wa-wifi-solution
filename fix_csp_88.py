import paramiko, sys, time
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HOST="192.168.90.88"; PORT=22; USER="alobo"; PW="6ug-2;q3,1Or"
REMOTE_DIR="/var/opt/sistema-wa-wifi-solution"

ssh=paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST,port=PORT,username=USER,password=PW,timeout=30)
print("SSH OK")

def rc(c, sudo=False):
    full=("echo " + repr(PW) + " | sudo -S " + c) if sudo else c
    _,o,_=ssh.exec_command(full, get_pty=True)
    out=o.read().decode("utf-8","replace").strip()
    if out: print(out[-800:])
    return o.channel.recv_exit_status()

print("--- .env actual en servidor ---")
rc("cat " + REMOTE_DIR + "/.env")

print("\n--- Aplicando fix CSP ---")
# Remover linea existente si hay, luego agregar la correcta
rc("sed -i '/CSP_UPGRADE_INSECURE_REQUESTS/d' " + REMOTE_DIR + "/.env")
rc("echo 'CSP_UPGRADE_INSECURE_REQUESTS=false' >> " + REMOTE_DIR + "/.env")
print("Linea agregada")

print("--- .env con fix ---")
rc("grep -E 'CSP|NODE_ENV|PORT' " + REMOTE_DIR + "/.env")

print("Reiniciando servicio...")
rc("systemctl restart sistema-wa-wifi", sudo=True)
time.sleep(7)
rc("systemctl is-active sistema-wa-wifi", sudo=True)
rc("curl -sf -o /dev/null -w 'ROOT HTTP %{http_code}' http://127.0.0.1:2785/")

ssh.close()
print("\nLISTO - Recarga con Ctrl+Shift+R en http://192.168.90.88:2785")
