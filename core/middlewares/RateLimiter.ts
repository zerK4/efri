import { config } from '../config';
import { logger } from '../logger';
import type { RequestWrapper } from '../router/RequestWrapper';
import { BaseMiddleware, middlewareStack } from './Middleware';

interface RateLimiterOptions {
  windowSizeInSeconds: number;
  maxRequests: number;
}

class RateLimiterMiddleware extends BaseMiddleware {
  private options: RateLimiterOptions;
  private requestCounts: Map<string, { count: number; resetTime: number }>;

  constructor() {
    super();
    const rateLimiterConfig = config.get('rateLimiter');
    this.options = {
      windowSizeInSeconds: 60,
      maxRequests: 100,
      ...rateLimiterConfig,
    };
    this.requestCounts = new Map();
  }

  private getClientIdentifier(req: RequestWrapper): string {
    return req.ip;
  }

  private isRateLimitExceeded(clientIdentifier: string): boolean {
    const now = Date.now();
    const clientData = this.requestCounts.get(clientIdentifier);

    if (!clientData || now >= clientData.resetTime) {
      this.requestCounts.set(clientIdentifier, {
        count: 1,
        resetTime: now + this.options.windowSizeInSeconds * 1000,
      });
      return false;
    }

    clientData.count += 1;
    this.requestCounts.set(clientIdentifier, clientData);

    return clientData.count > this.options.maxRequests;
  }

  async handle(
    req: RequestWrapper,
    next: () => Promise<Response>
  ): Promise<Response> {
    const clientIdentifier = this.getClientIdentifier(req);

    if (this.isRateLimitExceeded(clientIdentifier)) {
      logger.warn('Rate limit exceeded for client:', {
        req: {
          ip: req.ip,
          url: req.url,
          method: req.method,
          headers: req.headers,
        },
      });

      return new Response('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': this.options.windowSizeInSeconds.toString(),
        },
      });
    }

    return next();
  }
}

middlewareStack.register('rateLimiter', new RateLimiterMiddleware());
