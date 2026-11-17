#!/usr/bin/env node
import { promises as fs } from 'fs';
import { homedir } from 'os';
import { basename, join, dirname } from 'path';
import { createInterface } from 'readline';
import { spawn } from 'child_process';

const CONFIG_DIR = join(homedir(), '.hookpost');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');
const DEFAULT_HOST = 'https://hookpost.hookstep.in/api';
const MCP_URL = 'https://hookpost.hookstep.in/api/mcp';
const VERSION: string = require('../package.json').version;

type Config = { apiKey?: string; host?: string };

// --json anywhere on the line: machine output for agents and scripts. Colour
// and progress lines are off, and the result is one JSON value on stdout.
const ARGV = process.argv.slice(2);
const JSON_OUT = ARGV.includes('--json');
const COLOR = !JSON_OUT && !process.env.NO_COLOR && process.stdout.isTTY;
const paint = (code: number) => (s: string) =>
  COLOR ? `\x1b[${code}m${s}\x1b[0m` : s;
const c = {
  dim: paint(2),
  bold: paint(1),
  red: paint(31),
  green: paint(32),
  cyan: paint(36),
};

/** Human lines go to stderr in --json mode, so stdout stays parseable. */
const say = (...parts: unknown[]) =>
  (JSON_OUT ? console.error : console.log)(...parts);
const out = (value: unknown, human: () => void) => {
  if (JSON_OUT) console.log(JSON.stringify(value, null, 2));
  else human();
};

