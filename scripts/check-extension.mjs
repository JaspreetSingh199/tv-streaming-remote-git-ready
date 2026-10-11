#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const manifestPath = join(root, 'manifest.json');
const errors = [];
const pass = (message) => console.log(`✓ ${message}`);
const fail = (message) => errors.push(message);

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  pass('manifest.json parses as JSON');
} catch (error) {
  console.error(`✗ Cannot parse manifest.json: ${error.message}`);
  process.exit(1);
}

if (manifest.manifest_version !== 3) fail('manifest_version must be 3');
if (!manifest.name || !manifest.version) fail('manifest must define name and version');
if (!Array.isArray(manifest.content_scripts)) fail('manifest must define content_scripts');

const refs = new Set();
for (const script of manifest.content_scripts || []) {
  for (const file of [...(script.js || []), ...(script.css || [])]) refs.add(file);
}
if (manifest.background?.service_worker) refs.add(manifest.background.service_worker);
for (const file of Object.values(manifest.icons || {})) refs.add(file);
for (const file of Object.values(manifest.action?.default_icon || {})) refs.add(file);

for (const file of refs) {
  if (existsSync(join(root, file))) pass(`manifest reference exists: ${file}`);
  else fail(`manifest references missing file: ${file}`);
}

for (const file of ['content.js', manifest.background?.service_worker].filter(Boolean)) {
  const full = join(root, file);
  const check = spawnSync(process.execPath, ['--check', full], { encoding: 'utf8' });
  if (check.status === 0) pass(`JavaScript syntax valid: ${file}`);
  else fail(`JavaScript syntax check failed for ${file}: ${check.stderr || check.stdout}`);
}

if (manifest.host_permissions?.some((p) => p === 'https://www.netflix.com/*')) {
  pass('host access is limited to Netflix origin patterns');
} else {
  fail('expected Netflix-only host permission pattern was not found');
}

if (manifest.permissions?.includes('debugger')) fail('debugger permission should not be present');
else pass('no Chrome debugger permission requested');

if (errors.length) {
  console.error('\nValidation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('\nStatic checks passed. These checks do not test the extension against a live Netflix session.');
