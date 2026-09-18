# 🌀 Cosmic (Vortex Clone) — Bot de Moderación, AutoMod & Web Dashboard

<div align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x%20%7C%207.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?logo=discord&logoColor=white)](https://discord.js.org/)
[![Sapphire](https://img.shields.io/badge/Sapphire_Framework-v5-2563eb)](https://www.sapphirejs.dev/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB_Atlas-Cloud_M0-47A248?logo=mongodb&logoColor=white)](https://cloud.mongodb.com/)
[![pnpm](https://img.shields.io/badge/Package_Manager-pnpm-f69220?logo=pnpm&logoColor=white)](https://pnpm.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Recreación moderna, ligera y de alto rendimiento del legendario bot de seguridad [jagrosh/Vortex](https://github.com/jagrosh/Vortex).**
Reescrito enteramente en **TypeScript** con **Sapphire Framework v5** sobre **Discord.js v14**, conectado a **MongoDB Atlas en la nube** y equipado con un **Dashboard Web completo con inicio de sesión de Discord OAuth2**.

[Características](#-características-principales) • [Web Dashboard](#-cosmic-web-dashboard) • [Comandos](#-comandos-disponibles) • [Instalación](#-requisitos-e-instalación) • [Configuración Discord](#-configuración-en-discord-developer-portal) • [Estructura](#-estructura-del-proyecto)

</div>



## ✨ Características Principales

### 💎 Arquitectura Empresarial con Sapphire Framework
* **Estructura Modular Desacoplada**: Desarrollado sobre `@sapphire/framework` y `@sapphire/pieces`, el estándar oficial y moderno para bots en Discord.js.
* **Comandos Híbridos Nativos**: Todos los comandos pueden ejecutarse tanto como **Slash Commands** (`/`) como con el **prefijo textual** (`>>` o configurado por servidor).
* **Inyección de Dependencias vía `container`**: Acceso fuertemente tipado en cualquier pieza a la base de datos (`container.db`), sistema de logs (`container.modLogger`, `container.guildLogger`), AutoMod (`container.autoMod`), Anti-Raid (`container.antiRaid`) y tareas periódicas (`container.scheduler`).
* **Prefijo Dinámico en Tiempo Real**: Resolución instantánea del prefijo de cada servidor mediante `fetchPrefix` y caché sincronizada en memoria (0ms de latencia).

### 🌐 Cosmic Web Dashboard Integrado
* **Autenticación Discord OAuth2**: Inicio de sesión seguro con Discord (`identify`, `guilds`) mediante cookies HTTP-only firmadas con JWT.
* **Selector Inteligente de Servidores**: Detecta automáticamente los servidores donde eres Administrador o tienes permiso para gestionar (`MANAGE_GUILD`), mostrando si el bot ya está activo o proporcionando un enlace directo de invitación.
* **Panel de Control 100% Web**: Configura prefijos, canales de logs, reglas de AutoMod, filtros de palabras, lista blanca de invitaciones y escala de castigos sin necesidad de memorizar comandos de texto.
* **Buscador y Editor de Casos**: Consulta el historial de sanciones con paginación, filtros por tipo de castigo y modifica los motivos (`/reason`) en vivo.
* **Modo Demo Desarrollador**: Posibilidad de probar y previsualizar la interfaz web al instante sin necesidad de registrar credenciales OAuth2 de inmediato.

### ☁️ Base de Datos en la Nube (MongoDB Atlas)
* **100% Cloud / Cero Archivos Locales**: Conexión a MongoDB Atlas mediante Mongoose compatible con el plan permanente gratuito **M0 Sandbox**.
* **Caché en Memoria Ultrarrápida (0ms)**: El bot almacena en caché la configuración del servidor (`GuildConfig`) para que las comprobaciones de AutoMod en cada mensaje no dependan de la latencia de red.
* **Resiliencia y Modo Offline**: Si la base de datos pierde conectividad temporalmente, el bot no se congela ni crashea; comandos como `>>help` o `>>ping` responden de inmediato utilizando valores seguros en memoria.
* **Contador Atómico de Casos (`Counter`)**: Generación correlativa y segura de números de caso (`#1, #2, #3...`) por servidor.

### 🛡️ Motor de AutoModeración (AutoMod)
* **Anti-Invitaciones (`AntiInvite`)**: Bloquea y elimina enlaces de invitación a otros servidores de Discord, detectando técnicas de evasión (`discord(dot)gg`, espacios, barras oblicuas) y lista blanca de excepciones.
* **Anti-Spam de Duplicados (`AntiDuplicate`)**: Caché LRU que detecta repeticiones consecutivas del mismo mensaje por parte de un usuario, aplicando borrado automático y strikes configurables.
* **Anti-Copypasta (`AntiCopypasta`)**: Detección de cadenas repetitivas masivas o bloques de texto spam.
* **Anti-Mención / Anti-Everyone (`AntiEveryone`, `AntiMention`)**: Bloquea menciones indebidas a `@everyone` o `@here` y restringe el número máximo de menciones permitidas por mensaje.
* **Límite de Saltos de Línea (`MaxLines`)**: Previene mensajes que inundan el chat verticalmente con saltos de línea excesivos.
* **Anti-Referidos (`AntiReferral`)**: Filtra enlaces de afiliados, URLs de referidos y dominios sospechosos.
* **Auto-Dehoist (`AutoDehoist`)**: Renombra automáticamente a usuarios que alteran el orden alfabético de la lista de miembros usando caracteres iniciales como `!`, `*`, `#`, etc.
* **Detección Anti-Raid (`AntiRaid`)**: Monitorea la tasa de unión de nuevos miembros (ej. `N` uniones en `T` segundos). Si detecta un raid masivo, activa el modo de aislamiento automáticamente y eleva el nivel de verificación del servidor.
* **Filtros Personalizados (`Filter`)**: Soporta listas de palabras prohibidas y expresiones regulares (Regex) con asignación de strikes por infracción.

### ⚖️ Sistema de Strikes y Escalado Automático
* **Acumulación Progresiva de Infracciones**: Cada violación de automod o sanción manual acumula strikes en el perfil del usuario.
* **Tabla de Escalado Automático (`Punishment`)**: Reglas configurables como:
  * 1 Strike ➔ Advertencia (`WARN`)
  * 2 Strikes ➔ Silencio temporal de 1 hora (`TEMPMUTE`)
  * 3 Strikes ➔ Expulsión (`KICK`)
  * 4 Strikes ➔ Baneo definitivo (`BAN`)
* **Planificador de Sanciones Temporales (`PunishmentScheduler`)**: Proceso en segundo plano que levanta automáticamente los baneos y silencios temporales al expirar su duración.

### 📋 Auditoría y Registros (Logs 360°)
* **Modlog**: Registro detallado de cada acción disciplinaria (`🔨` Ban, `🍌` Softban, `🔇` Mute, `🚩` Strike, `🗑️` Clean) con números de caso correlativos.
* **Caché de Mensajes (`MessageCache`)**: Mantiene en memoria los últimos 5.000 mensajes para auditar el contenido original cuando un mensaje es editado o eliminado.
* **Messagelog**: Registro de eliminaciones y modificaciones con comparativa *Antes / Después*.
* **Serverlog**: Registro de ingresos y salidas de miembros (con antigüedad de la cuenta).
* **Voicelog**: Registro de conexiones, desconexiones y cambios de canal de voz.



## 🌐 Cosmic Web Dashboard

El dashboard web permite administrar tu servidor de forma visual e intuitiva desde cualquier navegador:

```
http://localhost:3000
```

### Pestañas del Panel de Control:
1. **📊 Resumen (Overview)**: Estadísticas en tiempo real (casos totales, infracciones activas, estado de AutoMod, prefijo y conmutador rápido de Modo Raid).
2. **⚙️ General & Roles**: Cambio de prefijo textual, zona horaria, rol de moderador y rol de silencio (`Muted`) sincronizados con Discord.
3. **📜 Canales de Logs**: Selección mediante desplegables de canales de texto para Modlog, Messagelog, Serverlog y canal de voz para Voicelog.
4. **🛡️ AutoMod Suite**: Activación de filtros, umbrales de spam, límites de menciones/líneas, gestor de lista blanca de invitaciones y editor de filtros Regex.
5. **⚖️ Sanciones (Escalera de Castigos)**: Visualización y configuración de la relación de strikes ➔ acción (Advertencia, Silencio temporal, Expulsión, Baneo).
6. **🔨 Casos de Moderación**: Tabla completa con buscador por usuario o caso, filtro por tipo de castigo y modal para editar motivos de casos en vivo.
7. **⚡ Gestión de Strikes**: Listado de miembros con infracciones activas con posibilidad de aplicar strikes o indultar (`pardon`) con un solo clic.



## 💻 Comandos Disponibles

Todos los comandos se pueden ejecutar tanto con **Slash Commands** (`/`) como con el **prefijo textual** (`>>` o el configurado en tu servidor):

| Categoría | Comando | Descripción | Permisos Requeridos |
| : | : | : | : |
| **Moderación** | `/ban <usuario> [tiempo] [motivo]` | Banea a un usuario (soporta tiempo temporal como `1h`, `1d`). | Ban Members |
| | `/unban <id_usuario> [motivo]` | Desbanea a un usuario por su ID de Discord. | Ban Members |
| | `/softban <usuario> [motivo]` | Banea y desbanea de inmediato para purgar mensajes del último día. | Ban Members |
| | `/kick <usuario> [motivo]` | Expulsa a un miembro del servidor. | Kick Members |
| | `/mute <usuario> [tiempo] [motivo]` | Silencia a un miembro (Timeout nativo de Discord o rol Muted). | Moderate Members |
| | `/unmute <usuario> [motivo]` | Quita el silencio a un miembro. | Moderate Members |
| | `/strike <usuario> [cantidad] [motivo]` | Aplica strikes y dispara la sanción escalada configurada. | Rol de Moderador |
| | `/pardon <usuario> [cantidad] [motivo]` | Reduce o perdona strikes a un miembro. | Rol de Moderador |
| | `/clean <cantidad> [filtro] [usuario]` | Purga masiva de mensajes con filtros (`all`, `bots`, `links`). | Manage Messages |
| | `/check <usuario>` | Muestra historial de sanciones, strikes acumulados y antigüedad. | Rol de Moderador |
| | `/reason <caso> <nuevo_motivo>` | Modifica el motivo de un caso existente en la base de datos y logs. | Rol de Moderador |
| | `/slowmode <tiempo>` | Ajusta el modo lento de un canal (ej. `5s`, `1m`, `0` para apagar). | Manage Channels |
| | `/raid <on\|off>` | Activa o desactiva manualmente el modo Anti-Raid / Lockdown. | Administrator |
| **AutoMod** | `/antiinvite <off\|del\|1\|2\|3>` | Configura el filtro de invitaciones de Discord. | Manage Guild |
| | `/maxmentions <límite>` | Límite de menciones permitidas por mensaje. | Manage Guild |
| | `/maxlines <límite>` | Límite de saltos de línea por mensaje. | Manage Guild |
| | `/autodehoist <carácter\|off>` | Activa o desactiva el renombrado automático dehoist. | Manage Guild |
| | `/autoraidmode <uniones> [segundos]` | Umbral de miembros y tiempo para activar auto-raidmode. | Administrator |
| | `/filter <add\|remove\|list>` | Administra palabras y expresiones regulares prohibidas. | Manage Guild |
| | `/whitelist <add\|remove\|list>` | Administra códigos o servidores permitidos en el anti-invite. | Manage Guild |
| **Configuración**| `/setup` | Asistente interactivo para configurar canales de logs y roles. | Administrator |
| | `/settings` | Muestra un panel con toda la configuración del servidor. | Manage Guild |
| | `/punishment <set\|remove\|list>` | Configura la tabla de escalado automático de sanciones por strikes. | Administrator |
| | `/prefix [nuevo_prefijo]` | Cambia el prefijo textual del servidor (por defecto `>>`). | Manage Guild |
| **General** | `/ping` | Muestra la latencia del bot y de la API WebSocket. | Todos |
| | `/about` | Información del bot, estadísticas, framework y versión. | Todos |
| | `/help` | Guía interactiva de comandos disponibles. | Todos |



## 🚀 Requisitos e Instalación

### Requisitos Previos
* **Node.js**: v20 o superior (recomendado v22+)
* **pnpm**: v9+ (o v12+)
* **Cuenta en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)** (plan gratuito permanente M0 disponible)
* **Aplicación en [Discord Developer Portal](https://discord.com/developers/applications)**



### 1. Clonar el repositorio
```bash
git clone https://github.com/Zer0Dev-exe/VortexClone.git
cd VortexClone
```

### 2. Instalar dependencias con pnpm
```bash
pnpm install
```

### 3. Configuración de Variables de Entorno
Copia la plantilla `.env.example` a un nuevo archivo `.env`:
```bash
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales:
```env
# Discord Bot Credentials
DISCORD_TOKEN=tu_token_de_discord_aqui
CLIENT_ID=tu_client_id_aqui
CLIENT_SECRET=tu_client_secret_aqui

# MongoDB Atlas Connection URI
MONGODB_URI=mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/vortex?retryWrites=true&w=majority

# Bot Defaults
DEFAULT_PREFIX=>>
DEV_GUILD_ID=

# Cosmic Web Dashboard
DASHBOARD_PORT=3000
DASHBOARD_URL=http://localhost:3000
SESSION_SECRET=clave_secreta_super_segura_de_32_caracteres
```



## 🔧 Configuración en Discord Developer Portal

Para que Cosmic funcione correctamente con todos los comandos y el dashboard web:

1. Ve a [Discord Developer Portal](https://discord.com/developers/applications) y selecciona tu aplicación.
2. En la pestaña **Bot**:
   * Desplázate hasta **Privileged Gateway Intents** y activa:
     * ✅ **Server Members Intent** (Necesario para Anti-Raid, Dehoist y Serverlog)
     * ✅ **Message Content Intent** (Necesario para AutoMod y comandos con prefijo `>>`)
3. En la pestaña **OAuth2**:
   * En **Redirects**, añade la URL de retorno del dashboard:
     ```
     http://localhost:3000/auth/callback
     ```
   * En **General**, haz clic en **Reset Secret** para obtener tu `CLIENT_SECRET` y colócalo en el archivo `.env`.
4. En **OAuth2 -> URL Generator**:
   * Scopes: `bot`, `applications.commands`
   * Bot Permissions: `Administrator` (o `Manage Roles`, `Manage Channels`, `Kick Members`, `Ban Members`, `Moderate Members`, `Manage Messages`, `View Audit Log`, `Send Messages`, `Embed Links`).



## 🏃 Ejecución

### Registro de Comandos de Barra Diagonal (Slash Commands)
Antes de iniciar por primera vez o tras añadir nuevos comandos, despliega los comandos en Discord:
```bash
pnpm run deploy-commands
```

### Modo Desarrollo (con recarga rápida)
```bash
pnpm run dev
```

### Modo Producción
```bash
pnpm run build
pnpm start
```

### Ejecutar Suite de Pruebas Unitarias
```bash
pnpm test
```

Una vez iniciado el bot:
* El cliente de Discord se conectará a la Gateway (`✅ [Vortex] Conectado como Cosmic#3912!`).
* El servidor web del dashboard estará accesible en: `http://localhost:3000`.



## 📂 Estructura del Proyecto

```
VortexClone/
├── src/
│   ├── commands/              # Comandos híbridos de Sapphire (Slash + Prefijo)
│   │   ├── automod/           # antiinvite, autodehoist, autoraidmode, filter, maxlines, etc.
│   │   ├── general/           # about, help, ping
│   │   ├── moderation/        # ban, unban, kick, mute, strike, pardon, clean, check, etc.
│   │   └── settings/          # prefix, punishment, settings, setup
│   ├── listeners/             # Eventos desacoplados de Sapphire Framework
│   │   ├── client/            # ready
│   │   ├── guild/             # guildMemberAdd, guildMemberRemove, guildMemberUpdate
│   │   ├── messages/          # messageCreate, messageDelete, messageUpdate
│   │   └── voice/             # voiceStateUpdate
│   ├── dashboard/             # Servidor Web & Panel de Control
│   │   ├── routes/
│   │   │   ├── auth.ts        # Discord OAuth2 (login, callback, logout, me)
│   │   │   └── api.ts         # REST API para servidores, canales, roles, automod, casos
│   │   ├── public/            # Frontend Web (Vanilla CSS & JS, sin frameworks pesados)
│   │   │   ├── styles/main.css # Sistema de diseño Cosmic Glassmorphism
│   │   │   ├── js/api.js      # Cliente API
│   │   │   ├── js/app.js      # Controlador SPA, modales y renderizado reactivo
│   │   │   ├── index.html     # Landing page pública con métricas en vivo
│   │   │   └── dashboard.html # Panel de control de servidores y configuración
│   │   └── server.ts          # Servidor Express integrado
│   ├── database/              # Conexión resiliente a MongoDB Atlas
│   │   ├── models/            # Mongoose Schemas (GuildConfig, ModCase, Strike, Counter, etc.)
│   │   └── Database.ts        # Lógica de base de datos con caché en memoria (0ms)
│   ├── automod/               # Motores de seguridad
│   │   ├── filters/           # AntiInvite, AntiSpam, AntiEveryone, Regex, etc.
│   │   ├── AntiRaid.ts        # Detección de oleadas y modo aislamiento
│   │   └── AutoMod.ts         # Orquestador de análisis de mensajes
│   ├── logging/               # Módulos de registro y auditoría
│   │   ├── ModLogger.ts       # Registro de sanciones con números de caso
│   │   ├── GuildLogger.ts     # Registro de mensajes, miembros y voz
│   │   └── MessageCache.ts    # Caché circular en memoria para auditoría de borrados
│   ├── scheduler/             # Planificador de sanciones temporales en segundo plano
│   ├── types/                 # Tipos TypeScript y Module Augmentation de Sapphire
│   ├── config.ts              # Validación de variables de entorno con Zod
│   ├── deploy-commands.ts     # Script de sincronización de Slash Commands
│   └── index.ts               # Punto de entrada principal
├── tests/                     # Suite de pruebas automatizadas con Vitest
├── package.json
└── tsconfig.json
```



## 📜 Licencia

Este proyecto está distribuido bajo la licencia **MIT**. Consulta el archivo `LICENSE` para más información.

Inspirado en el trabajo original de [John Grosh (jagrosh)](https://github.com/jagrosh/Vortex). Reimplementación moderna en TypeScript por [Zer0Dev-exe](https://github.com/Zer0Dev-exe).
