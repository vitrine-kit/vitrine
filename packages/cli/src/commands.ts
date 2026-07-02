// Thin command wrappers over the primitive. They find the client repository (up
// the tree, or --project <path>) and call install/remove.
import { join, resolve } from 'node:path';
import { findProjectRoot, loadProject, type Project } from './project.js';
import { createRegistrySource } from './registry.js';
import { installFeatures, removeFeature, type InstallResult } from './install.js';
import { designApply } from './design.js';
import { runDoctor, type DoctorReport } from './doctor.js';
import { applyUpdate, planUpdate, type UpdatePlan } from './update.js';
import { exists } from './util.js';

function requireProject(explicitRoot?: string): Project {
  if (explicitRoot) {
    const root = resolve(explicitRoot);
    if (!exists(join(root, 'vitrine.json'))) {
      throw new Error(`[vitrine] no vitrine.json in "${root}" (--project must point at a client repo root)`);
    }
    return loadProject(root);
  }
  const root = findProjectRoot();
  if (!root) {
    throw new Error('[vitrine] vitrine.json not found — not a Vitrine client repository');
  }
  return loadProject(root);
}

export function addFeatures(names: string[], registryRoot?: string, projectRoot?: string): InstallResult {
  return installFeatures(requireProject(projectRoot), names, createRegistrySource(registryRoot));
}

export function removeFeatureCmd(name: string, registryRoot?: string, projectRoot?: string): void {
  removeFeature(requireProject(projectRoot), name, createRegistrySource(registryRoot));
}

export function listFeatures(registryRoot?: string, projectRoot?: string): { installed: string[]; available: string[] } {
  const project = requireProject(projectRoot);
  const registry = createRegistrySource(registryRoot);
  const installed = Object.keys(project.lock.features);
  const available = registry.listFeatures().filter((name) => !installed.includes(name));
  return { installed, available };
}

export function designApplyCmd(opts: { bin?: string; dryRun?: boolean; projectRoot?: string } = {}): number {
  return designApply(requireProject(opts.projectRoot), { bin: opts.bin, dryRun: opts.dryRun });
}

export function doctorCmd(registryRoot?: string, projectRoot?: string): DoctorReport {
  return runDoctor(requireProject(projectRoot), createRegistrySource(registryRoot));
}

export interface UpdateOutcome {
  plan: UpdatePlan;
  applied: boolean;
}

export function updateFeaturesCmd(
  names: string[],
  registryRoot?: string,
  opts: { dryRun?: boolean; projectRoot?: string } = {},
): UpdateOutcome[] {
  const project = requireProject(opts.projectRoot);
  const registry = createRegistrySource(registryRoot);
  const targets = names.length > 0 ? names : Object.keys(project.lock.features);
  return targets.map((name) => {
    const plan = planUpdate(project, name, registry);
    const applied = plan.changed && !opts.dryRun;
    if (applied) applyUpdate(project, plan, registry);
    return { plan, applied };
  });
}

export function diffFeatureCmd(name: string, registryRoot?: string, projectRoot?: string): UpdatePlan {
  return planUpdate(requireProject(projectRoot), name, createRegistrySource(registryRoot));
}
