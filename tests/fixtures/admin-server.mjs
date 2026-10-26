import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(directory, '../..');
export async function startAdminFixtureServer(port = 0) {
    const server = http.createServer((request, response) => {
        const pathname = new URL(request.url, 'http://localhost').pathname;
        response.setHeader('Cache-Control', 'no-store');
        if (pathname === '/firebase-config.js' || pathname === '/fixture-sdk.js') {
            response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
            if (pathname === '/fixture-sdk.js') return response.end("export * from '/firebase-config.js';");
            return response.end(fs.readFileSync(path.join(directory, 'admin-firebase.js')));
        }
        const relative = pathname === '/' ? 'admin.html' : pathname.slice(1);
        if (relative !== 'admin.html' && !relative.startsWith('assets/')) {
            response.writeHead(404); return response.end();
        }
        const file = path.resolve(root, relative);
        if (!file.startsWith(root + path.sep)) { response.writeHead(403); return response.end(); }
        try {
            let content = fs.readFileSync(file);
            // Replace EVERY Firebase SDK entry before the browser executes the page.
            if (relative === 'admin.html' || relative.endsWith('.js')) {
                content = content.toString().replace(/https:\/\/www\.gstatic\.com\/firebasejs\/[^"'\s]+/g, '/fixture-sdk.js');
            }
            response.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' })[path.extname(file)] || 'application/octet-stream');
            response.end(content);
        } catch { response.writeHead(404); response.end(); }
    });
    await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
    return { server, url: `http://127.0.0.1:${server.address().port}` };
}
