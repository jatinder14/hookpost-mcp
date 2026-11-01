// Builds the Microsoft 365 / Copilot MCP certification package, the zip uploaded
// to a Partner Center "Apps and Agents for M365 and Copilot" offer.
// See microsoft/README.md.
//
//   HOOKPOST_KEYVAULT_URI=https://<vault>.vault.azure.net/ node scripts/build-m365-package.mjs [out.zip]
//
// The Key Vault URI is the only value filled in at build time: it names the vault
// that holds the OAuth client secret, so it stays out of the repo.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACKAGE_DIR = fileURLToPath(new URL('../microsoft/m365-package/', import.meta.url));
export const PACKAGE_FILES = ['manifest.json', 'toolDescription.json', 'intro.md', 'color.png', 'outline.png'];
const PLACEHOLDER = '${{HOOKPOST_KEYVAULT_URI}}';
// Microsoft wants the vault URI itself (not a secret URI) in authorization.referenceId.
const VAULT_URI = /^https:\/\/[a-z0-9](?:[a-z0-9-]{1,22}[a-z0-9])\.vault\.azure\.net\/$/;

export function fillManifest(manifestText, vaultUri) {
  if (!VAULT_URI.test(vaultUri || '')) {
    throw new Error(
      'HOOKPOST_KEYVAULT_URI must be a Key Vault URI like https://hookpost-mcp-kv.vault.azure.net/ (vault root, trailing slash)'
    );
  }
  if (!manifestText.includes(PLACEHOLDER)) {
    throw new Error(`manifest.json has no ${PLACEHOLDER} placeholder`);
  }
  return manifestText.split(PLACEHOLDER).join(vaultUri);
}

export function buildPackage(vaultUri, outZip) {
  const manifest = fillManifest(readFileSync(join(PACKAGE_DIR, 'manifest.json'), 'utf8'), vaultUri);
  const staging = mkdtempSync(join(tmpdir(), 'hookpost-m365-'));
  try {
    writeFileSync(join(staging, 'manifest.json'), manifest);
    for (const file of PACKAGE_FILES.filter((f) => f !== 'manifest.json')) {
      copyFileSync(join(PACKAGE_DIR, file), join(staging, file));
    }
    rmSync(outZip, { force: true });
    // Files sit at the root of the zip, as Partner Center expects.
    execFileSync('zip', ['-q', '-X', outZip, ...PACKAGE_FILES], { cwd: staging });
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
  return outZip;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = resolve(process.argv[2] || 'hookpost-m365-package.zip');
  try {
    console.log(`Wrote ${buildPackage(process.env.HOOKPOST_KEYVAULT_URI, out)}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
