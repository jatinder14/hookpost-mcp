// Checks every listing manifest in this repo before it is submitted anywhere:
// the Microsoft 365 / Copilot package, the Copilot Studio connector, the Windsurf
// config and the MCP Registry server.json. Run: cd tests && npm ci && npm test
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
// schemas/MicrosoftTeams.v1.30.schema.json is Microsoft's published file, unmodified:
// https://developer.microsoft.com/json-schemas/teams/v1.30/MicrosoftTeams.schema.json
// sha256 dfc85799e94527a16a622988620c82de1f58e790f97001e5e6bbe37fcf6846df (2 Nov 2026)
import { createHash } from 'node:crypto';
import Ajv04 from 'ajv-draft-04';
import addFormats from 'ajv-formats';
import { buildPackage, fillManifest, PACKAGE_DIR, PACKAGE_FILES } from '../scripts/build-m365-package.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const readJson = (path) => JSON.parse(read(path));

const MCP_URL = 'https://hookpost.hookstep.in/api/mcp';
const MCP_OAUTH_URL = 'https://hookpost.hookstep.in/mcp-oauth';
const TOOL_NAMES = [
  'groupList',
  'integrationList',
  'integrationSchema',
  'triggerTool',
  'integrationSchedulePostTool',
  'postsListTool',
  'postSettingsTool',
  'uploadFromUrlTool',
];

// Minimal PNG reader: size, colour type and decoded RGBA pixels (8-bit RGBA only).
function readPng(path) {
  const buf = readFileSync(path);
  assert.equal(buf.subarray(1, 4).toString('ascii'), 'PNG', `${path} is not a PNG`);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf[24];
  const colorType = buf[25];
  const idat = [];
  for (let offset = 8; offset < buf.length; ) {
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
    if (type === 'IDAT') idat.push(buf.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  return { width, height, bitDepth, colorType, data: () => unfilter(inflateSync(Buffer.concat(idat)), width, height) };
}

function unfilter(raw, width, height) {
  const bpp = 4;
  const stride = width * bpp;
  const out = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const value = raw[y * (stride + 1) + 1 + x];
      const a = x >= bpp ? out[y * stride + x - bpp] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? out[(y - 1) * stride + x - bpp] : 0;
      const paeth = () => {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      };
      const predictor = [0, a, b, (a + b) >> 1, paeth()][filter];
      out[y * stride + x] = (value + predictor) & 0xff;
    }
  }
  return out;
}

const listingFiles = (dir = ROOT) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (['node_modules', '.git', 'tests'].includes(name)) return [];
    if (statSync(path).isDirectory()) return listingFiles(path);
    return /\.(json|md)$/.test(name) && name !== 'package-lock.json' ? [relative(ROOT, path)] : [];
  });

describe('every listing file', () => {
  test('every JSON file parses', () => {
    for (const file of listingFiles().filter((f) => f.endsWith('.json'))) {
      assert.doesNotThrow(() => readJson(file), `${file} is not valid JSON`);
    }
  });

  test('no listing still offers the retired 3-day trial', () => {
    for (const file of listingFiles()) {
      // Trials are off (owner decision, 29 Oct 2026): no listing may offer one.
      assert.doesNotMatch(read(file), /\btrials?\b/i, `${file} mentions a trial`);
    }
  });

  test('every price quoted is the current one', () => {
    // Standard $19 / Rs 599, Pro $29 / Rs 1,999 (hookpost.hookstep.in/pricing, 2 Nov 2026)
    const allowed = new Set(['$19', '$29', '599', '1,999']);
    for (const file of listingFiles()) {
      for (const price of read(file).match(/\$\d[\d,]*|(?:\bRs\.?|₹)\s?\d[\d,]*/g) || []) {
        const amount = price.replace(/^(?:Rs\.?|₹)\s?/, '');
        assert.ok(allowed.has(amount) || allowed.has(price), `${file} quotes ${price}`);
      }
      // Each plan carries its own price: Standard is never $29 / 1,999, Pro never $19 / 599.
      assert.doesNotMatch(read(file), /Standard[^.$₹]{0,30}(?:\$29|(?:Rs\.?|₹)\s?1,999)/, `${file} prices Standard as Pro`);
      assert.doesNotMatch(read(file), /\bPro[^.$₹]{0,30}(?:\$19|(?:Rs\.?|₹)\s?599)/, `${file} prices Pro as Standard`);
    }
  });
});

