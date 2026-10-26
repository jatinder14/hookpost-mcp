# Hookpost for Claude Code

**Hookpost by Hookstep** is a hosted social media scheduler. This plugin connects Claude Code to Hookpost's hosted MCP server, so Claude can list the channels you connected in Hookpost, read each network's character limits and media rules, and save posts to your Hookpost calendar as drafts, scheduled posts, or posts that go out now. (Hookpost is not related to the Shopify Flow app called HookPost.)

## Install

```
/plugin marketplace add jatinder14/hookpost-mcp
/plugin install hookpost@hookpost
```

Claude Code asks for your Hookpost API key when you enable the plugin. Copy it from **Settings → Developers** in Hookpost. The key is stored in your system's secure credential store, not in `settings.json`.

You need a Hookpost workspace on the Standard or Pro plan (each starts with a 3-day trial) and at least one connected channel. Prices: https://hookpost.hookstep.in/pricing.

## What the plugin contains

- `.mcp.json`: one remote MCP server, `https://hookpost.hookstep.in/api/mcp`, over Streamable HTTP, with your API key sent as an `Authorization: Bearer` header. Nothing runs on your machine.
- `skills/hookpost/SKILL.md`: instructions for Claude: list channels first, check each network's rules, save drafts unless you ask to schedule or publish, and confirm before anything goes out.

## What it sends, and where

The plugin talks only to `hookpost.hookstep.in`. When Claude calls a Hookpost tool, the tool's arguments (post text, channel ids, dates, media URLs) are sent to Hookpost with your API key. Hookpost publishes posts to the social networks you connected in Hookpost. Network tokens stay on Hookpost's servers; Claude sees channel names and ids, never credentials.

There is no delete tool, and no tool edits the text or date of an existing post. Do those in the Hookpost app.

## Example prompts

- "List my Hookpost channels. Write a launch post for LinkedIn and a shorter one for Threads, check both against the network limits, and save them as drafts for tomorrow 9:00."
- "List my Hookpost posts for the next 14 days and tell me which days have nothing scheduled on LinkedIn."

## Privacy policy

Hookpost's privacy policy covers what data is collected, how it is used and stored, third-party sharing and retention: https://hookpost.hookstep.in/privacy. Terms: https://hookpost.hookstep.in/terms.

## Support

Email support@hookstep.in or use https://hookpost.hookstep.in/contact. Setup for other AI assistants: https://hookpost.hookstep.in/mcp.

## Licence

MIT. Copyright (c) 2026 Hookstep. See [LICENSE](LICENSE).
