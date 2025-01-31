import type { HttpMethod } from '@/types/router';

export interface RouteInfo {
  handler?: any;
  method: HttpMethod;
  path: string;
  file: string;
  line?: number;
  middleware?: any[];
}
