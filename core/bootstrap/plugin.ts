export const responseHelperPlugin = (
  name: string
) => `import type { IResponseHelper } from "efri/core/types/plugin";
import type { IPlugin } from "efri/core/types/plugin";

export default {
  name: "${name}",
  type: "response-helper",
  methods: {
    xml(
      helperContext: IResponseHelper,
      data: string,
      status: number = 200
    ): Response {
      return helperContext
        .writeHead(status, { "Content-Type": "application/xml" })
        .end(data);
    },
  },
} satisfies IPlugin;`;

export const routePlugin = (
  name: string
) => `import { UserController } from "@/controllers/UserController";
import type { IPlugin } from "efri/core/types/plugin";

export default {
  name: "${name}",
  type: "route-plugin",
  routes: [
    {
      handler: [UserController, "index"], // Use the controller class and the method you want to call
      method: "GET", // HTTP method
      path: "/dynamic/route", // Route path
      middleware: [], // Middleware
      file: "./src/plugins/dynamic.ts", // File path, helps to determine if the route is from a plugin or not
    },
  ],
} satisfies IPlugin;
`;

export const loggerPlugin = (
  name: string
) => `import type { LoggerConfig, LogLevel } from "efri/core/types";
import type { IPlugin } from "efri/core/types/plugin";

export default {
  name: "${name}",
  type: "logger",
  methods: {
    log: (
      level: LogLevel,
      message: any,
      context: any,
      config: LoggerConfig
    ): void => {
      // Do your thing..
    },
  },
} satisfies IPlugin;`;
