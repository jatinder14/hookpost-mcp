# Hookpost plugin for Grok Build

**Hookpost by Hookstep** is a hosted social media scheduler. This plugin connects Grok Build to Hookpost's hosted MCP server, so the agent can list the channels you connected in Hookpost (LinkedIn, X, Instagram, Threads, YouTube, Pinterest and more), read each network's rules, write a post for each network and save it as a draft or schedule it.

## What's in the plugin

| File | What it does |
|---|---|
| [`.grok-plugin/plugin.json`](.grok-plugin/plugin.json) | Plugin manifest |
| [`.mcp.json`](.mcp.json) | One remote MCP server, `https://hookpost.hookstep.in/mcp-oauth`, over Streamable HTTP with OAuth. Nothing runs on your machine |
| [`skills/hookpost/SKILL.md`](skills/hookpost/SKILL.md) | How the agent should use the tools: check channels and network rules first, save drafts by default, confirm before scheduling or publishing |

No hooks, commands, agents or local scripts.

## Sign-in

The first time the server connects, Grok Build opens the Hookpost sign-in page in your browser (OAuth with dynamic client registration, scopes `mcp:read` and `mcp:write`). Approve access to your workspace and you're done. There is no API key to copy.

If your client cannot do OAuth, the same tools are available at `https://hookpost.hookstep.in/api/mcp` with an `Authorization: Bearer <HOOKPOST_API_KEY>` header, using a key from **Settings → Developers** in Hookpost.

## Requirements

A Hookpost workspace on the Hookpost plan, with at least one connected channel. New workspaces get 3 free posts with no card needed; then the Hookpost plan is $7/month (₹699 in India): https://hookpost.hookstep.in/pricing.

## Network endpoints and credentials

The plugin talks only to `hookpost.hookstep.in`. When the agent calls a Hookpost tool, the tool's arguments (post text, channel ids, dates, media URLs) are sent to Hookpost with your OAuth token. Hookpost publishes posts to the social networks you connected in Hookpost. Network tokens stay on Hookpost's servers; the agent sees channel names and ids, never credentials.

## Tools

`list_channels`, `create_channel_connect_link`, `list_customer_groups`, `get_platform_post_rules`, `list_pinterest_boards`, `list_slack_channels`, `list_discord_channels`, `list_wordpress_post_options`, `create_post`, `list_posts`, `update_post_settings`, `upload_media_from_url`. There is no delete tool; deleting posts and changing the text or date of an existing post stay in the Hookpost app. See the [main README](../../README.md#tools) for details.

## Privacy and support

- Privacy policy: https://hookpost.hookstep.in/privacy
- Terms: https://hookpost.hookstep.in/terms
- Support: support@hookstep.in, or open an issue in this repository

## Licence

MIT. Copyright (c) 2026 Hookstep. See [LICENSE](LICENSE).
