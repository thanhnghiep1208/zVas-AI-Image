import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { registerApiRoutes } from './server/routes/index';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  const isProd = process.env.NODE_ENV === 'production';
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              // 'unsafe-inline' required for Vite module preload injections; tighten with hashes if needed
              scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.googletagmanager.com'],
              scriptSrcElem: ["'self'", "'unsafe-inline'", 'https://www.googletagmanager.com'],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              styleSrcElem: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
              connectSrc: [
                "'self'",
                'https://*.googleapis.com',
                'https://*.google.com',
                'https://www.googletagmanager.com',
                'https://www.google-analytics.com',
                'https://analytics.google.com',
                'https://api.openai.com',
                'https://*.bytepluses.com',
                'https://api.seedance.com',
              ],
              fontSrc: ["'self'", 'data:', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
              frameSrc: ["'none'"],
              objectSrc: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
            },
          }
        : false,
    })
  );

  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
  if (isProd && !allowedOriginsEnv) {
    console.warn(
      '[WARN] ALLOWED_ORIGINS is not set — all cross-origin requests are blocked in production. ' +
        'Set ALLOWED_ORIGINS=https://your-domain.com to allow browser clients.'
    );
  }
  app.use(
    cors({
      origin: allowedOriginsEnv
        ? (origin, cb) => {
            const list = allowedOriginsEnv.split(',').map((o) => o.trim());
            cb(null, !origin || list.includes(origin));
          }
        : isProd
          ? false
          : true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    const entityErr = err as { type?: string };
    if (entityErr?.type === 'entity.too.large') {
      return res.status(413).json({
        error: 'Request payload too large. Please use a smaller image or compress before upload.',
      });
    }
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ error: 'Invalid JSON payload.' });
    }
    return next(err);
  });

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });

  registerApiRoutes(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          port: 24679,
          clientPort: 24679,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/*path', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  // Cloud Run sends SIGTERM and waits up to 10s before SIGKILL.
  // Stop accepting connections immediately, let in-flight requests finish.
  const shutdown = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 8000).unref();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
