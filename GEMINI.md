# Hookpost

The `hookpost` MCP server connects to the user's Hookpost workspace (https://hookpost.hookstep.in), a social media scheduler.

- Call `list_channels` first to get the user's connected channels and their ids.
- Before creating a post for a network, call `get_platform_post_rules` for that network to read its character limit, media rules and required settings.
- Save posts as drafts unless the user clearly asks to schedule or publish. Scheduled and published posts go out to real social accounts.
- `list_posts` lists posts between two dates; use it to find gaps in the calendar.
- There is no delete tool. To delete a post, or change the text or date of an existing post, the user does it in the Hookpost app.