describe('Microsoft 365 / Copilot package', () => {
  const manifest = readJson('microsoft/m365-package/manifest.json');
  const tools = readJson('microsoft/m365-package/toolDescription.json').tools;

  test('the vendored v1.30 schema is the published Microsoft file, unmodified', () => {
    const hash = createHash('sha256').update(readFileSync(join(ROOT, 'tests/schemas/MicrosoftTeams.v1.30.schema.json'))).digest('hex');
    assert.equal(hash, 'dfc85799e94527a16a622988620c82de1f58e790f97001e5e6bbe37fcf6846df');
  });

  test('manifest validates against the app manifest v1.30 schema', () => {
    const ajv = new Ajv04({ allErrors: true, strict: false });
    addFormats(ajv);
    const validate = ajv.compile(readJson('tests/schemas/MicrosoftTeams.v1.30.schema.json'));
    const filled = JSON.parse(fillManifest(read('microsoft/m365-package/manifest.json'), 'https://hookpost-mcp-kv.vault.azure.net/'));
    assert.ok(validate(filled), JSON.stringify(validate.errors, null, 2));
    assert.equal(manifest.manifestVersion, '1.30');
  });

  test('the connector points at the OAuth endpoint with Azure Key Vault auth', () => {
    const [connector] = manifest.agentConnectors;
    const server = connector.toolSource.remoteMcpServer;
    assert.equal(manifest.agentConnectors.length, 1);
    assert.equal(server.mcpServerUrl, MCP_OAUTH_URL);
    assert.equal(server.authorization.type, 'AzureKeyVault');
    assert.equal(server.authorization.referenceId, '${{HOOKPOST_KEYVAULT_URI}}');
    assert.equal(server.mcpToolDescription.file, 'toolDescription.json');
  });

  test('manifest and tool file are ASCII only (Microsoft rejects other characters)', () => {
    for (const file of ['manifest.json', 'toolDescription.json']) {
      assert.match(read(`microsoft/m365-package/${file}`), /^[\x00-\x7f]*$/, `${file} has non-ASCII characters`);
    }
  });

  test('descriptions fit Microsoft limits and carry no links', () => {
    assert.ok(manifest.name.short.length <= 30);
    assert.ok(manifest.name.full.length <= 100);
    assert.ok(manifest.description.short.length <= 80);
    assert.ok(manifest.description.full.length <= 4000);
    for (const text of [manifest.description.short, manifest.description.full, manifest.agentConnectors[0].description]) {
      assert.doesNotMatch(text, /https?:\/\//);
    }
  });

  test('tool file lists exactly the server tools, in shapes Copilot Studio accepts', () => {
    assert.deepEqual(tools.map((t) => t.name).sort(), [...TOOL_NAMES].sort());
    const walk = (schema, path) => {
      assert.ok(!('$ref' in schema), `${path} uses $ref`);
      assert.ok(!Array.isArray(schema.type), `${path} has a type array`);
      for (const [key, child] of Object.entries(schema.properties || {})) walk(child, `${path}.${key}`);
      if (schema.items) walk(schema.items, `${path}[]`);
    };
    for (const tool of tools) {
      assert.ok(tool.description.trim().length > 0, `${tool.name} has no description`);
      assert.equal(tool.inputSchema.type, 'object');
      walk(tool.inputSchema, tool.name);
    }
  });

  test('colour icon is 192x192 and outline icon is 32x32 white on transparent', () => {
    const color = readPng(join(PACKAGE_DIR, 'color.png'));
    assert.deepEqual([color.width, color.height], [192, 192]);
    const outline = readPng(join(PACKAGE_DIR, 'outline.png'));
    assert.deepEqual([outline.width, outline.height, outline.bitDepth, outline.colorType], [32, 32, 8, 6]);
    const pixels = outline.data();
    let opaque = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] === 0) continue;
      opaque++;
      assert.deepEqual([...pixels.subarray(i, i + 3)], [255, 255, 255], `outline pixel ${i / 4} is not white`);
    }
    assert.ok(opaque > 50, 'outline icon is empty');
  });
});

