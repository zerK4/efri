import type { ResponseHelper } from '@/helpers';
import type { RouteInfo } from './routes';

export interface ICorePlugin {
  name: string;
  type: 'response-helper' | 'route-plugin' | 'middleware-plugin' | 'middleware';
  methods?: Record<string, Function>;
  middleware?: (
    req: Request,
    next: () => Promise<Response>
  ) => Promise<Response>;
  init?: (helper: ResponseHelper) => void;
  routes?: RouteInfo[];
}
