# Hookpost

Hookpost (https://hookpost.hookstep.in) is a social media scheduler from Hookstep. This MCP server lets an agent work with the channels and calendar of your Hookpost workspace.

## Publisher

Hookstep, support@hookstep.in

## Prerequisites

- A Hookpost account with at least one connected channel. Sign up at https://hookpost.hookstep.in.
- Every new workspace gets 3 free posts with no card needed. After that, Standard is $19 a month (Rs 599 in India) and Pro is $29 a month (Rs 1,999 in India). See https://hookpost.hookstep.in/pricing.

## Authentication

OAuth 2.0 authorization code with PKCE. When the agent first calls Hookpost, you sign in to Hookpost and pick the workspace the agent may use.

## Tools

| Tool | What it does |
| --- | --- |
| `integrationList` | Lists the channels connected to the workspace, optionally for one customer group. |
| `groupList` | Lists the workspace's customer groups. |
| `integrationSchema` | Returns a network's rules: character limits, media rules and the settings a post needs. |
| `triggerTool` | Calls a network helper named by `integrationSchema`, for example to look up a board or a playlist id. |
| `integrationSchedulePostTool` | Saves one or more posts as drafts, schedules them, or publishes them now. |
| `postsListTool` | Lists posts between two dates, in any state. |
| `postSettingsTool` | Changes the network settings of a post that has not been published yet. |
| `uploadFromUrlTool` | Imports an image or video from a public URL into the workspace's media library. |

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
