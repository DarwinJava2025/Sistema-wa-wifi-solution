# Sistema WA WiFi Solution 🚀

<div align="center">
  <img src="dashboard/public/system_wifi_logo.png" alt="Sistema WA WiFi Solution" width="380" />
  
  <p align="center">
    <strong>Plataforma integral de administración y automatización de WhatsApp con Inteligencia Artificial (IA) para soporte técnico y ventas 24/7.</strong>
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Node.js-v22%2B-green?style=for-the-badge&logo=node.js" alt="Node.js" />
    <img src="https://img.shields.io/badge/NestJS-v11-red?style=for-the-badge&logo=nestjs" alt="NestJS" />
    <img src="https://img.shields.io/badge/React-v19-blue?style=for-the-badge&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Vite-v8-purple?style=for-the-badge&logo=vite" alt="Vite" />
    <img src="https://img.shields.io/badge/Swagger-OpenAPI-brightgreen?style=for-the-badge&logo=swagger" alt="Swagger" />
  </p>
</div>

---

## 🌟 Descripción General

**Sistema WA WiFi Solution** es una solución robusta y escalable diseñada para transformar la atención al cliente, el soporte técnico y las operaciones comerciales mediante **Agentes de Inteligencia Artificial (IA)** conectados directamente a WhatsApp en tiempo real.

El sistema permite crear, entrenar y desplegar agentes inteligentes que operan de forma continua las **24 horas del día, los 7 días de la semana**, automatizando respuestas, gestionando leads, agendando citas, procesando solicitudes de soporte y proporcionando un monitoreo integral en vivo de todas las sesiones y métricas.

---

## 🎯 Características Principales

### 🤖 1. Agentes IA de Soporte y Ventas 24/7
- **Atención ininterrumpida**: Respuestas automáticas e inteligentes en tiempo real sin intervención humana.
- **Flujos conversacionales dinámicos**: Calificación automática de prospectos, cotizaciones y asistencia técnica guiada.
- **Integración con LLMs y Prompts personalizados**: Configuración adaptable al tono, servicios y productos de la empresa.

### ⚡ 2. API Gateway & Motor de WhatsApp
- **Multi-sesión y Multi-dispositivo**: Gestión centralizada de múltiples números de WhatsApp.
- **Mensajería enriquecida**: Envío y recepción de texto, imágenes, audios/notas de voz, videos, documentos, stickers, encuestas y ubicaciones.
- **Gestión de grupos y canales**: Automatización de publicaciones, bienvenida de miembros y moderación.

### 📊 3. Panel de Administración (Dashboard en Vivo)
- **Interfaz moderna y futurista**: Diseño *Glassmorphism* optimizado en modo oscuro con temática de telecomunicaciones y redes.
- **Monitoreo en tiempo real**: Visualización en vivo de sesiones activas, estados de conexión, tráfico de mensajes y logs.
- **Gestión de API Keys**: Control de acceso granular y generación segura de credenciales maestras.

### 🔔 4. Webhooks y Automatizaciones
- **Eventos en tiempo real**: Notificaciones instantáneas hacia tus endpoints o CRMs (`onMessage`, `onStatus`, `onAck`, `onGroupUpdate`).
- **Plantillas de mensajes**: Reutilización de plantillas dinámicas con variables personalizadas.

### 📚 5. Documentación Interactiva con Swagger
- **OpenAPI 3.0**: Interfaz visual para probar y validar todos los endpoints directamente desde el navegador con autenticación por API Key.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
| :--- | :--- |
| **Backend** | NestJS 11, TypeScript, Express, Socket.IO, TypeORM |
| **Frontend / Dashboard** | React 19, TypeScript, Vite 8, TanStack Query, Lucide Icons |
| **Base de Datos** | SQLite / PostgreSQL |
| **WhatsApp Engine** | WhatsApp-Web.js / Baileys |
| **Documentación** | Swagger / OpenAPI 3.0 |

---

## 🚀 Guía de Instalación y Uso Rápido

### Prerrequisitos
- **Node.js**: `>= 22.13.0` (o Node 24)
- **npm**: `>= 10.0.0`

### 1. Clonar el Repositorio
```bash
git clone https://github.com/DarwinJava2025/Sistema-wa-wifi-solution.git
cd Sistema-wa-wifi-solution
```

### 2. Configurar Variables de Entorno
Copia el archivo de ejemplo a `.env`:
```bash
# En Windows (PowerShell)
Copy-Item .env.minimal .env

# En Linux / macOS / Bash
cp .env.minimal .env
```

Edita `.env` para ajustar la clave maestra y parámetros si es necesario:
```env
PORT=2785
NODE_ENV=development
DATABASE_TYPE=sqlite
DATABASE_NAME=./data/openwa.sqlite
API_MASTER_KEY=tu-clave-secreta-aqui
```

### 3. Instalar Dependencias
```bash
npm install
```
*(Este comando instala automáticamente las dependencias del backend, los parches de los motores y las dependencias del dashboard).*

### 4. Compilar el Proyecto
```bash
npm run build
```

### 5. Iniciar el Sistema en Desarrollo
```bash
npm run dev
```

---

## 🌐 URLs del Sistema

Una vez iniciado el servidor:

| Servicio | URL | Descripción |
| :--- | :--- | :--- |
| 📊 **Dashboard Administrativo** | [http://localhost:2886](http://localhost:2886) | Panel visual de control y login |
| ⚡ **Backend API & Health** | [http://localhost:2785/api/health](http://localhost:2785/api/health) | Estado del servidor |
| 📚 **Swagger API Docs** | [http://localhost:2785/api/docs](http://localhost:2785/api/docs) | Documentación interactiva de la API |

---

## 🔐 Autenticación en la API

Todas las peticiones a la API protegida requieren enviar el header HTTP con la API Key configurada:

```http
X-API-Key: tu-api-key-aqui
```

Ejemplo con `cURL`:
```bash
curl -X GET "http://localhost:2785/api/sessions" \
  -H "X-API-Key: tu-api-key-aqui"
```

---

## 📈 Arquitectura del Sistema

```text
┌─────────────────────────────────────────────────────────────┐
│                    SISTEMA WA WIFI SOLUTION                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────┐             ┌───────────────────────┐
│   Dashboard Web UI    │             │   Agentes IA & CRM    │
│     (Vite + React)    │             │    (Externos / LLM)   │
└───────────┬───────────┘             └───────────┬───────────┘
            │                                     │
            │ HTTP / WebSockets                   │ REST API / Webhooks
            ▼                                     ▼
┌─────────────────────────────────────────────────────────────┐
│              NestJS API Gateway (Puerto: 2785)              │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │   Auth & Security     │       │   Session Management  │  │
│  └───────────────────────┘       └───────────────────────┘  │
│  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │   Automation & IA     │       │   Webhooks Dispatcher │  │
│  └───────────────────────┘       └───────────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Motor WhatsApp (Multi-Session)               │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       RED DE WHATSAPP                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📄 Licencia

Este proyecto está licenciado bajo los términos de la licencia MIT.
