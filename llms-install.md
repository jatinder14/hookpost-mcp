# Installing the Hookpost MCP server

Hookpost's MCP server is hosted. There is nothing to clone, build or run locally.

1. Ask the user for their Hookpost workspace API key. They copy it from **Settings → Developers** in Hookpost (https://hookpost.hookstep.in). It needs a Standard or Pro plan; each starts with a 3-day trial. Never print the key back or commit it to a repository.
2. Add this server to the MCP settings file (for Cline: `cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "hookpost": {
      "type": "streamableHttp",
      "url": "https://hookpost.hookstep.in/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      },
      "disabled": false
    }
  }
}
```

Replace `YOUR_API_KEY` with the user's key. If the client cannot send headers, use the URL with the key in the path instead: `https://hookpost.hookstep.in/api/mcp/YOUR_API_KEY`.

3. Check the connection by calling `integrationList`. It returns the channels the user connected in Hookpost. A 401 means the key is wrong; a 402 means the workspace has no active plan or trial.

Save posts as drafts unless the user asks to schedule or publish: scheduled and published posts go out to real social accounts.
