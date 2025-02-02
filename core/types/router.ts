import type { ResponseHelper } from '../helpers/ResponseHelper';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type ControllerMethod = (context: {
  req: Request;
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
  Req extends Request = Request,
  Res extends ResponseHelper = ResponseHelper,
> {
  req: Req;
  res: Res;
  params: Record<string, string>;
  query: Record<string, any>;
}

export interface LifecycleContext {
  req: Request;
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
