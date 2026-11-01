# Hookpost for Microsoft Copilot

Two ways to use Hookpost from Microsoft's agents, and the package for getting it listed.

## Use it today in Copilot Studio (no listing needed)

Any Copilot Studio maker can add Hookpost to an agent now:

1. Open the agent, go to **Tools**, then **Add a tool**, **New tool**, **Model Context Protocol**.
2. Server name `Hookpost`, server URL `https://hookpost.hookstep.in/api/mcp`.
3. Authentication: **API key**, type **Header**, header name `x-hookpost-api-key`. When you create the connection, paste your Hookpost API key (Settings > Developers in Hookpost) without `Bearer`.

Or import the custom connector in [`copilot-studio-connector/`](copilot-studio-connector) (`apiDefinition.swagger.json` and `apiProperties.json`) from Power Apps > Custom connectors > Import an OpenAPI file, or with `pac connector create`. It is the same server, with the same API key header.

## Get listed (Microsoft MCP server certification)

Certified servers show up for every tenant in Copilot Studio, Microsoft 365 Copilot (Agent Store), Copilot chat and Azure Foundry. The route, per [Microsoft's certification docs](https://learn.microsoft.com/microsoft-copilot-studio/mcp-certification) (preview, updated 17 Oct 2026):

- The publisher needs a **Microsoft Partner Center** account with business verification done, enrolled in the **Microsoft 365 and Copilot** program, and must own the server's endpoint.
- The submission is a new offer of type **Apps and Agents for M365 and Copilot**, with the package in [`m365-package/`](m365-package).
- Authentication is OAuth 2.0 through an **Azure Key Vault** that Microsoft's certification service reads. Microsoft does not take dynamic client registration for certification, so it needs a fixed Hookpost OAuth app.

### The package

| File | What it is |
| --- | --- |
| `manifest.json` | App manifest v1.30 with one `agentConnectors` entry pointing at `https://hookpost.hookstep.in/mcp-oauth` (OAuth) |
| `toolDescription.json` | The server's 8 tools, as `tools/list` returns them |
| `intro.md` | Public documentation, with known limitations |
| `color.png`, `outline.png` | 192x192 colour icon and 32x32 white-on-transparent outline icon (`make-outline-icon.mjs` draws the outline) |

`cd tests && npm ci && npm test` checks the package against Microsoft's v1.30 schema, the icon rules and the tool list. Build the zip to upload with:

```bash
HOOKPOST_KEYVAULT_URI=https://<your-vault>.vault.azure.net/ node scripts/build-m365-package.mjs
```

### Owner steps (need the Hookstep logins)

1. In Hookpost, **Settings > Developers > Apps**: create an app named "Microsoft Copilot" and keep its client id and secret. Hookpost gives a workspace one app with one redirect URL. Use the one Microsoft's review names: `https://teams.microsoft.com/api/platform/v1.0/oAuthRedirect` for Microsoft 365 Copilot, or `https://global.consent.azure-apim.net/redirect` for Copilot Studio connectors. If both are needed, create the second app from a second workspace.
2. In Azure, create a Key Vault and add secrets `ClientId`, `ClientSecret`, `AuthorizationUrl` (`https://hookpost.hookstep.in/oauth/authorize`), `TokenUrl` (`https://hookpost.hookstep.in/api/oauth/token`) and `Scopes` (`mcp:read mcp:write`). Give the service principal of app `8e91e74f-afe9-41cd-8c3f-17a9562a74ea` the **Key Vault Secrets User** role on it.
3. Build the zip with the vault URI (command above).
4. In [Partner Center](https://partner.microsoft.com/dashboard/home), finish business verification and the Microsoft 365 and Copilot program, then create an **Apps and Agents for M365 and Copilot** offer and upload the zip. Microsoft also asks for a test account: a Hookpost workspace with one connected test channel.
