import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

// The tools /mcp-oauth lists (live tools/list, 25 Nov 2026).
const OAUTH_TOOLS = [
  'list_channels', 'create_channel_connect_link', 'list_customer_groups', 'get_platform_post_rules',
  'list_pinterest_boards', 'list_slack_channels', 'list_discord_channels', 'list_wordpress_post_options',
  'create_post', 'list_posts', 'update_post_settings', 'update_post_media', 'upload_media_from_url',
];

test('ChatGPT skill names only tools the server lists', () => {
  const skill = read('chatgpt/skills/hookpost/SKILL.md');
  const named = [...skill.matchAll(/`([a-z]+(?:_[a-z]+)+)`/g)].map((m) => m[1]);
  assert.ok(named.length > 0);
  for (const name of named) assert.ok(OAUTH_TOOLS.includes(name), `${name} is not a live tool`);
});

test('ChatGPT listing states the current price', () => {
  const plugin = JSON.parse(read('chatgpt/plugin.json'));
  const text = plugin.extensions['com.openai'].interface.longDescription;
  assert.match(text, /\$7 a month/);
  assert.doesNotMatch(text, /\$19|\$29/);
});
