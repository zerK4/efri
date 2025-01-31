import type { MiddlewareHandler } from '@/types';
import type { ICorePlugin } from '@/types/plugin';
import { promises as fs } from 'fs';
import path from 'path';

class StaticFileMiddleware implements MiddlewareHandler {
  private static publicDir = path.resolve(process.cwd(), 'public');

  async handle(req: Request, next: () => Promise<Response>): Promise<Response> {
    const url = new URL(req.url);
    const filePath = path.join(StaticFileMiddleware.publicDir, url.pathname);
    console.log(next, 'the next');
    // Prevent directory traversal attacks
    if (!filePath.startsWith(StaticFileMiddleware.publicDir)) {
      return next();
    }

    try {
      // Check if file exists and is not a directory
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        return next();
      }

      // Read file contents
      const file = await fs.readFile(filePath);

      // Determine MIME type based on file extension
      const ext = path.extname(filePath).toLowerCase();
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

      const contentType = mimeTypes[ext] || 'application/octet-stream';

      return new Response(file, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600', // Optional caching
        },
      });
    } catch (error) {
      // File not found, continue to next middleware/route
      return await next();
    }
  }
}

export const staticFilePlugin: ICorePlugin = {
  type: 'route-plugin',
  name: 'static-files',
  routes: [
    {
      method: 'GET',
      path: '/public/',
      file: './src/middlewares/StaticFilesMiddleware.ts',
    },
  ],
};

export default StaticFileMiddleware;
