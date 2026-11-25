# Hookpost

Hookpost (https://hookpost.hookstep.in) is a social media scheduler from Hookstep. This MCP server lets an agent work with the channels and calendar of your Hookpost workspace.

## Publisher

Hookstep, support@hookstep.in

## Prerequisites

- A Hookpost account with at least one connected channel. Sign up at https://hookpost.hookstep.in.
- Every new workspace gets 3 free posts with no card needed. After that, the Hookpost plan is $7 a month (Rs 699 in India). See https://hookpost.hookstep.in/pricing.

## Authentication

OAuth 2.0 authorization code flow (PKCE with S256 supported), scopes `mcp:read` and `mcp:write`. When the agent first calls Hookpost, you sign in to Hookpost and pick the workspace the agent may use.

## Tools

| Tool | What it does |
| --- | --- |
| `list_channels` | Lists the channels connected to the workspace, optionally for one customer group. |
| `list_customer_groups` | Lists the workspace's customer groups. |
| `create_channel_connect_link` | Returns a link that connects a new social account; nothing is connected until the user opens it and approves. |
| `get_platform_post_rules` | Returns a network's rules: length limit and the settings a post needs, with the lookup tool for each id. |
| `list_pinterest_boards` | Lists the boards of a connected Pinterest account. |
| `list_slack_channels` | Lists the channels of a connected Slack workspace. |
| `list_discord_channels` | Lists the channels of a connected Discord server. |
| `list_wordpress_post_options` | Lists the post types, categories and tags of a connected WordPress site. |
| `create_post` | Saves one or more posts as drafts, schedules them, or publishes them now. |
| `list_posts` | Lists posts between two dates, in any state. |
| `update_post_settings` | Changes the network settings of a post that has not been published yet. |
| `update_post_media` | Replaces the images or videos of a post that has not been published yet. |
| `upload_media_from_url` | Copies an image or video from a public URL into the workspace's media library. |

## Getting started

1. Ask the agent to list your Hookpost channels.
2. Ask it to draft a post for one of them. Drafts appear in your Hookpost calendar for review.
3. Ask it to schedule or publish only when you are ready: scheduled and published posts go out to your real social accounts.

## Known issues and limitations

- There is no delete tool. Deleting a post, or changing the text or date of an existing post, is done in the Hookpost app.
- A workspace that has used its 3 free posts and has no active plan gets an error asking for a plan.
- Each network keeps its own rules (for example X's character limit or Instagram's media rules). A post that breaks them is rejected with the reason, and the agent can retry with a fixed post.

## Support

Email support@hookstep.in. Privacy policy: https://hookpost.hookstep.in/privacy. Terms: https://hookpost.hookstep.in/terms.
