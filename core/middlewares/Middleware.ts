import { CoreError } from '../errors/CoreError';
import type { MiddlewareHandler } from '../types/middleware';

export class MiddlewareStack {
  private static instance: MiddlewareStack;
  private middlewares: Map<string, MiddlewareHandler> = new Map();

  private constructor() {}

  public static getInstance(): MiddlewareStack {
    if (!this.instance) {
      this.instance = new MiddlewareStack();
    }
    return this.instance;
  }

  public register(name: string, middleware: MiddlewareHandler): void {
    if (this.middlewares.has(name)) {
      throw new CoreError({
        message: `Middleware '${name}' is already registered.`,
      });
    }
    this.middlewares.set(name, middleware);
  }

  public get(name: string): MiddlewareHandler | undefined {
    return this.middlewares.get(name);
  }

  public getAll(): string[] {
    return Array.from(this.middlewares.keys());
  }

  public clear(): void {
    this.middlewares.clear();
  }

  public async execute(req: Request, index = 0): Promise<Response> {
    const middlewares = Array.from(this.middlewares.values());
    if (index >= middlewares.length) {
      return new Response('No middleware executed', { status: 404 });
    }

    const currentMiddleware = middlewares[index];
    return currentMiddleware.handle(req, () => this.execute(req, index + 1));
  }
}

export abstract class BaseMiddleware implements MiddlewareHandler {
  abstract handle(
    req: Request,
    next: () => Promise<Response>
  ): Promise<Response>;
}

export const middlewareStack = MiddlewareStack.getInstance();
