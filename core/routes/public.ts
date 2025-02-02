import { Router } from '../router';
import type { RouterContext } from '../types';
import { promises as fs } from 'fs';
import { extname, join } from 'path';

const mimeTypes: Record<string, string> = {
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.html': 'text/html',
  '.txt': 'text/plain',
  '.wasm': 'application/wasm',
};

const router = Router.getInstance();

router.get('/public/{file}', async ({ res, params }: RouterContext) => {
  const filePath = join(process.cwd(), 'public', params['file'] || '');

  try {
    if (!filePath.startsWith(join(process.cwd(), 'public'))) {
      return res.writeHead(403).end('Forbidden');
    }

    await fs.access(filePath);

    const file = await fs.readFile(filePath);

    const ext = extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    console.log(ext, 'the ext');

    return res
      .writeHead(200, {
        'Content-Type': contentType,
        ...(ext === '.js' || ext === '.jsx' || ext === '.ts' || ext === '.tsx'
          ? { 'Content-Type': 'text/javascript' }
          : {}),
        'Cache-Control': 'public, max-age=3600',
      })
      .end(file);
  } catch (error) {
    return res.writeHead(404).end('File not found');
  }
});
