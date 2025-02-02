import type { RouterContext } from '../types';
import { gate } from '../CoreGate';

export function Authorized(ability: string) {
  // Decorators are a pain in the ass...
  return function (...props: any[]) {
    const [, , descriptor] = props;
    // Save the original method
    const originalMethod = descriptor.value;

    // Override the method
    descriptor.value = async function (
      this: any,
      { res, ...ctx }: RouterContext,
      ...args: any[]
    ): Promise<Response> {
      // Check if the user is allowed to perform the action
      const isAllowed = await gate.allows(ability);

      if (!isAllowed) {
        return res.json({ error: 'Unauthorized' }, 403);
      }

      return originalMethod.apply(this, [{ res, ...ctx }, ...args]);
    };

    return descriptor;
  };
}
