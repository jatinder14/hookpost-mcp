# n8n-nodes-hookpost

An [n8n](https://n8n.io) community node for [Hookpost](https://hookpost.hookstep.in) — schedule and publish social media posts across social networks from your workflows.

## Installation

In n8n: **Settings → Community Nodes → Install**, then enter:

```
n8n-nodes-hookpost
```

Or install manually into your n8n instance:

```bash
npm install n8n-nodes-hookpost
```

## Credentials

Create a **Hookpost API** credential:

| Field | Value |
|---|---|
| **API Key** | From Hookpost → **Settings → Developers**. An OAuth access token (`pos_…`) also works. |
| **Base URL** | `https://hookpost.hookstep.in/api` (leave as is unless told otherwise) |

Press **Test** — it calls `/public/v1/is-connected` to confirm the key before you build anything with it.

> Keep the key server-side. It grants full access to your organisation's channels and posts.

## Operations

| Resource | Operation | What it does |
|---|---|---|
| **Post** | Create | Schedule, publish now, or save as a draft |
| **Post** | Get Many | List posts between two dates, one item per post |
| **Post** | Delete | Delete a post by ID |
| **Channel** | Get Many | List your connected channels |
| **Channel** | Find Free Slot | Next free slot in your posting schedule |
| **Media** | Upload From URL | Add an image or video from a public URL |

The channel dropdown loads your real connected channels, so there's no need to look up IDs by hand. The node is marked usable as a tool, so n8n AI Agents can call it too.

## Example workflows

**Draft a post for every new blog article.** RSS Feed Trigger (your blog's feed) → Hookpost, **Post → Create**: Channel = your LinkedIn channel, Content = `{{ $json.title }} {{ $json.link }}`, When = **Save as Draft**. Each new article lands in Hookpost as a draft for you to review and schedule.

**Post an image from a URL.** Hookpost, **Media → Upload From URL** with the image URL → Hookpost, **Post → Create** with **Additional Fields → Media URLs** = `{{ $json.path }}` and When = **Schedule** with Date left empty, so it takes the next free slot.

**Weekly digest of what's scheduled.** Schedule Trigger (Mondays) → Hookpost, **Post → Get Many** with Start Date = `{{ $now }}` and End Date = `{{ $now.plus(7, 'days') }}` → send the list to email or Slack.

## Notes

**Scheduling.** Leave **Date** empty on a scheduled post and the node asks Hookpost for the next free slot in your posting schedule, matching what the app does when you press Create Post.

**Media.** To attach an image or video, run **Media → Upload From URL** first, then put the returned `path` into **Additional Fields → Media URLs** on **Post → Create**.

**Channel settings.** Some channels need extra fields — YouTube wants a title and visibility, Pinterest wants a board. Put them in **Additional Fields → Channel Settings (JSON)**:

```json
{
  "__type": "youtube",
  "title": "My video",
  "type": "private",
  "selfDeclaredMadeForKids": "no"
}
```

Call `/public/v1/integration-settings/:id` to see what a given channel expects.

**Errors.** Enable *Continue On Fail* on the node to pass errors downstream as `{ "error": "..." }` instead of stopping the workflow.

## Documentation

- [Public API reference](https://hookpost.hookstep.in/docs/public-api)
- [OAuth apps](https://hookpost.hookstep.in/docs/oauth) — for integrations acting on other people's accounts

## Licence

MIT. Copyright (c) 2026 Hookstep. See [LICENSE](https://github.com/jatinder14/hookpost-mcp/blob/main/LICENSE).
