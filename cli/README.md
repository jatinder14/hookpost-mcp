# hookpost

Let your AI agent run your social media. `hookpost` is the command line for [Hookpost](https://hookpost.hookstep.in): Claude Code, Cursor, Codex CLI, OpenClaw or you can list channels, connect new ones, write, schedule and publish posts, attach media, and get a preview link for every post.

X, LinkedIn, Threads, Bluesky, Instagram, Facebook Pages, YouTube, TikTok, Pinterest, Discord, Slack, Telegram, Dev.to, Hashnode, WordPress, Nostr and Lemmy.

```bash
npx hookpost login
npx hookpost channels
npx hookpost post "Shipped dark mode today." --channel <id> --draft
```

## 1. Sign in

```bash
npx hookpost login
```

It prints a short code and opens your browser. Check the code matches, click **Approve**, and the terminal is signed in. There is no key to find or copy. The key is saved at `~/.hookpost/config.json`, readable only by you.

No browser (a server, CI, a container)? Use your workspace API key from **Settings → Developers** instead:

```bash
export HOOKPOST_API_KEY="your_key"          # nothing is written to disk
npx hookpost login --key "your_key"         # or save it
```

New workspaces get 3 free posts with no card needed, then the Hookpost plan is $7 a month. Prices: https://hookpost.hookstep.in/pricing

## 2. Give it to your agent

Each agent can use Hookpost two ways: the hosted **MCP server** (tools the agent calls directly) or this **CLI** (shell commands). Pick one.

### Claude Code

```bash
claude mcp add --transport http hookpost https://hookpost.hookstep.in/api/mcp \
  --header "Authorization: Bearer $HOOKPOST_API_KEY"
```

Or the plugin, which adds the server and a skill that checks each network's rules and saves drafts first:

```
/plugin marketplace add jatinder14/hookpost-mcp
/plugin install hookpost@hookpost
```

Or nothing at all: Claude Code can run `npx hookpost` itself once you have signed in.

### Cursor

`~/.cursor/mcp.json` (or `.cursor/mcp.json` in a project):

```json
{
  "mcpServers": {
    "hookpost": {
      "url": "https://hookpost.hookstep.in/api/mcp",
      "headers": { "Authorization": "Bearer ${env:HOOKPOST_API_KEY}" }
    }
  }
}
```

### Codex CLI

`~/.codex/config.toml`:

```toml
[mcp_servers.hookpost]
url = "https://hookpost.hookstep.in/api/mcp"
bearer_token_env_var = "HOOKPOST_API_KEY"
```

### OpenClaw

```bash
npx clawhub@latest install hookpost
npm install -g hookpost && hookpost login
```

The skill tells the agent which `hookpost` commands to run and to save drafts until you say otherwise.

### ChatGPT

ChatGPT signs in with OAuth, so no key. Add a custom MCP server (Settings → Apps & Connectors → Advanced → Developer mode → **Create**) with the URL `https://hookpost.hookstep.in/mcp-oauth`, choose OAuth, and sign in to Hookpost.

`hookpost mcp <client>` prints any of these for you: `claude-code`, `cursor`, `codex`, `openclaw`, `chatgpt`, `json`.

## 3. Commands

```
login                     Sign in from your browser (no key to copy)
login --key <key>         Sign in with an API key
logout | whoami

channels                  Connected channels and their ids
connect [platform]        A 24-hour link that connects a new channel
rules <channelId>         A channel's length limit, rules and settings schema

post "<text>"             Create a post
schedule "<text>" --at    Same, with a required time
posts [--days 7]          Posts in the next N days
preview <postId>          Link that shows the post as it will look
delete <postId>           Delete a post
slot <channelId>          Next free slot of a channel

upload <file|url>         Upload an image or video
analytics <channelId>     Channel analytics   [--days 7]
analytics post <postId>   Post analytics      [--days 7]

mcp [client]              MCP setup for an agent
```

`post` and `schedule` take:

| Option | What it does |
|---|---|
| `--channel <id>` | Channel to post to. Repeat it, or pass `a,b,c`, for several. |
| `--at <ISO date>` | When to publish, e.g. `2026-12-01T09:30:00Z`. A time with no zone is read as UTC. |
| `--now` | Publish straight away. |
| `--draft` | Save a draft; nothing goes out. |
| `--media <file\|url>` | Attach an image or video. Repeat for several. |
| `--thread "<text>"` | A follow-up under the post: a thread reply on X, Threads and Bluesky, a comment elsewhere. Repeatable. |
| `--settings <json>` | Per-channel settings (YouTube title, Pinterest board...). See `hookpost rules <channelId>`. |

With none of `--at`, `--now` or `--draft`, the post goes into the channel's next free slot.

### `--json`

Every command takes `--json`: one JSON value on stdout, progress on stderr, and errors as `{"error": "...", "status": 401}` with exit code 1. That is the mode for agents.

```bash
$ hookpost post "Hello" --channel cm123 --draft --json
{
  "type": "draft",
  "date": null,
  "posts": [
    {
      "postId": "cm9...",
      "integration": "cm123",
      "previewUrl": "https://hookpost.hookstep.in/p/cm9...?share=true"
    }
  ]
}
```

## Examples

```bash
# A thread on X, saved as a draft
hookpost post "I let Claude run my social media for a week. 1/" \
  --thread "2/ It writes, I approve." --channel <x-id> --draft

# One post to three channels at 9:30 UTC tomorrow
hookpost schedule "Launch day" --channel <x>,<linkedin>,<bluesky> --at 2026-12-01T09:30:00Z

# With an image
hookpost post "New dashboard" --media ./shot.png --channel <id>

# No LinkedIn yet? Get a link that connects it
hookpost connect linkedin
```

## Environment

| Variable | Use |
|---|---|
| `HOOKPOST_API_KEY` | Use this key instead of the saved one. |
| `HOOKPOST_API_URL` | Another API host (default `https://hookpost.hookstep.in/api`). |
| `NO_COLOR` | Plain output. |

Node.js 18 or later. API reference: https://hookpost.hookstep.in/docs/public-api · MCP: https://hookpost.hookstep.in/mcp · Support: support@hookstep.in

MIT licence. Hookpost by Hookstep.
