import { CoreError } from '../errors/CoreError';
import type { HttpMethod, Route } from '../types';

export class RouteTrieNode {
  children: Record<string, RouteTrieNode> = {};
  routes: Partial<Record<HttpMethod, Route>> = {};
  paramName: string | null = null;
  isWildcard: boolean = false;
}

export class RouteTrie {
  private root: RouteTrieNode = new RouteTrieNode();

  addRoute(method: HttpMethod, path: string, route: Route) {
    if (!path.startsWith('/')) {
      path = `/${path}`;
    }

    const parts = path.split('/').filter((part) => part !== '');
    const hasParams = parts.some(
      (part) => part.startsWith('{') && part.endsWith('}')
    );
    let node = this.root;

    // Handle exact routes first (no parameters)
    if (!hasParams) {
      for (const part of parts) {
        if (!node.children[part]) {
          node.children[part] = new RouteTrieNode();
        }
        node = node.children[part];
      }

      if (node.routes[method]) {
        throw new CoreError({
          message: `Route already exists for ${method} ${path}`,
        });
      }
      node.routes[method] = route;
      return;
    }

    // Handle parameterized routes
    for (const part of parts) {
      if (part === '*') {
        node.isWildcard = true;
        if (!node.children['*']) {
          node.children['*'] = new RouteTrieNode();
        }
        node = node.children['*'];
      } else if (part.startsWith('{') && part.endsWith('}')) {
        const paramName = part.slice(1, -1);
        if (!paramName) {
          throw new CoreError({
            message: 'Empty parameter name in route',
          });
        }
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(paramName)) {
          throw new CoreError({
            message: `Invalid parameter name: ${paramName}`,
          });
        }
        node.paramName = paramName;
        if (!node.children['*']) {
          node.children['*'] = new RouteTrieNode();
        }
        node = node.children['*'];
      } else {
        if (!node.children[part]) {
          node.children[part] = new RouteTrieNode();
        }
        node = node.children[part];
      }
    }

    if (node.routes[method]) {
      throw new CoreError({
        message: `Route already exists for ${method} ${path}`,
      });
    }
    node.routes[method] = route;
  }

  findRoute(
    method: HttpMethod,
    path: string
  ): { route: Route; params: Record<string, string> } | null {
    if (!path.startsWith('/')) {
      throw new CoreError({
        message: 'Path must start with /',
      });
    }

    const parts = path.split('/').filter((part) => part !== '');
    let node = this.root;
    const params: Record<string, string> = {};

    let exactMatchNode = this.root;
    let hasExactPath = true;

    for (const part of parts) {
      if (exactMatchNode.children[part]) {
        exactMatchNode = exactMatchNode.children[part];
      } else {
        hasExactPath = false;
        break;
      }
    }

    if (hasExactPath && exactMatchNode.routes[method]) {
      return { route: exactMatchNode.routes[method]!, params };
    }

    // Fall back to parameterized route matching
    for (const part of parts) {
      if (node.isWildcard) {
        params['*'] = parts.slice(parts.indexOf(part)).join('/');
        break;
      }

      if (node.children[part]) {
        node = node.children[part];
      } else if (node.paramName && node.children['*']) {
        params[node.paramName] = part;
        node = node.children['*'];
      } else {
        return null;
      }
    }

    const route = node.routes[method];
    return route ? { route, params } : null;
  }

  public collectRoutes(): Route[] {
    return this.traverseTrie(this.root);
  }

  private traverseTrie(node: RouteTrieNode, prefix: string = ''): Route[] {
    const routes: Route[] = [];

    for (const [method, route] of Object.entries(node.routes)) {
      if (route) {
        // Type guard for undefined
        routes.push({
          ...route,
          method: method as HttpMethod,
          path: prefix + (route.path || ''),
        });
      }
    }

    for (const [part, childNode] of Object.entries(node.children)) {
      const newPrefix =
        prefix +
        (part === '*'
          ? node.isWildcard
            ? '/*'
            : `/{${node.paramName}}`
          : `/${part}`);
      routes.push(...this.traverseTrie(childNode, newPrefix));
    }

    return routes;
  }
}
