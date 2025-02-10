import type { Server } from 'bun';
import qs from 'qs';
import { CoreError } from '../errors/CoreError';
import { ResponseHelper } from '../helpers/ResponseHelper';
import { logger } from '../logger';
import { MiddlewareStack } from '../middlewares/Middleware';
import type { HttpMethod, Route, RouteHandler } from '../types/router';
import { RequestWrapper } from './RequestWrapper';
import { RouteTrie } from './RouteTrie';

export class Router {
  private static instance: Router;
  private routeTrie = new RouteTrie();
  private groupStack: { prefix?: string; middleware?: string[] }[] = [];

  private constructor() {}

  public static getInstance(): Router {
    if (!Router.instance) {
      Router.instance = new Router();
    }
    return Router.instance;
  }

  public static has(path: string): boolean {
    return Router.getInstance().routeTrie.findRoute('GET', path) !== null;
  }

  public static getRoutes(): Route[] {
    const router = Router.getInstance();
    return router.routeTrie.collectRoutes();
  }

  static addRoute(
    method: HttpMethod,
    path: string,
    handler: RouteHandler,
    middleware: string[] = []
  ) {
    const router = Router.getInstance();
    router.addRoute(method, path, handler, middleware);
  }

  private addRoute(
    method: HttpMethod,
    path: string,
    handler: RouteHandler,
    middleware: string[] = []
  ) {
    const fullPrefix = this.groupStack
      .map((group) => group.prefix || '')
      .filter(Boolean)
      .join('');

    const fullPath = `${fullPrefix}${path}`;

    // Early validation and return
    if (!this.validateRoutePath(fullPath)) {
      return;
    }

    // Early return if route exists
    // if (this.routeTrie.findRoute(method, fullPath)) {
    //   return;
    // }

    const allMiddleware = [
      ...middleware,
      ...this.groupStack.flatMap((group) => group.middleware || []),
    ];

    if (!this.validateMiddlewareNames(allMiddleware)) {
      return;
    }

    this.routeTrie.addRoute(method, fullPath, {
      method,
      path: fullPath,
      handler,
      middleware: allMiddleware,
    });
  }

  private validateRoutePath(path: string): boolean {
    const parts = path.split('/').filter((part) => part !== '');

    for (const part of parts) {
      if (part.startsWith('{') && part.endsWith('}')) {
        const paramName = part.slice(1, -1);
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(paramName)) {
          throw new Error(
            `Invalid route parameter: ${part}. Use alphanumeric names like {id}.`
          );
        }
      }
    }
    return true;
  }

  private validateMiddlewareNames(middlewareNames: string[]): boolean {
    const middlewareStack = MiddlewareStack.getInstance();

    for (const name of middlewareNames) {
      if (!middlewareStack.get(name)) {
        throw new Error(`Middleware "${name}" is not registered.`);
      }
    }
    return true;
  }

  public get(path: string, handler: RouteHandler, middleware: string[] = []) {
    this.addRoute('GET', path, handler, middleware);
    return this;
  }

  public post(path: string, handler: RouteHandler, middleware: string[] = []) {
    this.addRoute('POST', path, handler, middleware);
    return this;
  }

  public put(path: string, handler: RouteHandler, middleware: string[] = []) {
    this.addRoute('PUT', path, handler, middleware);
    return this;
  }

  public delete(
    path: string,
    handler: RouteHandler,
    middleware: string[] = []
  ) {
    this.addRoute('DELETE', path, handler, middleware);
    return this;
  }

  public patch(path: string, handler: RouteHandler, middleware: string[] = []) {
    this.addRoute('PATCH', path, handler, middleware);
    return this;
  }

  public group(
    options: { prefix?: string; middleware?: string[] },
    callback: () => void
  ) {
    this.groupStack.push(options);
    callback();
    this.groupStack.pop();
    return this;
  }

  private async parseRequestBody(req: RequestWrapper): Promise<void> {
    try {
      const contentType = req.headers.get('content-type');

      if (contentType?.includes('application/json')) {
        const text = await req.clone().text();
        req.body = text ? JSON.parse(text) : null;
        return;
      }

      if (contentType?.includes('application/x-www-form-urlencoded')) {
        const formData = await req.clone().formData();
        const body: Record<string, any> = {};
        formData.forEach((value, key) => {
          body[key] = value;
        });
        req.body = body;
        return;
      }

      if (contentType?.includes('multipart/form-data')) {
        const formData = await req.clone().formData();
        const body: Record<string, any> = {};
        formData.forEach((value, key) => {
          body[key] = value;
        });
        req.body = body;
        return;
      }

      req.body = null;
    } catch (error) {
      logger.error('Error parsing request body:', error);
      req.body = null;
    }
  }

  private async invokeControllerMethod(
    handler: RouteHandler,
    req: RequestWrapper,
    params: Record<string, string>,
    query: Record<string, any>,
    res: ResponseHelper
  ): Promise<Response> {
    if (Array.isArray(handler)) {
      const [ControllerClass, methodName] = handler;
      const controller = new ControllerClass();
      const method = controller[methodName].bind(controller);

      return method({ req, res, params, query });
    }
    return handler({ req, res, params, query });
  }

  private async executeMiddleware(
    middlewareNames: string[],
    req: RequestWrapper,
    params: Record<string, string>,
    query: Record<string, any>,
    route: RouteHandler,
    res: ResponseHelper
  ): Promise<Response> {
    const middlewareStack = MiddlewareStack.getInstance();

    const executeMiddlewareChain = async (index: number): Promise<Response> => {
      if (index >= middlewareNames.length) {
        return this.invokeControllerMethod(route, req, params, query, res);
      }

      const middleware = middlewareStack.get(middlewareNames[index]);
      if (!middleware) {
        logger.error(`Middleware ${middlewareNames[index]} not found`);
        throw new CoreError({
          message: `Middleware ${middlewareNames[index]} not found`,
        });
      }

      return middleware.handle(req as unknown as Request, () =>
        executeMiddlewareChain(index + 1)
      );
    };

    return executeMiddlewareChain(0);
  }

  public async handleRequest(
    originalReq: Request,
    server: Server
  ): Promise<Response> {
    const req = new RequestWrapper(originalReq, server);
    const res = ResponseHelper.getInstance();
    try {
      const url = new URL(req.url);
      const match = this.routeTrie.findRoute(
        req.method as HttpMethod,
        url.pathname
      );

      if (!match) {
        logger.error('The route was not found', {
          url: req.url,
          method: req.method,
        });
        return res.json({ error: 'The route was not found' }, 404);
      }

      const { route, params } = match;

      // Parse request body for methods that typically include one
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        await this.parseRequestBody(req);
      }

      // Parse query parameters using qs
      const query = qs.parse(url.search, { ignoreQueryPrefix: true });

      if (route.middleware?.length) {
        return await this.executeMiddleware(
          route.middleware,
          req,
          params,
          query,
          route.handler,
          res
        );
      }

      return await this.invokeControllerMethod(
        route.handler,
        req,
        params,
        query,
        res
      );
    } catch (error) {
      logger.error('Internal server error', {
        error,
      });
      return res.json({ error: 'Internal Server Error' }, 500);
    }
  }
}
