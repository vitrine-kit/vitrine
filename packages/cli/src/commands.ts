// Тонкие обёртки команд над примитивом. Находят клиентский репозиторий (вверх
// по дереву) и вызывают install/remove.
import { findProjectRoot, loadProject, type Project } from './project.js';
import { createRegistrySource } from './registry.js';
import { installFeatures, removeFeature, type InstallResult } from './install.js';

function requireProject(): Project {
  const root = findProjectRoot();
  if (!root) {
    throw new Error('[vitrine] не найден vitrine.json — это не репозиторий клиента Vitrine');
  }
  return loadProject(root);
}

export function addFeatures(names: string[], registryRoot?: string): InstallResult {
  return installFeatures(requireProject(), names, createRegistrySource(registryRoot));
}

export function removeFeatureCmd(name: string, registryRoot?: string): void {
  removeFeature(requireProject(), name, createRegistrySource(registryRoot));
}

export function listFeatures(registryRoot?: string): { installed: string[]; available: string[] } {
  const project = requireProject();
  const registry = createRegistrySource(registryRoot);
  const installed = Object.keys(project.lock.features);
  const available = registry.listFeatures().filter((name) => !installed.includes(name));
  return { installed, available };
}