describe('M365 package build', () => {
  test('refuses to build without a Key Vault URI', () => {
    const run = () => execFileSync('node', [join(ROOT, 'scripts/build-m365-package.mjs'), join(tmpdir(), 'never.zip')], {
      env: { ...process.env, HOOKPOST_KEYVAULT_URI: '' },
      stdio: 'pipe',
    });
    assert.throws(run, /HOOKPOST_KEYVAULT_URI/);
  });

  test('refuses anything that is not a Key Vault root URI', () => {
    const template = read('microsoft/m365-package/manifest.json');
    for (const bad of [
      'http://hookpost-mcp-kv.vault.azure.net/',
      'https://hookpost-mcp-kv.vault.azure.net/secrets/ClientSecret',
      'https://hookpost-mcp-kv.vault.azure.net',
      'https://evil.example.com/.vault.azure.net/',
      'https://hookpost-mcp-kv.vault.azure.net.evil.com/',
      'https://x.vault.azure.net/',
      'https://hookpost-mcp-kv.vault.azure.net/", "type": "None',
    ]) {
      assert.throws(() => fillManifest(template, bad), /Key Vault URI/, bad);
    }
  });

  test('builds a zip with the five files at its root and the vault filled in', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hookpost-m365-test-'));
    try {
      const zip = buildPackage('https://hookpost-mcp-kv.vault.azure.net/', join(dir, 'package.zip'));
      const listing = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).trim().split('\n').sort();
      assert.deepEqual(listing, [...PACKAGE_FILES].sort());
      const manifest = JSON.parse(execFileSync('unzip', ['-p', zip, 'manifest.json'], { encoding: 'utf8' }));
      assert.equal(
        manifest.agentConnectors[0].toolSource.remoteMcpServer.authorization.referenceId,
        'https://hookpost-mcp-kv.vault.azure.net/'
      );
      // The template in the repo keeps its placeholder.
      assert.match(read('microsoft/m365-package/manifest.json'), /\$\{\{HOOKPOST_KEYVAULT_URI\}\}/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('Copilot Studio custom connector', () => {
  const swagger = readJson('microsoft/copilot-studio-connector/apiDefinition.swagger.json');
  const properties = readJson('microsoft/copilot-studio-connector/apiProperties.json');

  test('one streamable MCP operation at the hosted server', () => {
    assert.equal(swagger.swagger, '2.0');
    assert.equal(`https://${swagger.host}${swagger.basePath}${Object.keys(swagger.paths)[0]}`, MCP_URL);
    const operation = swagger.paths['/mcp'].post;
    assert.equal(operation['x-ms-agentic-protocol'], 'mcp-streamable-1.0');
  });

  test('the API key goes in the raw-key header, never in the URL', () => {
    assert.deepEqual(swagger.securityDefinitions.api_key, { type: 'apiKey', in: 'header', name: 'x-hookpost-api-key' });
    assert.equal(properties.properties.connectionParameters.api_key.type, 'securestring');
  });
});

describe('Windsurf and the MCP Registry', () => {
  const server = readJson('server.json');

  test('Windsurf config uses serverUrl and reads the key from the environment', () => {
    const { hookpost } = readJson('windsurf/mcp_config.json').mcpServers;
    assert.equal(hookpost.serverUrl, MCP_URL);
    assert.equal(hookpost.headers.Authorization, 'Bearer ${env:HOOKPOST_API_KEY}');
  });

  test('server.json points at the same hosted server', () => {
    assert.equal(server.name, 'in.hookstep/hookpost');
    assert.equal(server.remotes[0].url, MCP_URL);
    assert.match(server.version, /^\d+\.\d+\.\d+$/);
  });
});

// Integration: compares toolDescription.json with the live server. Needs a
// Hookpost API key, so it is skipped unless HOOKPOST_API_KEY is set.
test('toolDescription.json matches the live tools/list', { skip: !process.env.HOOKPOST_API_KEY }, async () => {
  const response = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.HOOKPOST_API_KEY}`,
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  });
  assert.equal(response.status, 200);
  const text = await response.text();
  const body = JSON.parse(text.startsWith('{') ? text : text.match(/^data: (.*)$/m)[1]);
  const live = Object.fromEntries(body.result.tools.map((t) => [t.name, t]));
  const packaged = readJson('microsoft/m365-package/toolDescription.json').tools;
  assert.deepEqual(Object.keys(live).sort(), packaged.map((t) => t.name).sort());
  for (const tool of packaged) {
    assert.deepEqual(tool.inputSchema, live[tool.name].inputSchema, `${tool.name} schema drifted`);
    assert.equal(tool.description, live[tool.name].description, `${tool.name} description drifted`);
  }
});

test('the package folder holds nothing that is not shipped or documented', () => {
  const extra = readdirSync(PACKAGE_DIR).filter((f) => !PACKAGE_FILES.includes(f) && f !== 'make-outline-icon.mjs');
  assert.deepEqual(extra, []);
  assert.ok(existsSync(join(PACKAGE_DIR, 'make-outline-icon.mjs')));
});
