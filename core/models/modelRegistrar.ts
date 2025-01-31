import type { ModelConstructor } from './Model';
import { join } from 'path';
import { readdirSync } from 'fs';

const ModelRegistry = new Map<string, ModelConstructor<any>>();

export function registerModel(name: string, model: ModelConstructor<any>) {
  ModelRegistry.set(name.toLowerCase(), model);
}

export function getModel(name: string): ModelConstructor<any> | undefined {
  return ModelRegistry.get(name.toLowerCase());
}

export function loadModels() {
  const modelsDir = join(process.cwd(), 'src', 'models');

  readdirSync(modelsDir).forEach(async (file) => {
    const modelName = file.split('.')[0];
    const modelPath = join(modelsDir, file);
    const ModelClass = await import(modelPath).then((module) => {
      return module;
    });

    registerModel(modelName, ModelClass);
  });
}
