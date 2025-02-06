import { promises as fs } from 'fs';
import path, { extname, join } from 'path';
import { config } from '../config';
import type { RouterContext } from '../types';

const app = config.get('app');

export class PublicRouteController {
  protected mimeTypes: Record<string, string> = {
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
  async handle({
    req,
    res,
    params,
  }: RouterContext<{
    params: { file: string };
  }>) {
    const basePath =
      process.env.NODE_ENV === 'production' ||
      (app && app['env'] === 'production')
        ? 'dist/public'
        : 'public';

    const filePath = path.resolve(process.cwd(), basePath, params.file);

    try {
      if (!filePath.startsWith(join(process.cwd(), basePath))) {
        return res.writeHead(403).end('Forbidden');
      }

      await fs.access(filePath);
      const file = await fs.readFile(filePath);

      const ext = extname(filePath).toLowerCase();
      const contentType = this.mimeTypes[ext] || 'application/octet-stream';

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
  }
}
