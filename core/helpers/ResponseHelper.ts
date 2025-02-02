import { PluginLoader } from '../plugins/PluginLoader';

export class ResponseHelper {
  private static instance: ResponseHelper;
  private pluginMethods: Map<string, Function> = new Map();

  // New internal state for response configuration
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
    // Get all response-helper plugins from PluginLoader
    const responseHelperPlugins = PluginLoader.plugins.filter(
      (plugin) => plugin.type === 'response-helper'
    );

    // Load methods from each plugin
    for (const plugin of responseHelperPlugins) {
      if (plugin.methods) {
        Object.entries(plugin.methods).forEach(([methodName, method]) => {
          if (methodName in this || this.pluginMethods.has(methodName)) {
            return;
          }
          // Bind the method to this instance and store it
          this.pluginMethods.set(methodName, method.bind(this));
        });
      }
    }

    // Create proxy methods for type safety and better IDE support
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

  // New method to set headers dynamically
  public writeHead(status: number, headers?: Record<string, string>): this {
    this.responseConfig.status = status;
    this.responseConfig.headers = headers;
    return this;
  }

  // New method to finalize response
  public end(body?: BodyInit): Response {
    const { status = 200, headers = {} } = this.responseConfig;

    // Reset config after creating response
    const finalHeaders = {
      ...headers,
      'Content-Type': headers['Content-Type'] || 'text/plain',
    };

    // Create response with configured status and headers
    const response = new Response(body, {
      status,
      headers: finalHeaders,
    });

    // Reset configuration
    this.responseConfig = {};

    return response;
  }

  // Modify existing methods to support dynamic headers
  json(data: any, status: number = 200): Response {
    return this.writeHead(status, { 'Content-Type': 'application/json' }).end(
      JSON.stringify(data)
    );
  }

  html(content: string, status: number = 200): Response {
    return this.writeHead(status, { 'Content-Type': 'text/html' }).end(content);
  }

  // Add a convenience method for setting content type
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
