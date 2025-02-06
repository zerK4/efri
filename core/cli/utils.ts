import { join } from 'path';

export interface PathInfo {
  directories: string[];
  name: string;
  fullPath: string;
  baseDir: string;
  filePath: string;
}

export function extractPathInfo(
  inputPath: string,
  options: {
    baseFolder: string;
    extension?: string;
    basePath?: string;
  }
): PathInfo {
  // Clean the path and split it into segments
  const normalizedPath = inputPath.replace(/^\/+|\/+$/g, '');
  const pathSegments = normalizedPath.split('/');

  // The last segment is the name
  const name = pathSegments[pathSegments.length - 1];

  // The rest is the directory structure
  const directories = pathSegments.slice(0, -1);

  // Create the base directory path
  const baseDir = join(
    options.basePath || process.cwd(),
    'src',
    options.baseFolder
  );

  // Create the full directory path including nested structure
  const fullPath = join(baseDir, ...directories);

  // Create the file path
  const extension = options.extension || '.ts';
  const filePath = join(fullPath, `${name}${extension}`);

  return {
    directories,
    name,
    fullPath,
    baseDir,
    filePath,
  };
}
