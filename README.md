# Hookpost MCP server, CLI and n8n node

**Hookpost by Hookstep.** A social media scheduler you can drive from Claude, Cursor, VS Code, Gemini CLI and other AI assistants. (Not related to the Shopify Flow app called HookPost.)

Website: https://hookpost.hookstep.in · Setup guide: https://hookpost.hookstep.in/mcp

## What it does

Hookpost runs a hosted MCP server. Connect your AI assistant to it once, and the assistant can:

- list the social channels connected to your Hookpost workspace
- read each network's rules: character limits, media rules and the settings a post needs
- save posts to your Hookpost calendar as drafts, as scheduled posts, or publish them now
- list what is scheduled between two dates, and change the network settings of a post that has not gone out yet
- import an image or video from a public URL into your media library

Posts from an assistant land in the same calendar as posts written in the app, with an MCP badge, and go through the same checks as the editor. If a post breaks a network's rules, the assistant gets the reason back. There is no delete tool: deleting, and editing the text or date of an existing post, stay in the app.

There is nothing to install for the MCP server. It is one URL:

```
https://hookpost.hookstep.in/api/mcp
```

Your workspace API key goes in an `Authorization: Bearer` header. Copy the key from **Settings → Developers** in Hookpost. For a client that cannot send headers, put the key in the path instead: `https://hookpost.hookstep.in/api/mcp/YOUR_API_KEY`.

Treat the key like a password. It gives full access to your workspace's channels and posts, so keep it out of shared configs and public repos.

## Set it up in your assistant

### Claude Code

```bash
claude mcp add --transport http hookpost https://hookpost.hookstep.in/api/mcp \
  --header "Authorization: Bearer YOUR_API_KEY"
```

Check it with `claude mcp list`.

Or install the Hookpost plugin, which adds the server plus a skill that tells Claude to check each network's rules and save drafts first. Claude Code asks for your API key once and keeps it in your system's credential store:

```
/plugin marketplace add jatinder14/hookpost-mcp
/plugin install hookpost@hookpost
```

### Claude (claude.ai and Claude Desktop)

Go to **Customize → Connectors → + Add → Add custom connector**, paste the URL with your key in the path, and choose no sign-in:

```
https://hookpost.hookstep.in/api/mcp/YOUR_API_KEY
```

Claude adds remote servers as connectors, not through `claude_desktop_config.json`. On Claude's free plan you get one custom connector. If Claude Desktop can't connect that way, use the `mcp-remote` bridge in `claude_desktop_config.json` (it needs Node.js):

```json
{
  "mcpServers": {
    "hookpost": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://hookpost.hookstep.in/api/mcp/YOUR_API_KEY"]
    }
  }
}
```

`mcp-remote` is a third-party bridge that runs on your machine and forwards to the hosted server.

### ChatGPT

A Hookpost app for ChatGPT is not available yet. Until it is, draft in ChatGPT and paste into the Hookpost editor, or use one of the clients on this page.

### Cursor

`.cursor/mcp.json` in a project, or `~/.cursor/mcp.json` for all projects:

```json
{
  "mcpServers": {
    "hookpost": {
      "url": "https://hookpost.hookstep.in/api/mcp",
      "headers": { "Authorization": "Bearer YOUR_API_KEY" }
    }
  }
}
```

### VS Code (Copilot agent mode)

`.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "hookpost": {
      "type": "http",
      "url": "https://hookpost.hookstep.in/api/mcp",
      "headers": { "Authorization": "Bearer YOUR_API_KEY" }
    }
  }
}
```

### Gemini CLI

Install this repo as an extension. It asks for your API key once and keeps it in your system keychain:

```bash
gemini extensions install https://github.com/jatinder14/hookpost-mcp
```

Or add the server by hand to `~/.gemini/settings.json`. Use `httpUrl`, not `url` (in Gemini CLI, `url` means an SSE server):

```json
{
  "mcpServers": {
    "hookpost": {
      "httpUrl": "https://hookpost.hookstep.in/api/mcp",
      "headers": { "Authorization": "Bearer YOUR_API_KEY" }
    }
  }
}
```

