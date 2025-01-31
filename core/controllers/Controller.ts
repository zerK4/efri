import type { RouterContext } from '@/types/router';

export abstract class Controller {
  protected context?: RouterContext;

  // Optional method to set context if needed
  setContext(context: RouterContext) {
    this.context = context;
  }
}
