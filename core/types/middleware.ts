export interface MiddlewareHandler {
  handle(req: Request, next: () => Promise<Response>): Promise<Response>;
}