### Codex CLI

`~/.codex/config.toml`. Codex reads the key from the `HOOKPOST_API_KEY` environment variable, so it never sits in the file:

```toml
[mcp_servers.hookpost]
url = "https://hookpost.hookstep.in/api/mcp"
bearer_token_env_var = "HOOKPOST_API_KEY"
```

Windsurf and other clients: see https://hookpost.hookstep.in/mcp.

## Tools

| Tool | What it does |
|---|---|
| `integrationList` | Lists your connected channels, optionally for one customer group. |
| `groupList` | Lists your customer groups. |
| `integrationSchema` | Returns a network's rules, character limit and the settings a post needs. |
| `triggerTool` | Calls a channel helper, for example to fetch your Pinterest boards. |
| `integrationSchedulePostTool` | Creates posts on one or more channels: as a draft, scheduled for a time, or published now. |
| `postsListTool` | Lists posts between two dates with their state (queued, draft, published or error). |
| `postSettingsTool` | Changes the network settings of a post that has not gone out yet. Text and date stay as they are. |
| `uploadFromUrlTool` | Imports an image or video from a public URL into your media library. |
| `generateImageTool` | Generates an AI image for a post, from the plan's AI image allowance. |
| `generateVideoOptions`, `videoFunctionTool`, `generateVideoTool` | AI video helpers. No plan on sale includes video credits today. |

## Prompts to try

- "List my Hookpost channels. Write a launch post for LinkedIn and a shorter one for Threads, check both against the network limits, and save them as drafts for tomorrow 9:00."
- "Summarise the blog post at this URL as a LinkedIn post and save it as a draft in Hookpost."
- "List my Hookpost posts for the next 14 days and tell me which days have nothing scheduled on LinkedIn."

## Command line

The `hookpost` CLI uses the same API key. It needs Node.js 18 or later.

```bash
npm install -g hookpost
hookpost auth login
hookpost channels
hookpost post "Hello" --channel abc123
```

With no `--at`, a post goes into the next free slot in your posting schedule. Add `--at` with an ISO date for an exact time, `--now` to publish straight away, or `--draft` to save a draft. In CI, set `HOOKPOST_API_KEY` instead of signing in. Source: [`cli/`](cli/).

## n8n

The `n8n-nodes-hookpost` community node creates, lists and deletes posts, lists channels, finds the next free slot and uploads media from a URL. In n8n, go to **Settings → Community Nodes → Install** and enter `n8n-nodes-hookpost`. Source: [`n8n-node/`](n8n-node/).

## Plans and pricing

The MCP server, CLI and REST API come with Hookpost's Standard and Pro plans. Each plan starts with a 3-day trial. Current prices, in USD and INR, are at https://hookpost.hookstep.in/pricing.

## What's in this repo

| Path | What it is |
|---|---|
| [`cli/`](cli/) | Source of the [`hookpost`](https://www.npmjs.com/package/hookpost) CLI on npm |
| [`n8n-node/`](n8n-node/) | Source of the [`n8n-nodes-hookpost`](https://www.npmjs.com/package/n8n-nodes-hookpost) community node on npm |
| [`gemini-extension.json`](gemini-extension.json) | Gemini CLI extension that connects to the hosted MCP server |
| [`plugins/hookpost/`](plugins/hookpost/) | Claude Code plugin (marketplace in [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json)) |
| [`llms-install.md`](llms-install.md) | Setup steps for AI agents such as Cline |
| [`server.json`](server.json) | The server's entry in the [official MCP Registry](https://registry.modelcontextprotocol.io), as `in.hookstep/hookpost` |

The MCP server itself is hosted by Hookpost; its code is not in this repo.

## Support

Email support@hookstep.in, or open an issue here. Docs: https://hookpost.hookstep.in/docs/public-api.

## Licence

MIT. Copyright (c) 2026 Hookstep. See [LICENSE](LICENSE).
