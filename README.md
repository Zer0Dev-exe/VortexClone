# 🌀 Vortex Clone (TypeScript & Sapphire Framework + MongoDB Atlas)

Recreación moderna, ligera y de alto rendimiento del conocido bot de moderación y seguridad **[Vortex](https://github.com/jagrosh/Vortex)** de John Grosh (jagrosh). Reescrito enteramente en **TypeScript** con **Sapphire Framework v5** sobre **Discord.js v14**, utilizando **MongoDB Atlas en la nube** (vía Mongoose), eliminando por completo la necesidad de Java, archivos SQLite locales y la complejidad de sharding innecesaria. Gestionado 100% con **pnpm**.

## ✨ Características Principales

### 💎 Arquitectura Modular con Sapphire Framework
* **Estructura Empresarial**: Construido sobre `@sapphire/framework` y `@sapphire/pieces`, el framework modular estándar de la comunidad de Discord.js.
* **Comandos Híbridos Nativos**: Cada comando soporta tanto interacción de barra diagonal (`/`) como prefijo clásico de texto (`>>` o configurado por servidor).
* **Inyección de Dependencias vía `container`**: Acceso fuertemente tipado en cualquier parte del bot a la base de datos (`container.db`), sistema de logs (`container.modLogger`, `container.guildLogger`), AutoMod (`container.autoMod`), Anti-Raid (`container.antiRaid`) y tareas periódicas (`container.scheduler`).
* **Listeners Desacoplados**: Gestión de eventos de Discord (`messageCreate`, `guildMemberAdd`, `voiceStateUpdate`, etc.) mediante piezas independientes en `src/listeners/`.
* **Prefijo Dinámico por Servidor**: Resolución en tiempo real del prefijo personalizado de cada servidor mediante `fetchPrefix` y caché en memoria.

### ☁️ Base de Datos en la Nube (MongoDB Atlas)
* **100% Cloud / Sin archivos locales**: Conexión resiliente a MongoDB Atlas mediante Mongoose compatible con el plan gratuito permanente **M0 Sandbox**.
* **Caché en Memoria Ultrarrápida (0ms)**: El bot almacena en caché la configuración del servidor (`GuildConfig`) en memoria para que las comprobaciones de AutoMod en cada mensaje no dependan de la latencia de red.
* **Resiliencia y Modo Offline**: Si la base de datos no está disponible temporalmente, el bot no se bloquea ni crashea; comandos como `>>help` o `>>ping` responden al instante con valores en memoria.
* **Contador Atómico de Casos (`Counter`)**: Generación correlativa y segura de números de caso (`#1, #2, #3...`) por servidor.

### 🛡️ Motor de AutoModeración (AutoMod)
* **Anti-Invitaciones (`AntiInvite`)**: Bloquea y elimina enlaces de invitación a otros servidores de Discord, detectando técnicas de evasión (`discord(dot)gg`, espacios entre caracteres y barras) y admitiendo lista blanca de invitaciones permitidas.
* **Anti-Spam de Duplicados (`AntiDuplicate`)**: Caché LRU que detecta repeticiones consecutivas o spam del mismo mensaje por parte de un usuario, aplicando advertencias temporales o strikes configurables.
* **Anti-Copypasta (`AntiCopypasta`)**: Detección de cadenas repetitivas masivas o bloques de texto spam.
* **Anti-Mención / Anti-Everyone (`AntiEveryone`, `AntiMention`)**: Bloquea menciones indebidas a `@everyone` o `@here` de usuarios sin permisos y restringe el número máximo de menciones por mensaje.
* **Límite de Saltos de Línea (`MaxLines`)**: Previene mensajes que inundan el chat verticalmente con saltos de línea excesivos.
* **Anti-Referidos (`AntiReferral`)**: Filtra enlaces de afiliados, URLs de referidos o dominios sospechosos.
* **Auto-Dehoist (`AutoDehoist`)**: Renombra automáticamente a usuarios que alteran el orden alfabético de la lista de miembros usando caracteres iniciales como `!`, `*`, `#`, etc.
* **Detección Anti-Raid (`AntiRaid`)**: Monitorea la tasa de unión de nuevos miembros (ej. `N` uniones en `T` segundos). Si detecta un raid masivo, activa el modo de bloqueo / aislamiento automáticamente y eleva el nivel de verificación del servidor.
* **Filtros Personalizados (`Filter`)**: Soporta listas de palabras prohibidas y expresiones regulares (Regex).

### ⚖️ Sistema de Strikes y Escalado Automático
* **Acumulación de Infracciones**: Cada violación de automod o infracción manual suma strikes al usuario infractor.
* **Tabla de Escalado Automático (`Punishment`)**: Configura reglas progresivas como:
  * 1 Strike ➔ Advertencia (`WARN`)
  * 2 Strikes ➔ Silencio temporal de 1 hora (`TEMPMUTE`)
  * 3 Strikes ➔ Expulsión (`KICK`)
  * 4 Strikes ➔ Baneo (`BAN`)
* **Planificador de Sanciones Temporales (`PunishmentScheduler`)**: Proceso en segundo plano que levanta automáticamente los baneos y silencios temporales cuando vence su tiempo.

### 📋 Auditoría y Registros (Logs)
* **Modlog**: Registro detallado de cada acción disciplinaria con emojis (`🔨` Ban, `🍌` Softban, `🔇` Mute, `🚩` Strike, `🗑️` Clean) y números correlativos de caso por servidor.
* **Caché de Mensajes (`MessageCache`)**: Mantiene en memoria los últimos 5.000 mensajes para poder registrar el contenido original cuando un mensaje es editado o eliminado.
* **Messagelog**: Registro de eliminaciones y ediciones de mensajes con comparativa *Antes / Después*.
* **Serverlog**: Registro de ingresos y salidas de miembros (con antigüedad de la cuenta).
* **Voicelog**: Registro de conexiones, desconexiones y cambios de canal de voz.

## 💻 Comandos Disponibles

Todos los comandos se pueden ejecutar tanto mediante **Slash Commands** (`/`) como con el **prefijo textual** (`>>` o personalizado):

| Categoría | Comando | Descripción |
| :--- | :--- | :--- |
| **Moderación** | `/ban <usuario> [tiempo] [motivo]` | Banea a un usuario (soporta tiempo temporal como `1h`, `1d`). |
| | `/unban <id_usuario> [motivo]` | Desbanea a un usuario por su ID. |
| | `/softban <usuario> [motivo]` | Banea y desbanea de inmediato para purgar mensajes del último día. |
| | `/kick <usuario> [motivo]` | Expulsa a un miembro del servidor. |
| | `/mute <usuario> [tiempo] [motivo]` | Silencia a un miembro (Timeout nativo de Discord o rol Muted). |
| | `/unmute <usuario> [motivo]` | Quita el silencio a un miembro. |
| | `/strike <usuario> [cantidad] [motivo]` | Aplica strikes y dispara la sanción escalada configurada. |
| | `/pardon <usuario> [cantidad] [motivo]` | Reduce o perdona strikes a un miembro. |
| | `/clean <cantidad> [filtro] [usuario]` | Purga masiva de mensajes con filtros (`all`, `bots`, `links`). |
| | `/check <usuario>` | Muestra el historial de sanciones, strikes y antigüedad de un miembro. |
| | `/reason <caso> <nuevo_motivo>` | Modifica el motivo de un caso existente en la base de datos y logs. |
| | `/slowmode <tiempo>` | Ajusta el modo lento de un canal (ej. `5s`, `1m`, `0` para apagar). |
| | `/raid <on\|off>` | Activa o desactiva manualmente el modo Anti-Raid / Lockdown. |
| **AutoMod** | `/antiinvite <off\|del\|1\|2\|3>` | Configura el filtro de invitaciones de Discord. |
| | `/maxmentions <límite>` | Límite de menciones por mensaje. |
| | `/maxlines <límite>` | Límite de saltos de línea por mensaje. |
| | `/autodehoist <carácter\|off>` | Activa o desactiva el renombrado automático dehoist. |
| | `/autoraidmode <uniones> [segundos]` | Umbral de miembros y tiempo para activar auto-raidmode. |
| | `/filter <add\|remove\|list>` | Administra palabras y expresiones regulares prohibidas. |
| | `/whitelist <add\|remove\|list>` | Administra códigos o servidores permitidos en el anti-invite. |
| **Configuración**| `/setup` | Asistente interactivo para configurar canales de logs y roles. |
| | `/settings` | Muestra un panel con toda la configuración del servidor. |
| | `/punishment <set\|remove\|list>` | Configura la tabla de escalado automático de sanciones por strikes. |
| | `/prefix [nuevo_prefijo]` | Cambia el prefijo textual del servidor (por defecto `>>`). |
| **General** | `/ping` | Muestra la latencia del bot y de la API WebSocket. |
| | `/about` | Información del bot, estadísticas, framework y versión. |
| | `/help` | Guía completa interactiva de comandos disponibles. |

## 🚀 Requisitos e Instalación

### Requisitos
* **Node.js**: v20 o superior (recomendado v22+)
* **pnpm**: v9+ (o v12+)
* **Cuenta en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)** (plan gratuito permanente M0 disponible)

