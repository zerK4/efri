import type { ResponseHelper } from '../helpers/ResponseHelper';
import type { RequestWrapper } from '../router/RequestWrapper';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type ControllerMethod = (context: {
  req: RequestWrapper;
  res: ResponseHelper;
  params: Record<string, string>;
  query: Record<string, any>;
}) => Promise<Response>;

export type RouteHandler =
  | ControllerMethod
  | ((ctx: RouterContext) => any)
  | [new () => any, string];

export interface Route {
  method: HttpMethod;
  path: string;
  handler: RouteHandler | ControllerMethod;
  middleware?: string[];
}

export interface RouterContext<
  T extends {
    query?: Record<string, any>;
    params?: Record<string, string>;
    req?: RequestWrapper;
    res?: ResponseHelper;
  } = {},
> {
  req: T extends { req: infer R } ? R : RequestWrapper;
  res: T extends { res: infer R } ? R : ResponseHelper;
  params: T extends { params: infer P } ? P : Record<string, string>;
  query: T extends { query: infer Q } ? Q : Record<string, any>;
}

export interface LifecycleContext {
  req: RequestWrapper;
  res: ResponseHelper;
  params: Record<string, string>;
  query: Record<string, any>;
  beforeLoadData?: any;
  afterLoadData?: any;
  executeBeforeLoad: (data?: any) => Promise<void>;
  executeAfterLoad: (data?: any) => Promise<void>;
}

export type LifecycleHook = (context: LifecycleContext) => Promise<void>;

export interface RouteLifecycleHooks {
  onBeforeLoad?: LifecycleHook;
  onAfterLoad?: LifecycleHook;
}

export interface RouterPlugin {
  name: string;
  onBeforeLoad?: LifecycleHook;
  onAfterLoad?: LifecycleHook;
}
