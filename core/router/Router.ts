import { ResponseHelper } from '../helpers/ResponseHelper';
import { MiddlewareStack } from '../middlewares/Middleware';
import type { HttpMethod, Route, RouteHandler } from '@/types/router';

export class Router {
  private static instance: Router;
  private routes: Route[] = [];
  private groupStack: { prefix?: string; middleware?: string[] }[] = [];

  private constructor() {}

  public static getInstance(): Router {
    if (!Router.instance) {
      Router.instance = new Router();
    }
    return Router.instance;
  }

  public static getRoutes(): Route[] {
    if (!Router.instance) {
      Router.instance = new Router();
    }
    return Router.instance.routes;
  }

  public static addRoute(
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
      .filter((prefix) => prefix)
      .join('');

    const allMiddleware = this.groupStack.reduce(
      (acc, group) => {
        return [...acc, ...(group.middleware || [])];
      },
      [...middleware]
    );

    this.routes.push({
      method,
      path: `${fullPrefix}${path}`,
      handler,
      middleware: allMiddleware,
    });
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

  private async invokeControllerMethod(
    handler: RouteHandler,
    req: Request,
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
    // If handler is a direct function
    return handler({ req, res, params, query });
  }

  private matchRoute(
    method: string,
    path: string
  ): {
    route: Route;
    params: Record<string, string>;
    query: Record<string, any>;
  } | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;

      const routeParts = route.path.split('/').filter((part) => part !== '');
      const requestParts = path.split('/').filter((part) => part !== '');

      if (routeParts.length !== requestParts.length) continue;

      const params: Record<string, string> = {};
      let matches = true;

      for (let i = 0; i < routeParts.length; i++) {
        const routePart = routeParts[i];
        const requestPart = requestParts[i];

        const paramMatch = routePart.match(/^{(.+)}$/);
        if (paramMatch) {
          const paramName = paramMatch[1];
          params[paramName] = requestPart;
        } else if (routePart !== requestPart) {
          matches = false;
          break;
        }
      }

      if (matches) {
        const query: Record<string, any> = {};
        try {
          const urlObj = new URL(`http://dummy.com${path}`);
          urlObj.searchParams.forEach((value, key) => {
            query[key] = value;
          });
        } catch (error) {
          // Ignore errors in query parsing
        }

        return { route, params, query };
      }
    }

    return null;
  }

  private async executeMiddleware(
    middlewareNames: string[],
    req: Request,
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
        throw new Error(`Middleware ${middlewareNames[index]} not found`);
      }

      return middleware.handle(req, () => executeMiddlewareChain(index + 1));
    };

    return executeMiddlewareChain(0);
  }

  public async handleRequest(req: Request): Promise<Response> {
    const res = ResponseHelper.getInstance();

    try {
      const url = new URL(req.url);
      const match = this.matchRoute(req.method, url.pathname);

      if (!match) {
        return res.json({ error: 'Not Found' }, 404);
      }

      const { route, params, query } = match;

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
      console.error('Router error:', error); // Add logging
      return res.json({ error: 'Internal Server Error' }, 500);
    }
  }
}
