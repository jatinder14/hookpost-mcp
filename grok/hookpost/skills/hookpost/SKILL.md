---
name: hookpost
description: Draft, schedule and review social media posts in the user's Hookpost workspace through the hookpost MCP server. Use when the user asks to post, schedule, queue or draft something for LinkedIn, X, Threads, Instagram, Facebook Pages, YouTube, Pinterest, Discord, Slack or another channel they connected in Hookpost, to see what is scheduled, or to find gaps in their content calendar.
---

# Hookpost

Hookpost (https://hookpost.hookstep.in) is a hosted social media scheduler. The `hookpost` MCP server in this plugin acts on the user's own Hookpost workspace, which the user signs in to in the browser the first time the server connects (OAuth).

## How to work

1. Call `integrationList` first to get the user's connected channels and their ids. Map the user's words ("my LinkedIn") to a channel id. If two channels could match, ask which one.
2. Before writing a post for a network, call `integrationSchema` for that network to read its character limit, media rules and the settings a post needs. Write each post for its network instead of pasting one text everywhere.
3. Save posts as drafts unless the user clearly asks to schedule or publish. Scheduled and published posts go out to real social accounts. Before scheduling or publishing, show the exact text, the channel names and the time (in the user's timezone and in UTC), and wait for a yes.
4. If Hookpost rejects a post, the error says why. Fix the text or settings and try again.
5. Use `uploadFromUrlTool` to bring an image or video from a public URL into the media library before attaching it to a post.
6. Use `postsListTool` with a date range to show what is scheduled, or to find days with nothing planned.
7. After creating a post, report its state and time, and say it is visible in the Hookpost calendar.

## What the server cannot do

- There is no delete tool, and no tool changes the text or date of an existing post. The user does those in the Hookpost app.
- Channels are connected in the Hookpost app, not through MCP.
- `postSettingsTool` changes only the network settings of a post that has not gone out yet.

## When something fails

- 401: the sign-in expired or was revoked. Ask the user to reconnect the hookpost MCP server so Grok Build opens the Hookpost sign-in page again.
- 402 or a message about the plan or trial: the workspace needs an active Standard or Pro plan. Each starts with a 3-day trial at https://hookpost.hookstep.in/pricing.
- A post in ERROR state: the network refused it at publish time. The reason is shown on the post in the Hookpost calendar.
