# Hookpost MCP server, CLI and n8n node

**Hookpost by Hookstep.** A social media scheduler your AI agent can run: Claude Code, Cursor, Codex CLI, OpenClaw, ChatGPT, VS Code, Gemini CLI, or plain `npx hookpost` in a terminal. (Not related to the Shopify Flow app called HookPost.)

[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install_Hookpost-0098FF?logo=visualstudiocode&logoColor=white)](https://vscode.dev/redirect/mcp/install?name=hookpost&inputs=%5B%7B%22type%22%3A%22promptString%22%2C%22id%22%3A%22hookpost_api_key%22%2C%22description%22%3A%22Hookpost%20API%20key%20%28Settings%20%3E%20Developers%29%22%2C%22password%22%3Atrue%7D%5D&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fhookpost.hookstep.in%2Fapi%2Fmcp%22%2C%22headers%22%3A%7B%22Authorization%22%3A%22Bearer%20%24%7Binput%3Ahookpost_api_key%7D%22%7D%7D) [![Add to Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=hookpost&config=eyJ1cmwiOiJodHRwczovL2hvb2twb3N0Lmhvb2tzdGVwLmluL2FwaS9tY3AiLCJoZWFkZXJzIjp7IkF1dGhvcml6YXRpb24iOiJCZWFyZXIgJHtlbnY6SE9PS1BPU1RfQVBJX0tFWX0ifX0%3D) [![Claude Code plugin](https://img.shields.io/badge/Claude_Code-Install_plugin-D97757?logo=claude&logoColor=white)](#claude-code) [![Gemini CLI extension](https://img.shields.io/badge/Gemini_CLI-Install_extension-4285F4?logo=googlegemini&logoColor=white)](#gemini-cli)

Website: https://hookpost.hookstep.in · Setup guide: https://hookpost.hookstep.in/mcp

## What it does

Hookpost runs a hosted MCP server. Connect your AI assistant to it once, and the assistant can:

- list the social channels connected to your Hookpost workspace
- hand you a link that connects a new channel (LinkedIn, X, Threads, Instagram, YouTube, TikTok and more), so a fresh workspace goes from zero channels to posting without leaving the chat
- read each network's rules: character limits, media rules and the settings a post needs
- save posts to your Hookpost calendar as drafts, as scheduled posts, or publish them now, and give you a preview link for each one
- list what is scheduled between two dates, and change the network settings of a post that has not gone out yet
- import an image or video from a public URL into your media library

Posts from an assistant land in the same calendar as posts written in the app, with an MCP badge, and go through the same checks as the editor. If a post breaks a network's rules, the assistant gets the reason back. There is no delete tool: deleting, and editing the text or date of an existing post, stay in the app.

There is nothing to install for the MCP server. It is one URL:

```
https://hookpost.hookstep.in/api/mcp
```

Your workspace API key goes in an `Authorization: Bearer` header. Copy the key from **Settings → Developers** in Hookpost. For a client that cannot send headers, put the key in the path instead: `https://hookpost.hookstep.in/api/mcp/YOUR_API_KEY`.

Behind a gateway that keeps the `Authorization` header for itself, such as Smithery, send the key as `x-hookpost-api-key: YOUR_API_KEY` instead (the raw key; a `Bearer ` prefix is also accepted). If a request carries both headers, `Authorization` wins.

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

ChatGPT connects with a sign-in, so there is no key to paste. On a plan that allows custom MCP servers, add one (Settings → Apps & Connectors → Advanced → Developer mode, then **Create**) with:

```
https://hookpost.hookstep.in/mcp-oauth
```

Choose **OAuth** and sign in to Hookpost when ChatGPT asks.

### OpenClaw

Install the Hookpost skill from ClawHub. It drives the `hookpost` CLI, so the agent can post, schedule, attach media and hand you connect and preview links:

```bash
npx clawhub@latest install hookpost
npm install -g hookpost
hookpost login
```

`hookpost login` opens your browser to approve the terminal, so there is no key to copy. On a server with no browser, set `HOOKPOST_API_KEY` instead.

### Cursor

Click **Add to Cursor** at the top of this page, then set `HOOKPOST_API_KEY` in your environment (Cursor reads `${env:HOOKPOST_API_KEY}` from it). Or add it by hand in `.cursor/mcp.json` in a project, or `~/.cursor/mcp.json` for all projects:

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

Click **Install in VS Code** at the top of this page. VS Code asks for your API key once and stores it as a secret. Or add it by hand in `.vscode/mcp.json` in your workspace:

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

### Kiro

Install the [Hookpost power](powers/hookpost/): in the Powers panel, choose **Add Custom Power → Import power from GitHub** and enter `https://github.com/jatinder14/hookpost-mcp/tree/main/powers/hookpost`. It signs in with OAuth, so there is no key to copy.

### Grok

Grok adds remote MCP servers as custom connectors: open [grok.com/connectors](https://grok.com/connectors), click **New Connector → Custom**, enter `https://hookpost.hookstep.in/mcp-oauth` and sign in with your Hookpost account. For Grok Build, the [`grok/hookpost/`](grok/hookpost/) plugin installs the same server with the `hookpost` skill.

### Windsurf

Open Windsurf's MCP settings, choose **View raw config** to open `mcp_config.json`, and add the `hookpost` entry from [`windsurf/mcp_config.json`](windsurf/mcp_config.json):

```json
{
  "mcpServers": {
    "hookpost": {
      "serverUrl": "https://hookpost.hookstep.in/api/mcp",
      "headers": {
        "Authorization": "Bearer ${env:HOOKPOST_API_KEY}"
      }
    }
  }
}
```

Windsurf reads `HOOKPOST_API_KEY` from your environment, so the key stays out of the file. On macOS an app opened from the Dock doesn't see variables set in `.zshrc`: open Windsurf from a terminal, or put the key in the file in place of `${env:HOOKPOST_API_KEY}`. Windsurf takes `serverUrl` for remote servers, not `url`. Restart Cascade after saving.

### Microsoft Copilot Studio

In your agent, go to **Tools → Add a tool → New tool → Model Context Protocol**. Enter `https://hookpost.hookstep.in/api/mcp` as the server URL, choose **API key** authentication with type **Header** and header name `x-hookpost-api-key`, then paste your key (without `Bearer`) when you create the connection. A ready-to-import custom connector and the Microsoft 365 Copilot package are in [`microsoft/`](microsoft/).

Other clients: see https://hookpost.hookstep.in/mcp.

## Tools

| Tool | What it does |
|---|---|
| `list_channels` | Lists your connected channels, optionally for one customer group. |
| `create_channel_connect_link` | Returns a 24-hour link that connects a new channel; the user opens it and approves on the network's own sign-in. |
| `list_customer_groups` | Lists your customer groups. |
| `get_platform_post_rules` | Returns a network's rules, character limit and the settings a post needs. |
| `list_pinterest_boards`, `list_slack_channels`, `list_discord_channels`, `list_wordpress_post_options` | Look up the ids a post on those networks needs. |
| `create_post` | Creates posts on one or more channels (draft, scheduled or now), with thread replies or comments, and returns a `previewUrl` for each. |
| `list_posts` | Lists posts between two dates with their state (queued, draft, published or error). |
| `update_post_settings` | Changes the network settings of a post that has not gone out yet. Text and date stay as they are. |
| `upload_media_from_url` | Imports an image or video from a public URL into your media library. |
| `generate_image` | Generates an AI image for a post, from the plan's AI credits. |
| `ask_hookpost` | Hands a plain-language request to the assistant built into Hookpost. |
| `list_video_options`, `get_video_option_values`, `generate_video` | AI video helpers. |

## Prompts to try

- "List my Hookpost channels. Write a launch post for LinkedIn and a shorter one for Threads, check both against the network limits, and save them as drafts for tomorrow 9:00."
- "Summarise the blog post at this URL as a LinkedIn post and save it as a draft in Hookpost."
- "List my Hookpost posts for the next 14 days and tell me which days have nothing scheduled on LinkedIn."

## Command line

`npx hookpost` is the same API from a terminal, for you or for an agent that prefers shell commands to MCP. Every command takes `--json`.

```bash
npx hookpost login                       # approve in the browser, no key to copy
npx hookpost channels
npx hookpost connect linkedin            # link that connects a channel
npx hookpost post "Hello" --channel abc123 --draft
npx hookpost preview <postId>
```

Full command list and agent setup: [`cli/README.md`](cli/README.md).

## n8n

The `n8n-nodes-hookpost` community node creates, lists and deletes posts, lists channels, finds the next free slot and uploads media from a URL. In n8n, go to **Settings → Community Nodes → Install** and enter `n8n-nodes-hookpost`. Source: [`n8n-node/`](n8n-node/).

## Plans and pricing

The MCP server, CLI and REST API come with the Hookpost plan. New workspaces get 3 free posts with no card needed; then the Hookpost plan is $7/month (₹699 in India). Current prices are at https://hookpost.hookstep.in/pricing.

## What's in this repo

| Path | What it is |
|---|---|
| [`cli/`](cli/) | Source of the [`hookpost`](https://www.npmjs.com/package/hookpost) CLI on npm |
| [`openclaw/hookpost/`](openclaw/hookpost/SKILL.md) | OpenClaw / ClawHub skill that drives the `hookpost` CLI |
| [`n8n-node/`](n8n-node/) | Source of the [`n8n-nodes-hookpost`](https://www.npmjs.com/package/n8n-nodes-hookpost) community node on npm |
| [`gemini-extension.json`](gemini-extension.json) | Gemini CLI extension that connects to the hosted MCP server |
| [`plugins/hookpost/`](plugins/hookpost/) | Claude Code plugin (marketplace in [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json)) |
| [`.cursor-plugin/`](.cursor-plugin/) and [`mcp.json`](mcp.json) | Cursor plugin: the hosted MCP server plus the [`hookpost` skill](skills/hookpost/SKILL.md) |
| [`powers/hookpost/`](powers/hookpost/) | Kiro power (Agent Plugins format): the hosted MCP server over OAuth plus the `hookpost` skill |
| [`grok/hookpost/`](grok/hookpost/) | Grok Build plugin: the hosted MCP server over OAuth plus the `hookpost` skill |
| [`llms-install.md`](llms-install.md) | Setup steps for AI agents such as Cline |
| [`windsurf/mcp_config.json`](windsurf/mcp_config.json) | Windsurf config for the hosted MCP server |
| [`microsoft/`](microsoft/) | Copilot Studio custom connector, and the Microsoft 365 / Copilot certification package ([how to submit it](microsoft/README.md)) |
| [`tests/`](tests/) | Checks for every listing manifest (`cd tests && npm ci && npm test`) |
| [`server.json`](server.json) | The server's entry in the [official MCP Registry](https://registry.modelcontextprotocol.io), as `in.hookstep/hookpost` |

The MCP server itself is hosted by Hookpost; its code is not in this repo.

## Listed on

[Official MCP Registry](https://registry.modelcontextprotocol.io/v0.1/servers?search=in.hookstep/hookpost) (`in.hookstep/hookpost`) · [GitHub MCP Registry](https://github.com/mcp/in.hookstep/hookpost) · [Glama](https://glama.ai/mcp/servers/jatinder14/hookpost-mcp) · [LobeHub](https://lobehub.com/mcp/jatinder14-hookpost-mcp) · [mcpservers.org](https://mcpservers.org/servers/jatinder14/hookpost-mcp) · [RapidAPI](https://rapidapi.com/hookstep-hookstep-default/api/hookpost-social-media-mcp-api)

[![jatinder14/hookpost-mcp MCP server](https://glama.ai/mcp/servers/jatinder14/hookpost-mcp/badges/score.svg)](https://glama.ai/mcp/servers/jatinder14/hookpost-mcp) [![MCP Badge](https://lobehub.com/badge/mcp/jatinder14-hookpost-mcp)](https://lobehub.com/mcp/jatinder14-hookpost-mcp)

## Support

Email support@hookstep.in, or open an issue here. Docs: https://hookpost.hookstep.in/docs/public-api. Privacy policy: https://hookpost.hookstep.in/privacy.

## Licence

MIT. Copyright (c) 2026 Hookstep. See [LICENSE](LICENSE).
