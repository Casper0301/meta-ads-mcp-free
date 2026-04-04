# Meta Ads MCP (Free)

A free [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for [Meta/Facebook Ads](https://www.facebook.com/business/ads) that lets your AI assistant read your ad account data — spend, campaigns, metrics, ROAS, and more.

> **Want campaign management and anomaly detection?** [Meta Ads MCP Pro](https://casperschive.no/mcp/meta-ads-mcp) gives you 25+ tools including ad-level metrics, lead tracking, and human-in-the-loop campaign controls.

## Free vs Pro

| Feature | Free | Pro |
|---------|:----:|:---:|
| List ad accounts | ✅ | ✅ |
| Account performance overview | ✅ | ✅ |
| List campaigns with status & budget | ✅ | ✅ |
| Campaign spend breakdown | ✅ | ✅ |
| E-commerce metrics (purchases, ROAS) | ✅ | ✅ |
| Daily metrics breakdown | ✅ | ✅ |
| Active vs paused campaign count | ✅ | ✅ |
| Campaign-level detailed KPIs | ❌ | ✅ |
| Ad set & ad level metrics | ❌ | ✅ |
| Demographics & placement breakdowns | ❌ | ✅ |
| Lead form submissions | ❌ | ✅ |
| Anomaly detection (high CPC, low CTR) | ❌ | ✅ |
| Pause/resume campaigns | ❌ | ✅ |
| Budget updates | ❌ | ✅ |
| Period comparison reports | ❌ | ✅ |
| **Total tools** | **8** | **25+** |

👉 [**Get Meta Ads MCP Pro**](https://casperschive.no/mcp/meta-ads-mcp)

## Free tools included

| # | Tool | Description |
|---|------|-------------|
| 1 | `meta_get_me` | Authenticated user info |
| 2 | `meta_list_ad_accounts` | All ad accounts with status, currency, timezone |
| 3 | `meta_get_account_overview` | Spend, impressions, clicks, CTR, CPC, CPM |
| 4 | `meta_list_campaigns` | Campaigns with status, budget, objective |
| 5 | `meta_get_campaign_spend` | Spend per campaign for a date range |
| 6 | `meta_get_account_ecommerce` | Purchases, revenue, ROAS |
| 7 | `meta_get_daily_breakdown` | Day-by-day metrics |
| 8 | `meta_get_active_vs_paused` | Campaign status counts |

Pro tools appear in your AI's tool list with a clear upgrade message when called.

## Requirements

- Node.js 18+
- A Meta access token with `ads_read` permission

## Installation

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "meta-ads": {
      "command": "npx",
      "args": ["meta-ads-mcp-free"],
      "env": {
        "META_ACCESS_TOKEN": "your-token-here"
      }
    }
  }
}
```

Config file locations:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### Claude Code

```bash
claude mcp add meta-ads -e META_ACCESS_TOKEN=your-token-here -- npx meta-ads-mcp-free
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "meta-ads": {
      "command": "npx",
      "args": ["meta-ads-mcp-free"],
      "env": {
        "META_ACCESS_TOKEN": "your-token-here"
      }
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "meta-ads": {
      "command": "npx",
      "args": ["meta-ads-mcp-free"],
      "env": {
        "META_ACCESS_TOKEN": "your-token-here"
      }
    }
  }
}
```

## Getting a Meta access token

### Option 1: System User Token (recommended — non-expiring)

1. Go to [Meta Business Manager](https://business.facebook.com/settings/system-users)
2. Create a **System User** (or use an existing one)
3. Click **Generate New Token**
4. Select your app and grant `ads_read` permission
5. Copy the token

### Option 2: User Access Token (expires after 60 days)

1. Go to [Meta Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app
3. Add `ads_read` permission
4. Generate and copy the token

## Built-in protections

- **Rate limiting** — Throttles to 30 calls/minute, well under Meta's limits
- **Response caching** — 5-minute cache prevents redundant API calls
- **Error handling** — Clear messages for expired tokens, rate limits, and permission errors

## Upgrade to Pro

The free version gives you full account-level read access. When you need campaign management, anomaly detection, and ad-level drill-downs — upgrade to Pro:

👉 [**casperschive.no/mcp/meta-ads-mcp**](https://casperschive.no/mcp/meta-ads-mcp)

## License

MIT
