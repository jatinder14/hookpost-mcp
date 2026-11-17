---
name: hookpost
description: Draft, schedule and review social media posts in the user's Hookpost workspace through the hookpost MCP server. Use when the user asks to post, schedule, queue or draft something for LinkedIn, X, Threads, Instagram, Facebook Pages, YouTube, Pinterest, Discord, Slack or another channel they connected in Hookpost, to see what is scheduled, or to find gaps in their content calendar.
---

# Hookpost

Hookpost (https://hookpost.hookstep.in) is a hosted social media scheduler. The `hookpost` MCP server in this plugin acts on the user's own Hookpost workspace, which the user signs in to in the browser the first time the server connects (OAuth).

## How to work

1. Call `list_channels` first to get the user's connected channels and their ids. Map the user's words ("my LinkedIn") to a channel id. If two channels could match, ask which one.
2. If the platform the user wants is not connected, call `create_channel_connect_link` with that platform and give the user the link. Opening it takes them to the network's own sign-in; the channel is added once they approve. Call `list_channels` again afterwards for the new id.
3. Before writing a post for a network, call `get_platform_post_rules` for that network to read its character limit, media rules and the settings a post needs. Write each post for its network instead of pasting one text everywhere.
4. Save posts as drafts unless the user clearly asks to schedule or publish. Scheduled and published posts go out to real social accounts. Before scheduling or publishing, show the exact text, the channel names and the time (in the user's timezone and in UTC), and wait for a yes.
5. `create_post` returns a `previewUrl` for each post. Give it to the user: it shows the post as it will look, and they can send it to someone to review.
6. If Hookpost rejects a post, the error says why. Fix the text or settings and try again.
7. Use `upload_media_from_url` to bring an image or video from a public URL into the media library before attaching it to a post.
8. Use `list_posts` with a date range to show what is scheduled, or to find days with nothing planned.
9. After creating a post, report its state, time and preview link, and say it is visible in the Hookpost calendar.

## What the server cannot do

- There is no delete tool, and no tool changes the text or date of an existing post. The user does those in the Hookpost app, or with the `hookpost` CLI (`hookpost delete <postId>`).
- Networks that need a server address, typed credentials or the browser extension (for example Telegram, Lemmy, Nostr, WordPress) are connected in the Hookpost app; `create_channel_connect_link` says so when asked for one.
- `update_post_settings` changes only the network settings of a post that has not gone out yet.

## When something fails

- 401: the sign-in expired or was revoked. Ask the user to reconnect the hookpost MCP server so Kiro opens the Hookpost sign-in page again.
- 402 or a message about the plan or free posts: the workspace has used its 3 free posts and needs the Hookpost plan, at https://hookpost.hookstep.in/pricing.
- A post in ERROR state: the network refused it at publish time. The reason is shown on the post in the Hookpost calendar.
