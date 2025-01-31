export const simpleController = (name: string) => `
import Controller from "efri/core/controllers/Controller";
import type { RouterContext } from "efri/core/types/router";

export class ${name} extends Controller {
  public async index({ res }: RouterContext): Promise<Response> {
    return res.json({ message: "Hello World" });
  }
}
`;

export const extendedController = (name: string) => `
import Controller from "efri/core/controllers/Controller";
import type { RouterContext } from "efri/core/types/router";

export class ${name} extends Controller {
  public async index({ res }: RouterContext): Promise<Response> {
    return res.json({ message: "Hello World" });
  }

  public async show({ res }: RouterContext): Promise<Response> {
    return res.json({ message: "Hello World" });
  }

  public async store({ res }: RouterContext): Promise<Response> {
    return res.json({ message: "Hello World" });
  }

  public async update({ res }: RouterContext): Promise<Response> {
    return res.json({ message: "Hello World" });
  }

  public async destroy({ res }: RouterContext): Promise<Response> {
    return res.json({ message: "Hello World" });
  }
}
`;
