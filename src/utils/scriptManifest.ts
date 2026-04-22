import { promises as fs } from 'fs';

import { fileExists, readJSON, writeJSON } from './fileHelpers';

const MANIFEST_PATH = 'data/output/scripts-manifest.json';
const GENERATED_DIR = 'tests/generated';

export type ScriptManifestEntry = {
  testId: string;
  approved: boolean;
};

export async function listGeneratedSpecTestIds(): Promise<string[]> {
  if (!(await fileExists(GENERATED_DIR))) {
    return [];
  }
  const entries = await fs.readdir(GENERATED_DIR);
  return entries
    .filter((name) => name.endsWith('.spec.ts'))
    .map((name) => name.replace(/\.spec\.ts$/, ''))
    .sort();
}

export async function readScriptManifestEntries(): Promise<ScriptManifestEntry[]> {
  if (!(await fileExists(MANIFEST_PATH))) {
    return [];
  }
  return readJSON<ScriptManifestEntry[]>(MANIFEST_PATH);
}

export async function writeScriptManifestForSpecs(testIds: string[]): Promise<void> {
  const entries: ScriptManifestEntry[] = testIds.map((testId) => ({ testId, approved: false }));
  await writeJSON(MANIFEST_PATH, entries);
}

export async function setScriptApproval(testId: string, approved: boolean): Promise<ScriptManifestEntry[]> {
  const current = await readScriptManifestEntries();
  const index = current.findIndex((e) => e.testId === testId);
  if (index === -1) {
    current.push({ testId, approved });
  } else {
    current[index] = { ...current[index], approved };
  }
  await writeJSON(MANIFEST_PATH, current);
  return current;
}

/**
 * When a manifest exists and lists generated specs, every on-disk spec must be approved=true.
 * If no manifest file (or empty), enforcement is skipped so CLI-only workflows keep working.
 */
export async function assertAllGeneratedScriptsApproved(): Promise<void> {
  const specIds = await listGeneratedSpecTestIds();
  if (specIds.length === 0) {
    return;
  }

  const entries = await readScriptManifestEntries();
  if (entries.length === 0) {
    return;
  }

  const map = new Map(entries.map((e) => [e.testId, e.approved]));
  const pending = specIds.filter((id) => map.get(id) !== true);
  if (pending.length > 0) {
    throw new Error(
      `Script approval is required before running Playwright tests. ` +
        `Not approved: ${pending.join(', ')}. Open the Scripts page and approve each script (or regenerate scripts after review).`
    );
  }
}
