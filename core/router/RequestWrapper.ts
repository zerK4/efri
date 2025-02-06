import type { ZodSchema } from 'zod';
import { validator } from '../validators/CoreValidator';

export interface ExtendedRequest extends Request {
  bytes(): Promise<Uint8Array>;
  getInput: (key: string, defaultValue?: any) => any;
  only: (keys: string[]) => Record<string, any>;
  except: (keys: string[]) => Record<string, any>;
  isJson: () => boolean;
  isFormData: () => boolean;
  isUrlEncoded: () => boolean;
  query: (key: string, defaultValue?: any) => string | null;
  allQuery: () => Record<string, string>;
  getCookies: () => Record<string, string>;
  getCookie: (name: string, defaultValue?: string) => string;
  validate<T>(schema: string | ZodSchema<T>): Promise<{
    success: boolean;
    errors?: {
      code?: string;
      expected?: string;
      received?: string;
      path?: string;
      message?: string;
    };
  }>;
}

export class RequestWrapper implements ExtendedRequest {
  private _body?: any;
  private originalRequest: Request;
  private _bodyUsed = false;
  private _bytes = 0;

  constructor(request: Request) {
    this.originalRequest = request;
  }

  get body(): any {
    return this._body;
  }

  set body(value: any) {
    this._body = value;
    this._bodyUsed = true;
    this._bytes =
      typeof value === 'string' ? new TextEncoder().encode(value).length : 0;
  }

  get bodyUsed(): boolean {
    return this._bodyUsed || this.originalRequest.bodyUsed;
  }

  async bytes(): Promise<Uint8Array> {
    if (typeof this._body === 'string') {
      return new TextEncoder().encode(this._body);
    } else if (this._body instanceof ArrayBuffer) {
      return new Uint8Array(this._body);
    } else if (this._body instanceof Blob) {
      const arrayBuffer = await this._body.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } else {
      return new Uint8Array();
    }
  }

  // Delegate all other Request properties and methods to the original request
  get cache(): RequestCache {
    return this.originalRequest.cache;
  }
  get credentials(): RequestCredentials {
    return this.originalRequest.credentials;
  }
  get destination(): RequestDestination {
    return this.originalRequest.destination;
  }
  get headers(): Headers {
    return this.originalRequest.headers;
  }
  get integrity(): string {
    return this.originalRequest.integrity;
  }
  get keepalive(): boolean {
    return this.originalRequest.keepalive;
  }
  get method(): string {
    return this.originalRequest.method;
  }
  get mode(): RequestMode {
    return this.originalRequest.mode;
  }
  get redirect(): RequestRedirect {
    return this.originalRequest.redirect;
  }
  get referrer(): string {
    return this.originalRequest.referrer;
  }
  get referrerPolicy(): ReferrerPolicy {
    return this.originalRequest.referrerPolicy;
  }
  get signal(): AbortSignal {
    return this.originalRequest.signal;
  }
  get url(): string {
    return this.originalRequest.url;
  }

  // Delegate methods
  clone(): Request {
    return this.originalRequest.clone();
  }
  arrayBuffer(): Promise<ArrayBuffer> {
    this._bodyUsed = true;
    return this.originalRequest.arrayBuffer();
  }
  blob(): Promise<Blob> {
    this._bodyUsed = true;
    return this.originalRequest.blob();
  }
  formData(): Promise<FormData> {
    this._bodyUsed = true;
    return this.originalRequest.formData();
  }
  async json(): Promise<any> {
    this._bodyUsed = true;
    return this.originalRequest.json().then((data) => {
      this._bytes = JSON.stringify(data).length;
      return data;
    });
  }
  async text(): Promise<string> {
    this._bodyUsed = true;
    return this.originalRequest.text().then((data) => {
      this._bytes = data.length;
      return data;
    });
  }

  //custom
  getInput(key: string, defaultValue: any = null): any {
    if (this._body && typeof this._body === 'object') {
      return this._body[key] ?? defaultValue;
    }
    return defaultValue;
  }

  only(keys: string[]): Record<string, any> {
    if (!this._body || typeof this._body !== 'object') return {};
    return keys.reduce(
      (acc, key) => {
        if (key in this._body) acc[key] = this._body[key];
        return acc;
      },
      {} as Record<string, any>
    );
  }

  except(keys: string[]): Record<string, any> {
    if (!this._body || typeof this._body !== 'object') return {};
    return Object.keys(this._body)
      .filter((key) => !keys.includes(key))
      .reduce(
        (acc, key) => {
          acc[key] = this._body[key];
          return acc;
        },
        {} as Record<string, any>
      );
  }

  isJson(): boolean {
    return (
      this.headers.get('content-type')?.includes('application/json') ?? false
    );
  }

  isFormData(): boolean {
    return (
      this.headers.get('content-type')?.includes('multipart/form-data') ?? false
    );
  }

  isUrlEncoded(): boolean {
    return (
      this.headers
        .get('content-type')
        ?.includes('application/x-www-form-urlencoded') ?? false
    );
  }

  query(key: string, defaultValue: any = null): string | null {
    const params = new URL(this.url).searchParams;
    return params.get(key) ?? defaultValue;
  }

  allQuery(): Record<string, string> {
    const params = new URL(this.url).searchParams;
    return Array.from(params.entries()).reduce(
      (acc, [key, value]) => {
        acc[key] = value;
        return acc;
      },
      {} as Record<string, string>
    );
  }

  getCookies(): Record<string, string> {
    const cookieHeader = this.headers.get('cookie') ?? '';
    return Object.fromEntries(
      cookieHeader.split('; ').map((c) => c.split('='))
    );
  }

  getCookie(name: string, defaultValue: string = ''): string {
    return this.getCookies()[name] ?? defaultValue;
  }

  async validate<T>(schema: string | ZodSchema<T>) {
    let validatorSchema: ZodSchema<T> | undefined;

    if (typeof schema === 'string') {
      validatorSchema = validator.get(schema) as ZodSchema<T>;
      if (!validatorSchema) {
        console.error(`Validator [${schema}] not defined.`);
        throw new Response(
          JSON.stringify({ error: `Validator [${schema}] not defined.` }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      validatorSchema = schema;
    }

    try {
      const body = await this.json(); // Make sure the body exists
      const result = validatorSchema.safeParse(body);

      if (!result.success) {
        const errors = result.error.errors.map((err) => ({
          ...err,
          path: err.path.join('.'),
        }));

        return {
          success: false,
          errors: errors as any,
        };
      }

      return result;
    } catch (error) {
      console.error('Validation error:', error); // Debugging log
      throw new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
}
