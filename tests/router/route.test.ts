import { describe, it, expect, beforeEach } from 'bun:test';
import { Router } from '../../core/router/Router';
import { middlewareStack } from '../../core/middlewares';

describe('Router', () => {
  let router: Router;

  beforeEach(() => {
    router = Router.getInstance();
    // Reset the router instance for each test
    (router as any).routeTrie = new (router as any).routeTrie.constructor();
  });

  it('should register a GET route', () => {
    const handler = () => new Response('Hello, world!');
    router.get('/test', handler);

    const routes = Router.getRoutes();
    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('/test');
    expect(routes[0].method).toBe('GET');
  });

  it('should register a POST route', () => {
    const handler = () => new Response('Created');
    router.post('/test', handler);

    const routes = Router.getRoutes();
    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('/test');
    expect(routes[0].method).toBe('POST');
  });

  it('should register a route with middleware', () => {
    const handler = () => new Response('With middleware');
    const middleware = ['auth'];
    router.get('/test', handler, middleware);

    const routes = Router.getRoutes();
    expect(routes).toHaveLength(1);
    expect(routes[0].middleware).toEqual(middleware);
  });
});

describe('Router Grouping', () => {
  let router: Router;

  beforeEach(() => {
    router = Router.getInstance();
    (router as any).routeTrie = new (router as any).routeTrie.constructor();
  });

  it('should add a prefix to grouped routes', () => {
    router.group({ prefix: '/api' }, () => {
      router.get('/test', () => new Response('Grouped route'));
    });

    const routes = Router.getRoutes();
    expect(routes).toHaveLength(1);
    expect(routes[0].path).toBe('/api/test');
  });

  it('should add middleware to grouped routes', () => {
    router.group({ middleware: ['auth'] }, () => {
      router.get('/test', () => new Response('Grouped route'));
    });

    const routes = Router.getRoutes();
    expect(routes).toHaveLength(1);
    expect(routes[0].middleware).toEqual(['auth']);
  });
});

describe('Router Request Handling', () => {
  let router: Router;

  beforeEach(() => {
    router = Router.getInstance();
    (router as any).routeTrie = new (router as any).routeTrie.constructor();
  });

  it('should handle a GET request', async () => {
    const handler = () => new Response('Hello, world!');
    router.get('/test', handler);

    const request = new Request('http://localhost/test');
    const response = await router.handleRequest(request, {} as any);

    expect(await response.text()).toBe('Hello, world!');
    expect(response.status).toBe(200);
  });

  it('should handle a POST request with JSON body', async () => {
    const handler = ({ req }: any) => new Response(JSON.stringify(req.body));
    router.post('/test', handler);

    const request = new Request('http://localhost/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'value' }),
    });
    const response = await router.handleRequest(request, {} as any);

    expect(await response.json()).toEqual({ key: 'value' });
  });

  it('should return a 404 for an unknown route', async () => {
    const request = new Request('http://localhost/unknown');
    const response = await router.handleRequest(request, {} as any);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'The route was not found' });
  });
});

describe('Router Middleware', () => {
  let router: Router;

  beforeEach(() => {
    router = Router.getInstance();
    (router as any).routeTrie = new (router as any).routeTrie.constructor();
  });

  it('should execute middleware before the handler', async () => {
    middlewareStack.register('auth', {
      handle: (req, next) => {
        (req as any).user = 'authenticated';
        return next();
      },
    });

    const handler = ({ req }: any) =>
      new Response(`User: ${(req as any).user}`);
    router.get('/test', handler, ['auth']);

    const request = new Request('http://localhost/test');
    const response = await router.handleRequest(request, {} as any);

    expect(await response.text()).toBe('User: authenticated');
  });

  it('should stop execution if middleware fails', async () => {
    middlewareStack.register('auth', {
      handle: async () => new Response('Unauthorized', { status: 401 }),
    });

    const handler = () => new Response('Should not be reached');
    router.get('/test', handler, ['auth']);

    const request = new Request('http://localhost/test');
    const response = await router.handleRequest(request, {} as any);

    expect(response.status).toBe(401);
    expect(await response.text()).toBe('Unauthorized');
  });
});

describe('Router Error Handling', () => {
  let router: Router;

  beforeEach(() => {
    router = Router.getInstance();
    (router as any).routeTrie = new (router as any).routeTrie.constructor();
  });

  it('should return a 500 for internal server errors', async () => {
    const handler = () => {
      throw new Error('Something went wrong');
    };
    router.get('/test', handler);

    const request = new Request('http://localhost/test');
    const response = await router.handleRequest(request, {} as any);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal Server Error' });
  });
});
