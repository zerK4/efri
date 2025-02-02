import type { User } from './model';

export type GateFunction = (
  user: User | null,
  ...args: any[]
) => boolean | Promise<boolean>;
