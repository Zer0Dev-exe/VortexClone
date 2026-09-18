import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import http from 'http';
import { config } from '../config.js';
import { authRouter } from './routes/auth.js';
import { apiRouter } from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPublicPath(): string {
  const localPublic = path.join(__dirname, 'public');
  if (fs.existsSync(localPublic)) {
    return localPublic;
  }
  const srcPublic = path.join(process.cwd(), 'src', 'dashboard', 'public');
  if (fs.existsSync(srcPublic)) {
    return srcPublic;
  }
  return localPublic;
}

export class DashboardServer {
  private app: express.Application;
  private server: http.Server | null = null;
  private port: number;

  constructor(port = config.dashboardPort) {
    this.port = port;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser(config.sessionSecret));

    // Path to public static assets
    const publicPath = getPublicPath();
    this.app.use(express.static(publicPath));
  }

  private setupRoutes(): void {
    // Mount Auth and API routers
    this.app.use('/auth', authRouter);
    this.app.use('/api', apiRouter);

    const publicPath = getPublicPath();

    // Route for Dashboard SPA
    this.app.get('/dashboard', (_req, res) => {
      res.sendFile(path.join(publicPath, 'dashboard.html'));
    });

    this.app.get('/dashboard/*', (_req, res) => {
      res.sendFile(path.join(publicPath, 'dashboard.html'));
    });

    // Fallback for root: landing page
    this.app.get('/', (_req, res) => {
      res.sendFile(path.join(publicPath, 'index.html'));
    });


    // Error handling middleware
    this.app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('[Dashboard Server Error]:', err);
      res.status(500).json({ error: 'Error interno del servidor web' });
    });
  }

  public start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`🌐 [Cosmic Dashboard] Servidor web activo en http://localhost:${this.port}`);
        console.log(`   🔗 URL de redirección OAuth2: ${config.dashboardUrl}/auth/callback\n`);
        resolve(this.port);
      });

      this.server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`⚠️ [Cosmic Dashboard] Puerto ${this.port} en uso. Intentando puerto ${this.port + 1}...`);
          this.port += 1;
          this.server?.close();
          this.start().then(resolve).catch(reject);
        } else {
          console.error('❌ [Cosmic Dashboard] Error al iniciar servidor:', err.message);
          reject(err);
        }
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }
}