async function readStored(): Promise<Config> {
  try {
    return JSON.parse(await fs.readFile(CONFIG_FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function readConfig(): Promise<Config> {
  // Environment wins over the stored file so CI can run without a login.
  const stored = await readStored();
  return {
    apiKey: process.env.HOOKPOST_API_KEY || stored.apiKey,
    host: process.env.HOOKPOST_API_URL || stored.host || DEFAULT_HOST,
  };
}

async function writeConfig(cfg: Config) {
  await fs.mkdir(dirname(CONFIG_FILE), { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(cfg, null, 2));
  // The key is a full-access credential, so keep it owner-readable only.
  await fs.chmod(CONFIG_FILE, 0o600);
}

const hostOf = (host?: string) => String(host || DEFAULT_HOST).replace(/\/+$/, '');

class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

async function request(
  method: string,
  url: string,
  init: { body?: unknown; headers?: Record<string, string>; raw?: any } = {}
) {
  const res = await fetch(url, {
    method,
    headers: {
      ...(init.raw ? {} : { 'Content-Type': 'application/json' }),
      'User-Agent': `hookpost-cli/${VERSION}`,
      ...(init.headers || {}),
    },
    body: init.raw ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
  });
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      (typeof data?.msg === 'string' && data.msg) ||
      (typeof data?.message === 'string' && data.message) ||
      (Array.isArray(data?.message) && data.message.join('; ')) ||
      (typeof data?.error === 'string' && data.error) ||
      (typeof data === 'string' && data) ||
      `HTTP ${res.status}`;
    throw new ApiError(res.status, msg, data);
  }
  return data;
}

async function api(
  method: 'GET' | 'POST' | 'DELETE' | 'PUT',
  path: string,
  body?: unknown,
  raw?: any
) {
  const { apiKey, host } = await readConfig();
  if (!apiKey) {
    throw new Error(
      'Not signed in. Run `hookpost login` (opens your browser), or set HOOKPOST_API_KEY.'
    );
  }
  // Hookpost takes the raw key: a Bearer prefix is rejected on /public/v1.
  return request(method, `${hostOf(host)}/public/v1${path}`, {
    body,
    raw,
    headers: { Authorization: apiKey },
  });
}

// One readline for every question of a command. A new interface per question
// lost piped input (`printf 'key\nhost\n' | hookpost auth login`): the first
// one read the whole buffer, the second question never got an answer, and the
// process ended with status 0 having saved nothing. Lines that arrive before
// their question are kept; when input ends, the questions left get undefined.
function prompter() {
  const rl = createInterface({ input: process.stdin, terminal: false });
  const lines: string[] = [];
  const waiting: ((line: string | undefined) => void)[] = [];
  let ended = false;
  rl.on('line', (line) => {
    const next = waiting.shift();
    if (next) next(line);
    else lines.push(line);
  });
  rl.on('close', () => {
    ended = true;
    while (waiting.length) waiting.shift()!(undefined);
  });
  return {
    ask(question: string): Promise<string | undefined> {
      process.stderr.write(question);
      if (lines.length) return Promise.resolve(lines.shift()!.trim());
      if (ended) return Promise.resolve(undefined);
      return new Promise((resolve) => waiting.push((line) => resolve(line?.trim())));
    },
    close() {
      rl.close();
    },
  };
}

const BOOLEAN_FLAGS = new Set(['json', 'now', 'draft', 'open', 'no-open', 'help', 'h']);

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const value = args[i + 1];
  return value === undefined || value.startsWith('--') ? undefined : value;
}

// Repeatable flag. `--channel a --channel b` and `--channel a,b` both work, and
// mixing them does too.
function flags(args: string[], name: string, split = true): string[] {
  const found: string[] = [];
  args.forEach((arg, i) => {
    if (arg !== `--${name}`) return;
    const value = args[i + 1];
    if (value === undefined || value.startsWith('--')) return;
    (split ? value.split(',') : [value])
      .map((v) => v.trim())
      .filter(Boolean)
      .forEach((v) => found.push(v));
  });
  return split ? [...new Set(found)] : found;
}

/** Arguments that are not flags or flag values. */
function positionals(args: string[]): string[] {
  const res: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      if (!BOOLEAN_FLAGS.has(a.slice(2)) && args[i + 1] !== undefined && !args[i + 1].startsWith('--')) i++;
      continue;
    }
    res.push(a);
  }
  return res;
}

function openBrowser(url: string) {
  const cmd =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
    child.on('error', () => undefined);
    child.unref();
  } catch {
    /* no browser here: the link is printed anyway */
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const stripHtml = (s: unknown) => String(s || '').replace(/<[^>]*>/g, '');

const HELP = `
${c.bold('hookpost')} ${VERSION} - you, or your AI agent, post to X, LinkedIn, Threads, Bluesky and more

${c.bold('Sign in')}
  login                     Sign in from your browser (no key to copy)
  login --key <key>         Sign in with an API key (Settings > Developers)
  logout                    Remove the stored key
  whoami                    Check the stored key works

${c.bold('Channels')}
  channels                  List connected channels (ids for --channel)
  connect [platform]        Link that connects a new channel (x, linkedin,
                            threads, bluesky, instagram...); no platform lists them
  rules <channelId>         A channel's length limit, rules and settings schema

${c.bold('Posts')}
  post "<text>"             Create a post (next free slot unless --at/--now/--draft)
  schedule "<text>" --at    Same as post, with a required time
  posts [--days 7]          List posts in the next N days
  preview <postId>          Link that shows the post as it will look
  delete <postId>           Delete a post (and its group)
  slot <channelId>          Next free slot of a channel

${c.bold('Media and analytics')}
  upload <file|url>         Upload an image or video; prints its id and path
  analytics <channelId>     Channel analytics  [--days 7]
  analytics post <postId>   Post analytics     [--days 7]

${c.bold('AI agents')}
  mcp [client]              MCP setup for claude-code, cursor, codex,
                            openclaw, chatgpt, json

${c.bold('post / schedule options')}
  --channel <id>            Channel(s); repeat it or pass a comma list
  --at <ISO date>           When to publish, e.g. 2026-12-01T09:30:00Z
  --now                     Publish immediately
  --draft                   Save as a draft (nothing is published)
  --media <file|url>        Attach an image/video; repeat for several
  --thread "<text>"         A follow-up under the post (thread reply on X,
                            Threads, Bluesky; a comment elsewhere); repeatable
  --settings <json>         Per-channel settings (see \`hookpost rules\`)

${c.bold('Global')}
  --json                    Machine-readable output on stdout
  --version                 Print the version

${c.bold('Examples')}
  npx hookpost login
  hookpost channels --json
  hookpost connect linkedin
  hookpost post "Shipped dark mode today." --channel abc123 --draft
  hookpost post "Launch day" --channel abc123,def456 --at 2026-12-01T09:30:00Z
  hookpost post "1/ How we got here" --thread "2/ The details" --channel abc123
  hookpost post "New screenshot" --media ./shot.png --channel abc123

${c.bold('Environment')}
  HOOKPOST_API_KEY          Use instead of \`login\` (handy in CI and agents)
  HOOKPOST_API_URL          Override the API host

Docs: https://hookpost.hookstep.in/docs/public-api
`;

// ---------- sign in ----------

async function verifyKey(apiKey: string, host: string) {
  await request('GET', `${hostOf(host)}/public/v1/is-connected`, {
    headers: { Authorization: apiKey },
  });
}

async function deviceLogin(host: string, open: boolean) {
  const start = await request('POST', `${hostOf(host)}/cli-auth/device`);
  const url: string = start.verification_uri_complete;
  say('');
  say(`  Your code: ${c.bold(start.user_code)}`);
  say(`  Approve it here: ${c.cyan(url)}`);
  say('');
  if (JSON_OUT) {
    // An agent reading --json gets the link at once, before the wait.
    console.error(JSON.stringify({ user_code: start.user_code, verification_uri_complete: url }));
  }
  if (open) openBrowser(url);
  say(c.dim('Waiting for approval (Ctrl+C to stop)...'));

  const deadline = Date.now() + Number(start.expires_in || 600) * 1000;
  let interval = Math.max(1, Number(start.interval || 3)) * 1000;
  while (Date.now() < deadline) {
    await sleep(interval);
    try {
      const done = await request('POST', `${hostOf(host)}/cli-auth/token`, {
        body: { device_code: start.device_code },
      });
      return String(done.api_key);
    } catch (err) {
      const code = (err as ApiError).body && ((err as ApiError).body as any).error;
      if (code === 'authorization_pending') continue;
      if (code === 'slow_down') {
        interval += 2000;
        continue;
      }
      if (code === 'access_denied') throw new Error('Sign-in was denied in the browser.');
      if (code === 'expired_token') throw new Error('The code expired. Run `hookpost login` again.');
      throw err;
    }
  }
  throw new Error('The code expired. Run `hookpost login` again.');
}

async function login(argv: string[]) {
  const host = flag(argv, 'host') || process.env.HOOKPOST_API_URL || DEFAULT_HOST;
  let key = flag(argv, 'key');
  if (key === '-') {
    const input = prompter();
    try {
      key = await input.ask('');
    } finally {
      input.close();
    }
  }
  if (!key) key = await deviceLogin(host, !argv.includes('--no-open'));
  await verifyKey(key, host);
  await writeConfig({ apiKey: key, host });
  out({ signedIn: true, host, config: CONFIG_FILE }, () =>
    say(c.green(`Signed in. Key saved to ${CONFIG_FILE}`))
  );
}

// ---------- media ----------

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  pdf: 'application/pdf',
};

async function upload(source: string): Promise<{ id: string; path: string; name?: string }> {
  if (/^https?:\/\//i.test(source)) {
    return api('POST', '/upload-from-url', { url: source });
  }
  const buf = await fs.readFile(source);
  const ext = source.split('.').pop()?.toLowerCase() || '';
  const form = new FormData();
  form.append(
    'file',
    new Blob([buf], { type: MIME[ext] || 'application/octet-stream' }),
    basename(source)
  );
  return api('POST', '/upload', undefined, form);
}

// ---------- commands ----------

async function createPost(argv: string[], requireAt: boolean) {
  const text = positionals(argv)[1];
  if (!text) throw new Error(`Usage: hookpost ${argv[0]} "your text" --channel <id>`);
  const channels = flags(argv, 'channel');
  if (!channels.length)
    throw new Error('--channel is required. Run `hookpost channels` to list them.');

  const type = argv.includes('--now') ? 'now' : argv.includes('--draft') ? 'draft' : 'schedule';
  let date = flag(argv, 'at');
  if (requireAt && !date) throw new Error('schedule needs --at <ISO date>, e.g. 2026-12-01T09:30:00Z');
  if (date && Number.isNaN(Date.parse(date))) throw new Error(`--at is not a date: ${date}`);
  if (date && !/[zZ]|[+-]\d\d:?\d\d$/.test(date)) {
    // A time with no zone would be read as UTC by the server; say so.
    say(c.dim(`--at has no time zone, so it is read as UTC: ${date}Z`));
    date = `${date}Z`;
  }
  if (type === 'schedule' && !date) {
    // One post group carries one date, so the first channel's next free slot
    // is the one that applies to all of them.
    const slot = await api('GET', `/find-slot/${encodeURIComponent(channels[0])}`);
    date = slot?.date;
    say(c.dim(`No --at given, using the next free slot: ${date}`));
  }

  const settingsRaw = flag(argv, 'settings');
  let settings: unknown;
  if (settingsRaw) {
    try {
      settings = JSON.parse(settingsRaw);
    } catch {
      throw new Error('--settings must be JSON, e.g. \'{"title":"My video"}\'');
    }
    if (channels.length > 1) {
      // Per-channel settings (YouTube title, Pinterest board...) sent to
      // several channels would be nonsense for most of them.
      throw new Error('--settings applies to a single channel. Post to one channel at a time when using it.');
    }
  }

  const media = [];
  for (const m of flags(argv, 'media', false)) {
    const uploaded = await upload(m);
    say(c.dim(`Uploaded ${m}`));
    media.push({ id: uploaded.id, path: uploaded.path });
  }
  const followUps = flags(argv, 'thread', false);
  const value = [
    { content: text, image: media },
    ...followUps.map((content) => ({ content, image: [] as unknown[] })),
  ];

  const res = await api('POST', '/posts', {
    creationMethod: 'CLI',
    type,
    date: date || new Date().toISOString(),
    shortLink: false,
    tags: [],
    posts: channels.map((id) => ({
      integration: { id },
      value,
      ...(settings ? { settings } : {}),
    })),
  });
  const created = Array.isArray(res) ? res : [res];
  out({ type, date: date || null, posts: created }, () => {
    const verb = type === 'draft' ? 'Draft saved' : type === 'now' ? 'Publishing now' : `Scheduled for ${date}`;
    say(c.green(`${verb} on ${channels.length} channel${channels.length > 1 ? 's' : ''}.`));
    for (const p of created) {
      say(`  ${c.cyan(p.postId || p.id || '?')}  ${c.dim(p.integration || '')}`);
      if (p.previewUrl) say(`  preview: ${p.previewUrl}`);
    }
  });
}

const MCP_SETUP: Record<string, () => string> = {
  'claude-code': () =>
    `claude mcp add --transport http hookpost ${MCP_URL} --header "Authorization: Bearer $HOOKPOST_API_KEY"`,
  cursor: () =>
    JSON.stringify(
      { mcpServers: { hookpost: { url: MCP_URL, headers: { Authorization: 'Bearer YOUR_HOOKPOST_API_KEY' } } } },
      null,
      2
    ) + '\n\n# Save as ~/.cursor/mcp.json (or .cursor/mcp.json in a project).',
  codex: () =>
    `# ~/.codex/config.toml\n[mcp_servers.hookpost]\nurl = "${MCP_URL}"\nbearer_token_env_var = "HOOKPOST_API_KEY"`,
  openclaw: () =>
    `npx clawhub@latest install hookpost\n# The skill drives this CLI: npm i -g hookpost && hookpost login`,
  chatgpt: () =>
    `ChatGPT > Settings > Apps & Connectors > Create\n  URL: ${MCP_URL}\n  Authentication: OAuth (sign in to Hookpost when asked)`,
  json: () =>
    JSON.stringify(
      {
        mcpServers: {
          hookpost: { type: 'http', url: MCP_URL, headers: { Authorization: 'Bearer YOUR_HOOKPOST_API_KEY' } },
        },
      },
      null,
      2
    ),
};

async function main() {
  const argv = ARGV.filter((a) => a !== '--json');
  const [cmd, sub] = argv;

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    console.log(HELP);
    return;
  }
  if (cmd === '--version' || cmd === '-v' || cmd === 'version') {
    console.log(VERSION);
    return;
  }

  if (cmd === 'login') return login(argv);
  if (cmd === 'logout' || (cmd === 'auth' && sub === 'logout')) {
    await fs.rm(CONFIG_FILE, { force: true });
    out({ signedIn: false }, () => say('Signed out.'));
    return;
  }
  if (cmd === 'whoami' || (cmd === 'auth' && sub === 'status')) {
    const { apiKey, host } = await readConfig();
    if (!apiKey) {
      out({ signedIn: false }, () => say('Not signed in. Run `hookpost login`.'));
      return;
    }
    await api('GET', '/is-connected');
    out({ signedIn: true, host, key: `${apiKey.slice(0, 6)}...` }, () =>
      say(`${c.green('Signed in')}  host=${host}  key=${apiKey.slice(0, 6)}...`)
    );
    return;
  }
  if (cmd === 'auth' && sub === 'login') {
    // Kept for scripts written against 0.1: asks for the key, then the host.
    if (flag(argv, 'key')) return login(argv);
    const input = prompter();
    let key: string | undefined;
    let host: string | undefined;
    try {
      key = await input.ask('API key (Settings -> Developers): ');
      if (!key) throw new Error('No key entered. Or run `hookpost login` to sign in from your browser.');
      host = (await input.ask(`API host [${DEFAULT_HOST}]: `)) || DEFAULT_HOST;
    } finally {
      input.close();
    }
    await verifyKey(key, host);
    await writeConfig({ apiKey: key, host });
    out({ signedIn: true, host, config: CONFIG_FILE }, () =>
      say(c.green(`Signed in. Key saved to ${CONFIG_FILE}`))
    );
    return;
  }
  if (cmd === 'auth') throw new Error('Usage: hookpost login | logout | whoami');

  if (cmd === 'channels') {
    const list = await api('GET', '/integrations');
    out(list, () => {
      if (!Array.isArray(list) || !list.length) {
        say('No channels connected yet. Run `hookpost connect <platform>` for a link that connects one.');
        return;
      }
      for (const ch of list) {
        say(
          `${c.cyan(ch.id)}  ${String(ch.identifier || '').padEnd(20)} ${ch.name}${
            ch.disabled ? c.red('  (disabled)') : ''
          }`
        );
      }
    });
    return;
  }

  if (cmd === 'connect') {
    const platform = positionals(argv)[1];
    if (!platform) {
      const res = await api('GET', '/connect-link');
      out(res, () => {
        say('Platforms a connect link can add:');
        say(`  ${(res.platforms || []).join(', ')}`);
        say(c.dim('Run `hookpost connect <platform>`.'));
      });
      return;
    }
    const link = await api('POST', '/connect-link', { platform });
    out(link, () => {
      say(`Open this link to connect ${link.platform} (works for 24 hours):`);
      say(`  ${c.cyan(link.url)}`);
      say(c.dim('Then run `hookpost channels` to get the new channel id.'));
    });
    if (argv.includes('--open')) openBrowser(link.url);
    return;
  }

  if (cmd === 'rules') {
    const id = positionals(argv)[1];
    if (!id) throw new Error('Usage: hookpost rules <channelId>');
    const res = await api('GET', `/integration-settings/${encodeURIComponent(id)}`);
    out(res?.output ?? res, () => console.log(JSON.stringify(res?.output ?? res, null, 2)));
    return;
  }

  if (cmd === 'post') return createPost(argv, false);
  if (cmd === 'schedule') return createPost(argv, true);

  if (cmd === 'posts') {
    const days = Number(flag(argv, 'days') || 7);
    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + days * 864e5).toISOString();
    const res = await api(
      'GET',
      `/posts?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
    );
    const posts = res?.posts || res || [];
    out(posts, () => {
      if (!posts.length) {
        say(`No posts in the next ${days} days.`);
        return;
      }
      for (const p of posts) {
        const when = new Date(p.publishDate).toISOString().replace('T', ' ').slice(0, 16);
        say(`${c.dim(when)}  ${String(p.state || p.status || '').padEnd(9)} ${c.cyan(p.id)}  ${stripHtml(p.content).slice(0, 50)}`);
      }
    });
    return;
  }

  if (cmd === 'preview') {
    const id = positionals(argv)[1];
    if (!id) throw new Error('Usage: hookpost preview <postId>');
    const res = await api('GET', `/posts/${encodeURIComponent(id)}/preview`);
    out(res, () => say(res.previewUrl));
    if (argv.includes('--open')) openBrowser(res.previewUrl);
    return;
  }

  if (cmd === 'delete') {
    const id = positionals(argv)[1];
    if (!id) throw new Error('Usage: hookpost delete <postId>');
    await api('DELETE', `/posts/${encodeURIComponent(id)}`);
    out({ deleted: id }, () => say(c.green(`Deleted ${id}`)));
    return;
  }

  if (cmd === 'slot') {
    const id = positionals(argv)[1];
    if (!id) throw new Error('Usage: hookpost slot <channelId>');
    const res = await api('GET', `/find-slot/${encodeURIComponent(id)}`);
    out(res, () => say(res.date));
    return;
  }

  if (cmd === 'upload') {
    const source = positionals(argv)[1];
    if (!source) throw new Error('Usage: hookpost upload <file|url>');
    const res = await upload(source);
    out(res, () => say(`${c.cyan(res.id)}  ${res.path}`));
    return;
  }

  if (cmd === 'analytics') {
    const days = Number(flag(argv, 'days') || 7);
    const pos = positionals(argv);
    if (!pos[1] || (pos[1] === 'post' && !pos[2]))
      throw new Error('Usage: hookpost analytics <channelId> | analytics post <postId>');
    const res =
      pos[1] === 'post'
        ? await api('GET', `/analytics/post/${encodeURIComponent(pos[2])}?date=${days}`)
        : await api('GET', `/analytics/${encodeURIComponent(pos[1])}?date=${days}`);
    out(res, () => {
      if (!Array.isArray(res) || !res.length) {
        say('No analytics for this period yet.');
        return;
      }
      for (const metric of res) {
        const total = (metric.data || []).reduce((sum: number, d: any) => sum + Number(d.total || 0), 0);
        say(`${String(metric.label).padEnd(24)} ${total}`);
      }
    });
    return;
  }

  if (cmd === 'mcp') {
    const client = positionals(argv)[1];
    if (!client || !MCP_SETUP[client]) {
      out({ url: MCP_URL, clients: Object.keys(MCP_SETUP) }, () => {
        say(`Hookpost MCP server: ${MCP_URL}`);
        say(`Run \`hookpost mcp <client>\` with one of: ${Object.keys(MCP_SETUP).join(', ')}`);
      });
      return;
    }
    out({ client, setup: MCP_SETUP[client]() }, () => console.log(MCP_SETUP[client]()));
    return;
  }

  throw new Error(`Unknown command: ${cmd}\nRun \`hookpost help\`.`);
}

main().catch((err) => {
  if (JSON_OUT) {
    console.log(
      JSON.stringify({ error: err.message, status: (err as ApiError).status ?? null }, null, 2)
    );
  } else {
    console.error(c.red(`Error: ${err.message}`));
  }
  process.exit(1);
});
