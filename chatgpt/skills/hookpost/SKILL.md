---
name: hookpost
description: Draft, schedule and review social media posts in the user's Hookpost workspace through the hookpost MCP server. Use when the user asks to post, schedule, queue or draft something for LinkedIn, X, Threads, Instagram, Facebook Pages, YouTube, Pinterest, Discord, Slack or another channel they connected in Hookpost, to see what is scheduled, to find gaps in their content calendar, or to connect a new social account.
---

# Hookpost

Hookpost (https://hookpost.hookstep.in) is a hosted social media scheduler. The `hookpost` MCP server in this plugin acts on the user's own Hookpost workspace, identified by the Hookpost account they signed in with when they connected the plugin.

## How to work

1. Call `list_channels` first to get the user's connected channels and their ids. For an agency workspace, `list_customer_groups` gives the id of one client's group, which `list_channels` and `list_posts` take as a filter. Map the user's words ("my LinkedIn") to a channel id. If two channels could match, ask which one.
2. If the platform the user wants is not connected, call `create_channel_connect_link` with that platform and give the user the link. Opening it takes them to the network's own sign-in; the channel is added once they approve. Call `list_channels` again afterwards for the new id.
3. Before writing a post for a network, call `get_platform_post_rules` for that platform to read its length limit and the settings a post needs. Write each post for its network instead of pasting one text everywhere.
4. Some settings take an id from the user's account: get it with `list_pinterest_boards`, `list_slack_channels`, `list_discord_channels` or `list_wordpress_post_options`, as `get_platform_post_rules` names for each setting.
5. Save posts as drafts unless the user clearly asks to schedule or publish. Scheduled and published posts go out to real social accounts. Before scheduling or publishing, show the exact text, the channel names and the time (in the user's timezone and in UTC), and wait for a yes.
6. Create posts with `create_post`. It returns a `previewUrl` for each post: give it to the user, it shows the post as it will look and can be sent to someone to review. Calling it again with the same input creates the posts again.
7. If Hookpost rejects a post, `output.errors` says why. Fix the text or settings and try again.
8. Media: use `upload_media_from_url` to copy an image or video from a public URL into Hookpost, then attach the returned `path`. Only media stored in Hookpost can be attached; paths that `list_posts` returns with `includeAttachments` can be reused.
9. Use `list_posts` with a date range to show what is scheduled, or to find days with nothing planned.
10. For a post that has not gone out yet, `update_post_settings` changes its network settings and `update_post_media` replaces its images or videos.
11. After creating a post, report its state, time and preview link, and say it is visible in the Hookpost calendar.

## What the server cannot do

- There is no delete tool, and no tool changes the text or date of an existing post. The user does those in the Hookpost app, or with the `hookpost` CLI (`hookpost delete <postId>`).
- Published posts cannot be changed or withdrawn with these tools.
- Networks that need a server address, typed credentials or the browser extension (for example Telegram, Lemmy, Nostr, WordPress) are connected in the Hookpost app; `create_channel_connect_link` says so when asked for one.

## When something fails

- 401 or an auth error: the Hookpost sign-in expired or was revoked. Ask the user to reconnect the Hookpost plugin and sign in again.
- 402 or a message about the plan or free posts: the workspace has used its 3 free posts and needs the Hookpost plan ($7 a month), at https://hookpost.hookstep.in/pricing.
- A post in ERROR state: the network refused it at publish time. The reason is shown on the post in the Hookpost calendar.
