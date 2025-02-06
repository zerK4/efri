import { CoreError } from '../errors/CoreError';
import { middlewareStack } from '../middlewares';
import type { MiddlewareHandler } from '../types';
import { ZodSchema } from 'zod';

export class CoreValidator {
  private validators: Map<string, ZodSchema<any>>;

  constructor() {
    this.validators = new Map();
  }

  // Register a new validation schema
  define(name: string, schema: ZodSchema<any>): void {
    this.validators.set(name, schema);
  }

  // Validate a given data object against a named validator
  validate(name: string, data: unknown): { success: boolean; errors?: any } {
    const schema = this.validators.get(name);
    if (!schema) {
      throw new CoreError({
        message: `Validator [${name}] not defined.`,
      });
    }

    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true };
    }

    const extractedErrors = result.error?.errors.map((err) => {
      return {
        ...err,
        path: err.path.join('.'),
      };
    });

    return {
      success: false,
      errors: extractedErrors,
    };
  }

  // Get all registered validators
  getAll(): Record<string, ZodSchema<any>> {
    return Object.fromEntries(this.validators);
  }

  // Get a specific validator
  get(name: string): ZodSchema<any> | undefined {
    return this.validators.get(name);
  }

  // Middleware to validate request body
  middleware(name: string) {
    const middleware: MiddlewareHandler = {
      handle: async (
        req: Request,
        next: () => Promise<Response>
      ): Promise<Response> => {
        const schema = this.validators.get(name);
        if (!schema) {
          throw new CoreError({
            message: `Validator [${name}] not defined.`,
          });
        }

        try {
          const body = await req.json();
          const result = schema.safeParse(body);

          const extractedErrors = result.error?.errors.map((err) => {
            return {
              ...err,
              path: err.path.join('.'),
            };
          });

          if (!result.success) {
            return new Response(JSON.stringify({ errors: extractedErrors }), {
              status: 422,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          return next();
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Invalid JSON payload' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      },
    };

    middlewareStack.register(name, middleware);
  }
}

export const validator = new CoreValidator();
