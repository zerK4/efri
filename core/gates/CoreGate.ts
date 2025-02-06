import { CoreError } from '../errors/CoreError';
import { MiddlewareStack, middlewareStack } from '../middlewares';
import type { MiddlewareHandler } from '../types';
import type { GateFunction } from '../types/gate';
import type { User } from '../types/model';

export class CoreGate {
  private gates: Map<string, GateFunction>;
  public defaultUser: User | null;

  constructor() {
    this.gates = new Map();
    this.defaultUser = null;
  }

  // Define a new gate
  define(name: string, callback: GateFunction): void {
    this.gates.set(name, callback);
  }

  // Set the default user for authorization checks
  setUser(user: User | null): void {
    this.defaultUser = user;
  }

  // Check if the current user passes the gate
  async allows(ability: string, ...args: any[]): Promise<boolean> {
    const gate = this.gates.get(ability);

    if (!gate) {
      throw new CoreError({
        message: `Gate [${ability}] not defined.`,
      });
    }

    return await gate(this.defaultUser, ...args);
  }

  // Inverse of allows
  async denies(ability: string, ...args: any[]): Promise<boolean> {
    return !(await this.allows(ability, ...args));
  }

  // Check multiple gates at once
  async any(abilities: string[], ...args: any[]): Promise<boolean> {
    for (const ability of abilities) {
      if (await this.allows(ability, ...args)) {
        return true;
      }
    }
    return false;
  }

  // Check if all gates pass
  async all(abilities: string[], ...args: any[]): Promise<boolean> {
    for (const ability of abilities) {
      if (!(await this.allows(ability, ...args))) {
        return false;
      }
    }
    return true;
  }

  // Create a middleware for protecting routes
  middleware(ability: string) {
    const middlewareHandler: MiddlewareHandler = {
      handle: async (
        req: Request,
        next: () => Promise<Response>
      ): Promise<Response> => {
        console.log(await this.allows(ability), 'ability');
        if (await this.allows(ability)) {
          return next();
        }

        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      },
    };

    middlewareStack.register(ability, middlewareHandler);
    return;
  }
}

export const gate = new CoreGate();
