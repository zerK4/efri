import type { MiddlewareHandler } from '../types/middleware';
import StaticFileMiddleware from './StaticFilesMiddleware';

export class MiddlewareStack {
  private static instance: MiddlewareStack;
  private middlewares: Map<string, MiddlewareHandler>;

  private constructor() {
    this.middlewares = new Map();
    this.register('public-folder', new StaticFileMiddleware());
  }

  public static getInstance(): MiddlewareStack {
    if (!MiddlewareStack.instance) {
      MiddlewareStack.instance = new MiddlewareStack();
    }
    return MiddlewareStack.instance;
  }

  public register(name: string, middleware: MiddlewareHandler): void {
    this.middlewares.set(name, middleware);
  }

  public get(name: string): MiddlewareHandler | undefined {
    return this.middlewares.get(name);
  }
}

export abstract class BaseMiddleware implements MiddlewareHandler {
  abstract handle(
    req: Request,
    next: () => Promise<Response>
  ): Promise<Response>;
}

export const middlewareStack = MiddlewareStack.getInstance();
