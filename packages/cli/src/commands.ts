// Thin command wrappers over the primitive. They find the client repository (up
// the tree) and call install/remove.
import { findProjectRoot, loadProject, type Project } from './project.js';
import { createRegistrySource } from './registry.js';
import { installFeatures, removeFeature, type InstallResult } from './install.js';
import { designApply } from './design.js';
import { runDoctor, type DoctorReport } from './doctor.js';
import { applyUpdate, planUpdate, type UpdatePlan } from './update.js';

function requireProject(): Project {
  const root = findProjectRoot();
  if (!root) {
    throw new Error('[vitrine] vitrine.json not found — not a Vitrine client repository');
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

export function designApplyCmd(opts: { bin?: string; dryRun?: boolean } = {}): number {
  return designApply(requireProject(), { bin: opts.bin, dryRun: opts.dryRun });
}

export function doctorCmd(registryRoot?: string): DoctorReport {
  return runDoctor(requireProject(), createRegistrySource(registryRoot));
}

export interface UpdateOutcome {
  plan: UpdatePlan;
  applied: boolean;
}

export function updateFeaturesCmd(
  names: string[],
  registryRoot?: string,
  opts: { dryRun?: boolean } = {},
): UpdateOutcome[] {
  const project = requireProject();
  const registry = createRegistrySource(registryRoot);
  const targets = names.length > 0 ? names : Object.keys(project.lock.features);
  return targets.map((name) => {
    const plan = planUpdate(project, name, registry);
    const applied = plan.changed && !opts.dryRun;
    if (applied) applyUpdate(project, plan, registry);
    return { plan, applied };
  });
}

export function diffFeatureCmd(name: string, registryRoot?: string): UpdatePlan {
  return planUpdate(requireProject(), name, createRegistrySource(registryRoot));
}
