import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { env } from './src/server/config/env.ts';
import { logger } from './src/server/config/logger.ts';
import { createApiApp } from './src/server/app.ts';
import { errorHandler } from './src/server/middleware/errorHandler.ts';

async function startServer() {
  const app = createApiApp();

  if (!env.isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
          return next();
        }
        return res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  // Re-attach error handler after Vite middleware if needed
  app.use(errorHandler);

  app.listen(env.port, '0.0.0.0', () => {
    logger.info(
      { port: env.port, host: '0.0.0.0', mode: env.nodeEnv },
      'Amharic Lyrics API Platform listening'
    );
  });
}

startServer().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
