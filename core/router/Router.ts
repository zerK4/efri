import { CoreError } from '../errors/CoreError';
import { ResponseHelper } from '../helpers/ResponseHelper';
import { logger } from '../logger';
import { MiddlewareStack } from '../middlewares/Middleware';
import type { HttpMethod, Route, RouteHandler } from '../types/router';
import { RequestWrapper } from './RequestWrapper';

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
      console.error('Error parsing request body:', error);
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

  public async handleRequest(originalReq: Request): Promise<Response> {
    const req = new RequestWrapper(originalReq);
    const res = ResponseHelper.getInstance();
    try {
      const url = new URL(req.url);
      const match = this.matchRoute(req.method, url.pathname);

      if (!match) {
        return res.json({ error: 'The route was not found' }, 404);
      }

      const { route, params, query } = match;

      // Parse request body for methods that typically include one
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        await this.parseRequestBody(req);
      }

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
      return res.json({ error: 'Internal Server Error' }, 500);
    }
  }
}
