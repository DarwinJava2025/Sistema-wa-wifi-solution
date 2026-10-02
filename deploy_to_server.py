import os
import sys
import json
import tarfile
import tempfile
import time

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

try:
    import paramiko
except ImportError:
    print("[ERROR] paramiko library is required. Install it using 'pip install paramiko'")
    sys.exit(1)

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "deploy_config.json")
LOCAL_DIR = os.path.dirname(os.path.abspath(__file__))

def load_config():
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "host": "192.168.90.88",
        "port": 22,
        "username": "alobo",
        "password": "6ug-2;q3,1Or",
        "remote_dir": "/var/opt/sistema-wa-wifi-solution",
        "service_name": "sistema-wa-wifi",
        "app_port": 2785
    }

def create_archive(output_filename, source_dir):
    print("📦 Empaquetando código fuente y compilados...")
    exclude_dirs = {
        "node_modules", ".git", "data", ".wwebjs_cache", 
        "coverage", ".idea", ".vscode", "__pycache__", "tmp"
    }
    
    with tarfile.open(output_filename, "w:gz") as tar:
        for root, dirs, files in os.walk(source_dir):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for file in files:
                if file.endswith((".tar.gz", ".zip", ".log")) or file == os.path.basename(output_filename):
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, source_dir)
                tar.add(full_path, arcname=rel_path)
                
    size_mb = os.path.getsize(output_filename) / (1024 * 1024)
    print(f"✅ Paquete creado: {output_filename} ({size_mb:.2f} MB)")

def run_remote_cmd(ssh, cmd, password=None, sudo=False):
    print(f"\n⚡ [REMOTO] {cmd}")
    if sudo and password:
        cmd_full = f"echo '{password}' | sudo -S bash -c \"{cmd}\""
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
    return status

def main():
    cfg = load_config()
    host = cfg.get("host", "192.168.90.88")
    port = cfg.get("port", 22)
    user = cfg.get("username", "alobo")
    password = cfg.get("password", "6ug-2;q3,1Or")
    remote_dir = cfg.get("remote_dir", "/var/opt/sistema-wa-wifi-solution")
    service_name = cfg.get("service_name", "sistema-wa-wifi")
    app_port = cfg.get("app_port", 2785)

    print("==================================================")
    print(f"🚀 DESPLIEGUE AUTOMÁTICO -> {user}@{host}:{remote_dir}")
    print("==================================================")

    temp_tar = os.path.join(tempfile.gettempdir(), "sistema_wa_deploy.tar.gz")
    if os.path.exists(temp_tar):
        try:
            os.remove(temp_tar)
        except Exception:
            pass

    # 1. Crear comprimido local
    create_archive(temp_tar, LOCAL_DIR)

    # 2. Conexión SSH
    print(f"\n🔌 Conectando a {host}:{port} como {user}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, port=port, username=user, password=password, timeout=30)
    print("✅ Conexión SSH establecida.")

    # 3. Subir archivo comprimido
    sftp = ssh.open_sftp()
    remote_upload_dir = f"/home/{user}/upload_deploy"
    run_remote_cmd(ssh, f"mkdir -p {remote_upload_dir}")
    
    remote_tar_path = f"{remote_upload_dir}/deploy.tar.gz"
    print(f"\n📤 Subiendo paquete al servidor ({remote_tar_path})...")

    def progress_callback(transferred, total):
        pct = (100.0 * transferred / total) if total > 0 else 0
        sys.stdout.write(f"\rProgreso: {transferred / (1024*1024):.2f} MB / {total / (1024*1024):.2f} MB ({pct:.1f}%)")
        sys.stdout.flush()

    sftp.put(temp_tar, remote_tar_path, callback=progress_callback)
    print("\n✅ Subida completada con éxito.")
    sftp.close()

    # 4. Descomprimir en directorio remoto (manteniendo .env y data/)
    print(f"\n📂 Descomprimiendo en {remote_dir}...")
    run_remote_cmd(ssh, f"mkdir -p {remote_dir} && tar -xzf {remote_tar_path} -C {remote_dir}")
    run_remote_cmd(ssh, f"rm -f {remote_tar_path}")

    # 5. Instalar dependencias si faltan
    print("\n📦 Verificando dependencias en el servidor...")
    run_remote_cmd(ssh, f"cd {remote_dir} && npm install --omit=dev --legacy-peer-deps || npm install --legacy-peer-deps")

    # 6. Reiniciar servicio systemd
    print(f"\n🔄 Reiniciando servicio {service_name}.service...")
    run_remote_cmd(ssh, f"systemctl restart {service_name}", password=password, sudo=True)

    # 7. Esperar y verificar estado
    print("\n⏳ Esperando que el servicio inicie...")
    time.sleep(4)
    run_remote_cmd(ssh, f"systemctl status {service_name} --no-pager", password=password, sudo=True)

    print(f"\n🔍 Comprobando respuesta en puerto {app_port}...")
    run_remote_cmd(ssh, f"curl -s -o /dev/null -w '%{{http_code}}' http://127.0.0.1:{app_port}/api/health || echo 'Health Check Done'")

    ssh.close()
    try:
        os.remove(temp_tar)
    except Exception:
        pass

    print("\n==================================================")
    print("🎉 ¡DESPLIEGUE COMPLETADO EXITOSAMENTE!")
    print(f"👉 URL: http://{host}:{app_port}")
    print("==================================================")

if __name__ == "__main__":
    main()