### 1. Configurar MongoDB Atlas
1. Crea un clúster gratuito (M0) en [MongoDB Atlas](https://cloud.mongodb.com/).
2. En **Database Access**, crea un usuario de base de datos con contraseña.
3. En **Network Access**, añade la IP `0.0.0.0/0` (Allow access from anywhere).
4. Ve a **Database** ➔ Pulsa **Connect** ➔ **Drivers** (Node.js) y copia tu cadena de conexión URI real (tendrá un formato similar a `mongodb+srv://<usuario>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`).

### 2. Instalar dependencias con pnpm
```bash
pnpm install
```

### 3. Configurar variables de entorno
Copia la plantilla `.env.example` a `.env`:
```bash
cp .env.example .env
```
Edita `.env` con tus credenciales:
```env
DISCORD_TOKEN=tu_token_de_discord_aqui
CLIENT_ID=tu_client_id_aqui
MONGODB_URI=mongodb+srv://usuario:password@tu-cluster.mongodb.net/vortex?retryWrites=true&w=majority
DEFAULT_PREFIX=>>

# Opcional: ID de tu servidor de pruebas para registro instantáneo de comandos
DEV_GUILD_ID=
```

> [!IMPORTANT]
> **Intents Privilegiados**: En el [Discord Developer Portal](https://discord.com/developers/applications), en la pestaña **Bot**, asegúrate de activar:
> - **Server Members Intent**
> - **Message Content Intent**

### 4. Iniciar el bot

* **Modo desarrollo (con TypeScript y recarga rápida):**
```bash
pnpm run dev
```

* **Modo producción:**
```bash
pnpm run build
pnpm start
```

### 5. Pruebas automatizadas
Ejecuta la suite de pruebas unitarias con Vitest:
```bash
pnpm test
```
