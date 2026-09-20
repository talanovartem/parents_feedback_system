import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

function localJsonApiPlugin(): Plugin {
  const dataDir = path.resolve(__dirname, 'data');
  const dbPath = path.resolve(dataDir, 'database.json');
  const defaultDbPath = path.resolve(dataDir, 'database.default.json');
  const backupsDir = path.resolve(dataDir, 'backups');

  // Якщо database.json немає, але є дефолтний
  if (!fs.existsSync(dbPath) && fs.existsSync(defaultDbPath)) {
    try {
      fs.copyFileSync(defaultDbPath, dbPath);
    } catch {
      // ігноруємо
    }
  }

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

                // Створюємо бекапи перед збереженням
                if (!fs.existsSync(backupsDir)) {
                  fs.mkdirSync(backupsDir, { recursive: true });
                }

                if (fs.existsSync(dbPath) && fs.statSync(dbPath).size > 0) {
                  // .bak копія
                  fs.copyFileSync(dbPath, dbPath + '.bak');
                  // щоденний архів
                  const dateStr = new Date().toISOString().slice(0, 10);
                  const todayBackup = path.resolve(backupsDir, `backup_${dateStr}.json`);
                  if (!fs.existsSync(todayBackup)) {
                    fs.copyFileSync(dbPath, todayBackup);
                  }
                }

                // Атомарний запис
                const formatted = JSON.stringify(parsed, null, 2);
                const tempPath = `${dbPath}.tmp.${Date.now()}`;
                fs.writeFileSync(tempPath, formatted, 'utf-8');
                fs.renameSync(tempPath, dbPath);

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
