import { config } from '../config';
import type { CorsOptions } from '../types/cors';
import { BaseMiddleware, middlewareStack } from './Middleware';

class CorsMiddleware extends BaseMiddleware {
  private options: CorsOptions;

  constructor() {
    super();
    const corsConfig = config.get('cors');
    if (!corsConfig) {
      throw new Error('CORS configuration is missing');
    }
    this.options = {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: false,
      exposedHeaders: [],
      maxAge: 86400,
      ...corsConfig,
    };
  }

  private isOriginAllowed(requestOrigin: string): boolean {
    const { origin } = this.options;
    if (origin === '*' || origin === true) return true;
    if (origin === false) return false;
    if (Array.isArray(origin)) return origin.includes(requestOrigin);
    return origin === requestOrigin;
  }

  private setCorsHeaders(
    response: Response,
    requestOrigin: string | null
  ): void {
    if (!requestOrigin) return;

    if (this.isOriginAllowed(requestOrigin)) {
      response.headers.set('Access-Control-Allow-Origin', requestOrigin);
    } else {
      console.debug(`Origin "${requestOrigin}" is not allowed`);
      return;
    }

    if (this.options.credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    if (this.options.exposedHeaders?.length) {
      response.headers.set(
        'Access-Control-Expose-Headers',
        this.options.exposedHeaders.join(', ')
      );
    }

    if (response.status === 204) {
      response.headers.set(
        'Access-Control-Allow-Methods',
        this.options.methods?.join(', ') || ''
      );
      response.headers.set(
        'Access-Control-Allow-Headers',
        this.options.allowedHeaders?.join(', ') || ''
      );
      if (this.options.maxAge) {
        response.headers.set(
          'Access-Control-Max-Age',
          this.options.maxAge.toString()
        );
      }
    }
  }

  async handle(req: Request, next: () => Promise<Response>): Promise<Response> {
    const requestOrigin = req.headers.get('origin');

    if (req.method === 'OPTIONS') {
      const response = new Response(null, { status: 204 });
      this.setCorsHeaders(response, requestOrigin);
      return response;
    }

    const response = await next();
    const newResponse = new Response(response.body, response);
    this.setCorsHeaders(newResponse, requestOrigin);
    return newResponse;
  }
}

middlewareStack.register('cors', new CorsMiddleware());
