import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

function localJsonApiPlugin(): Plugin {
  const dbPath = path.resolve(__dirname, 'data/database.json');

  return {
    name: 'local-json-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/api/data') {
          if (req.method === 'GET') {
            try {
              if (fs.existsSync(dbPath)) {
                const data = fs.readFileSync(dbPath, 'utf-8');
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(data);
              } else {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'Database file not found' }));
              }
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                // Валідуємо валідність JSON перед записом
                const parsed = JSON.parse(body);
                fs.writeFileSync(dbPath, JSON.stringify(parsed, null, 2), 'utf-8');
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ success: true, timestamp: new Date().toISOString() }));
              } catch (err: any) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: 'Помилка збереження JSON: ' + err.message }));
              }
            });
            return;
          }
        }
        next();
      });
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), localJsonApiPlugin()],
  server: {
    port: 5173,
    host: true
  }
});
