# Hookpost power for Kiro

**Hookpost by Hookstep** is a social media scheduler with a hosted MCP server. This power connects Kiro to it, so the agent can list the channels you connected in Hookpost (LinkedIn, X, Instagram, Threads, YouTube, Pinterest and more), read each network's rules, write a post for each network and save it as a draft or schedule it.

## What's in the power

| File | What it does |
|---|---|
| [`plugin.json`](plugin.json) | Power manifest (Agent Plugins format). Kiro activates the power when you mention Hookpost, social posts or your content calendar |
| [`mcp.json`](mcp.json) | The hosted Hookpost MCP server at `https://hookpost.hookstep.in/mcp-oauth` |
| [`skills/hookpost/SKILL.md`](skills/hookpost/SKILL.md) | How the agent should use the tools: check channels and network rules first, save drafts by default, confirm before scheduling |

## Install

In Kiro, open the Powers panel, choose **Add Custom Power → Import power from GitHub**, and enter:

```
https://github.com/jatinder14/hookpost-mcp/tree/main/powers/hookpost
```

The first time the server connects, Kiro opens the Hookpost sign-in page in your browser (OAuth). Approve access to your workspace and you're done. There is no API key to copy.

## Requirements

A Hookpost workspace on the Standard or Pro plan. New workspaces get 3 free posts with no card needed; then Standard is $19/month (₹599 in India) or Pro $29/month (₹1,999 in India): https://hookpost.hookstep.in/pricing.

## Tools

`integrationList`, `groupList`, `integrationSchema`, `triggerTool`, `integrationSchedulePostTool`, `postsListTool`, `postSettingsTool`, `uploadFromUrlTool`, `generateImageTool`. There is no delete tool; deleting posts and changing the text or date of an existing post stay in the Hookpost app. See the [main README](../../README.md#tools) for details.

## Privacy and support

- Privacy policy: https://hookpost.hookstep.in/privacy
- Terms: https://hookpost.hookstep.in/terms
- Support: support@hookstep.in, or open an issue in this repository

## Licence

MIT. Copyright (c) 2026 Hookstep.
