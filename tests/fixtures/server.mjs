import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The real Firebase module is replaced before any application code executes.
// No Firebase SDK, authentication, or production network request is needed.
const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../..');
export async function startFixtureServer(port = 0) {
    const server = http.createServer((request, response) => {
        const pathname = new URL(request.url, 'http://localhost').pathname;
        response.setHeader('Cache-Control', 'no-store');
        if (pathname === '/firebase-config.js') {
            response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
            return response.end(fs.readFileSync(path.join(directory, 'firebase.js')));
        }
        const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
        if (relative !== 'index.html' && !relative.startsWith('assets/')) {
            response.writeHead(404); return response.end();
        }
        const file = path.resolve(root, relative);
        if (!file.startsWith(root + path.sep)) { response.writeHead(403); return response.end(); }
        try {
            const content = fs.readFileSync(file);
            response.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' })[path.extname(file)] || 'application/octet-stream');
            response.end(content);
        } catch { response.writeHead(404); response.end(); }
    });
    await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
    return { server, url: `http://127.0.0.1:${server.address().port}` };
}
