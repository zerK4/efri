import { PluginLoader } from '../plugins/PluginLoader';

export class ResponseHelper {
  private static instance: ResponseHelper;
  private pluginMethods: Map<string, Function> = new Map();

  private responseConfig: {
    status?: number;
    headers?: Record<string, string>;
  } = {};

  public static getInstance(): ResponseHelper {
    if (!ResponseHelper.instance) {
      ResponseHelper.instance = new ResponseHelper();
    }

    ResponseHelper.instance.loadPlugins();
    return ResponseHelper.instance;
  }

  private loadPlugins(): void {
    const responseHelperPlugins = PluginLoader.plugins.filter(
      (plugin) => plugin.type === 'response-helper'
    );

    // Create a context object with the methods plugins might need
    const pluginContext = {
      writeHead: this.writeHead.bind(this),
      end: this.end.bind(this),
      setContentType: this.setContentType.bind(this),
    };

    for (const plugin of responseHelperPlugins) {
      if (plugin.methods) {
        Object.entries(plugin.methods).forEach(([methodName, method]) => {
          if (methodName in this || this.pluginMethods.has(methodName)) {
            return;
          }
          // Bind both the plugin context and the ResponseHelper instance
          const boundMethod = method.bind(this, pluginContext);
          this.pluginMethods.set(methodName, boundMethod);
        });
      }
    }

    this.createProxyMethods();
  }

  private createProxyMethods(): void {
    this.pluginMethods.forEach((method, methodName) => {
      if (!(methodName in this)) {
        Object.defineProperty(this, methodName, {
          value: method,
          writable: false,
          configurable: true,
        });
      }
    });
  }

  public writeHead(status: number, headers?: Record<string, string>): this {
    this.responseConfig.status = status;
    this.responseConfig.headers = headers;
    return this;
  }

  public end(body?: BodyInit): Response {
    const { status = 200, headers = {} } = this.responseConfig;

    const finalHeaders = {
      ...headers,
      'Content-Type': headers['Content-Type'] || 'text/plain',
    };

    const response = new Response(body, {
      status,
      headers: finalHeaders,
    });

    this.responseConfig = {};

    return response;
  }

  json(data: any, status: number = 200): Response {
    return this.writeHead(status, { 'Content-Type': 'application/json' }).end(
      JSON.stringify(data)
    );
  }

  html(content: string, status: number = 200): Response {
    return this.writeHead(status, { 'Content-Type': 'text/html' }).end(content);
  }

  send(body: BodyInit, status: number = 200): Response {
    return this.writeHead(status).end(body);
  }

  public setContentType(contentType: string): this {
    this.responseConfig.headers = {
      ...this.responseConfig.headers,
      'Content-Type': contentType,
    };
    return this;
  }

  public hasMethod(methodName: string): boolean {
    return this.pluginMethods.has(methodName);
  }

  public getMethod(methodName: string): Function | undefined {
    return this.pluginMethods.get(methodName);
  }

  public static getMethods(): Map<string, Function> {
    return this.instance.pluginMethods;
  }
}
