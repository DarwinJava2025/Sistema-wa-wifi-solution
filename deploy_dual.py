import os, sys, tarfile, tempfile, time

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

try:
    import paramiko
except ImportError:
    print("[ERROR] pip install paramiko")
    sys.exit(1)

LOCAL_DIR = r"c:\Users\alodi\Downloads\System-WA-Wifi\Sistem-admin-wifi-solution"

SERVERS = [
    {"label":"SERVIDOR .88","host":"192.168.90.88","port":22,"username":"alobo","password":"6ug-2;q3,1Or","remote_dir":"/var/opt/sistema-wa-wifi-solution","service_name":"sistema-wa-wifi","app_port":2785},
    {"label":"SERVIDOR .144","host":"192.168.90.144","port":22,"username":"alobo","password":"6ug-2;q3,1Or","remote_dir":"/var/opt/sistema-wa-wifi-solution","service_name":"sistema-wa-wifi","app_port":2785},
]

EXCLUDE = {"node_modules",".git","data",".wwebjs_cache","coverage","__pycache__","tmp"}

def make_tar(out, src):
    print("Empaquetando codigo fuente...")
    with tarfile.open(out,"w:gz") as tar:
        for root,dirs,files in os.walk(src):
            dirs[:] = [d for d in dirs if d not in EXCLUDE]
            for f in files:
                if f.endswith((".tar.gz",".zip",".log")): continue
                fp = os.path.join(root,f)
                tar.add(fp, arcname=os.path.relpath(fp,src))
    mb = os.path.getsize(out)/1024/1024
    print(f"Paquete listo: {mb:.1f} MB")

def run_cmd(ssh, c, pw=None, sudo=False):
    full = f"echo '{pw}' | sudo -S bash -c \"{c}\"" if sudo and pw else f"bash -c \"{c}\""
    _,out,_ = ssh.exec_command(full, get_pty=True)
    result = out.read().decode("utf-8","replace")
    if result.strip(): print(result.strip()[:400])
    return out.channel.recv_exit_status()

def deploy(cfg, tar_path):
    h=cfg["host"]; u=cfg["username"]; pw=cfg["password"]
    rd=cfg["remote_dir"]; svc=cfg["service_name"]; port=cfg["app_port"]
    print(f"\n{'='*55}")
    print(f" DESPLEGANDO {cfg['label']} ({u}@{h})")
    print(f"{'='*55}")
    try:
        ssh=paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(h,port=cfg["port"],username=u,password=pw,timeout=30)
        print(f"SSH OK: {h}")
    except Exception as e:
        print(f"ERROR SSH {h}: {e}"); return False
    sftp=ssh.open_sftp()
    updir=f"/home/{u}/deploy_upload"
    run_cmd(ssh,f"mkdir -p {updir}")
    rtar=f"{updir}/deploy.tar.gz"
    print("Subiendo archivo al servidor...")
    sftp.put(tar_path,rtar)
    sftp.close()
    print("Subida completa")
    print("Descomprimiendo...")
    run_cmd(ssh,f"mkdir -p {rd} && tar -xzf {rtar} -C {rd} && rm -f {rtar}")
    print("Instalando dependencias (puede tardar ~2 min)...")
    run_cmd(ssh,f"cd {rd} && npm install --omit=dev --legacy-peer-deps 2>&1 | tail -5")
    print(f"Reiniciando servicio {svc}...")
    run_cmd(ssh,f"systemctl restart {svc}",pw=pw,sudo=True)
    time.sleep(6)
    run_cmd(ssh,f"systemctl is-active {svc}",pw=pw,sudo=True)
    run_cmd(ssh,f"curl -sf -o /dev/null -w 'HTTP %{{http_code}}' http://127.0.0.1:{port}/api/health || echo sin-health-endpoint")
    ssh.close()
    print(f"LISTO => http://{h}:{port}")
    return True

tar_path = os.path.join(tempfile.gettempdir(),"deploy_dual.tar.gz")
if os.path.exists(tar_path): os.remove(tar_path)
make_tar(tar_path, LOCAL_DIR)

results=[]
for s in SERVERS:
    results.append((s["label"],s["host"],deploy(s,tar_path)))

try: os.remove(tar_path)
except: pass

print("\n===== RESUMEN FINAL =====")
for lbl,h,ok in results:
    print(f"  {'OK' if ok else 'FALLO'} {lbl} ({h})")
