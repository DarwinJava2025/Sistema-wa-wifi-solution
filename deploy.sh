#!/bin/bash

# ==========================================
# Configuración del servidor y proyecto
# ==========================================
SERVER="alobo@192.168.90.88"
REMOTE_PATH="/var/opt"
PROJECT_DIR="sistema-wa-wifi-solution"
ZIP_NAME="sistema-wa-wifi-solution.zip"

# scp y ssh abren conexiones separadas -sin esto, cada una pide la contraseña otra vez, y si esa
# segunda pedida no tiene dónde mostrarse el script se cuelga en silencio-. Con ControlMaster, la
# primera conexión autenticada queda abierta y las siguientes la reutilizan sin volver a pedir
# clave (mismo fix aplicado en bancaribe-wifi/plaza-wifi). ControlPath usa %C (hash corto) porque
# macOS limita la longitud de rutas de socket unix.
SSH_OPTS=(-o ControlMaster=auto -o "ControlPath=/tmp/openwa-deploy-%C" -o ControlPersist=60s)

echo "🚀 Iniciando proceso de despliegue de $PROJECT_DIR..."

echo "📦 1️⃣ Comprimiendo el proyecto (excluyendo node_modules, dist, .git y datos locales)..."
# .env NO se incluye en el zip -tiene DATABASE_PASSWORD y apunta al Postgres/Redis compartidos
# del servidor (host.docker.internal:5434/6379, ver bancaribe-wifi/db-init/02-create-openwa-db.sql)
# y se edita a mano en el servidor-. Como no está en el zip, el "unzip -o" del paso 3 no tiene con
# qué sobrescribir el .env ya desplegado. Si esta exclusión se quita alguna vez, el próximo
# deploy borraría el .env de producción.
# node_modules/dist se excluyen porque Docker los reconstruye adentro de la imagen (npm ci +
# build corren en el Dockerfile, no en el host) -incluirlos solo infla el zip sin necesidad-.
# data/ son sesiones de WhatsApp/DB local -nunca se suben, viven solo en el volumen del servidor-.
rm -f "$ZIP_NAME"
zip -r "$ZIP_NAME" . \
  -x "node_modules/*" "dashboard/node_modules/*" \
  -x "dist/*" "dashboard/dist/*" "*.tsbuildinfo" \
  -x "coverage/*" \
  -x ".git/*" \
  -x ".env" ".env.*" \
  -x "data/*" "*.db" "*.sqlite" "*.sqlite3" \
  -x "*.zip" "deploy.sh" \
  -x "*.DS_Store"

echo "📤 2️⃣ Subiendo el archivo al servidor..."
scp "${SSH_OPTS[@]}" "$ZIP_NAME" "$SERVER:$REMOTE_PATH/$ZIP_NAME"

echo "⚙️  3️⃣ Ejecutando comandos en el servidor..."
# set -e: si el build o el up fallan, abortamos antes de reportar éxito.
ssh "${SSH_OPTS[@]}" "$SERVER" "bash -s" << EOF
  set -e
  cd $REMOTE_PATH
  echo "🔹 Descomprimiendo el proyecto..."
  unzip -o $ZIP_NAME -d $PROJECT_DIR

  cd $PROJECT_DIR
  echo "🔹 Construyendo la imagen (Docker instala dependencias y compila adentro)..."
  docker compose build

  echo "🔹 Levantando/reiniciando el servicio..."
  # Sin --profile: los servicios opcionales (postgres/redis/minio propios de este proyecto)
  # tienen profiles en docker-compose.yml y NO arrancan a menos que se pidan explícitamente -este
  # deploy usa el Postgres/Redis YA compartidos con bancaribe-wifi/plaza-wifi, ver .env-.
  docker compose up -d

  echo "🔹 Esperando a que el healthcheck del contenedor se estabilice..."
  # El HEALTHCHECK del Dockerfile tiene start_period=30s + interval=30s x retries=3: Docker puede
  # tardar hasta ~2 minutos en decidir si el contenedor quedó healthy o unhealthy -sobre todo en el
  # primer arranque, con whatsapp-web.js/Chromium inicializando-. Esperar menos que eso arriesga
  # reportar éxito con el contenedor todavía en "starting".
  healthy=0
  for i in \$(seq 1 40); do
    status=\$(docker inspect --format='{{.State.Health.Status}}' openwa-api 2>/dev/null || echo "starting")
    if [ "\$status" = "healthy" ]; then
      echo "✅ openwa-api está healthy."
      healthy=1
      break
    fi
    if [ "\$status" = "unhealthy" ]; then
      echo "❌ openwa-api quedó unhealthy. Últimas líneas del log:"
      docker logs --tail=50 openwa-api
      exit 1
    fi
    sleep 3
  done
  if [ "\$healthy" -ne 1 ]; then
    echo "⚠️  openwa-api sigue en '\$status' después de 2 minutos -no es necesariamente un error,"
    echo "   pero no se confirmó 'healthy'. Últimas líneas del log:"
    docker logs --tail=50 openwa-api
    exit 1
  fi

  echo "✅ ¡Actualización en el servidor finalizada exitosamente!"
EOF

if [ $? -ne 0 ]; then
    echo "❌ El despliegue remoto falló (build, docker compose up, o el contenedor no quedó sano). Revisa el log de arriba."
    exit 1
fi

echo "🧹 Limpiando archivo local..."
rm -f "$ZIP_NAME"

echo "✅ ¡Despliegue completo! API en http://localhost:2785 (solo accesible desde el propio servidor)."
