# [Jira MCP Server v2.0](https://garywenneker.github.io/jira-mcp-server/)

🎯 **Complete Jira CLI integration via Model Context Protocol**

This MCP server provides **COMPLETE** Jira integration through:
- Wrapping all Jira CLI commands
- Executing custom PowerShell reporting scripts
- Making direct REST API calls
- Supporting flexible workflow automation

## 🚀 Version 2.0 - Complete Feature Set

**✨ NEW in v2.0:**
- ⏱️ Worklog management (time tracking)
- 👁️ Watch/Unwatch issues
- 👍 Vote/Unvote for issues
- 🗑️ Issue deletion
- 📋 Issue clone/duplicate
- 🔗 Issue linking (blocks, relates to, etc.)
- 🏷️ Label management (add/remove)
- 🧩 Component management
- 🚀 Version/Release management
- 📎 Attachment support
- 🏃 Advanced sprint operations (add/remove issues)
- 🔄 Issue transitions list
- 📝 Subtask creation
- 💾 Issue export (CSV/JSON)

## ✨ Complete Feature List

### 🎯 Core Jira Operations
- ✅ **Issue management**: list, get, create, update, delete, clone
- ✅ **Worklog management**: add time, list worklogs
- ✅ **Watch & Vote**: watch/unwatch, vote/unvote
- ✅ **Issue linking**: link issues, view links
- ✅ **Label management**: add/remove labels
- ✅ **Comments**: add/list comments
- ✅ **Transitions**: list available status transitions
- ✅ **Subtasks**: create subtasks

### 📊 Project & Sprint Management
- ✅ **Projects**: list all projects
- ✅ **Sprints**: list, view sprint issues
- ✅ **Sprint operations**: add/remove issues from sprints
- ✅ **Epics**: list epics
- ✅ **Boards**: list all boards
- ✅ **Components**: list, create components
- ✅ **Versions**: list, create versions/releases

### 🔍 Advanced Features
- ✅ **JQL queries**: full JQL support with REST API
- ✅ **Issue export**: CSV and JSON export
- ✅ **Attachments**: add/list attachments
- ✅ **Custom reports**: Bug reports, recent issues (PowerShell)
- ✅ **Browser integration**: open issues directly in browser

## 🔧 Installation

### Prerequisites
- Node.js >= 18.0.0
- Jira CLI installed (optional, for advanced features)
- PowerShell 5.1+ (Windows) or compatible shell
- Jira API credentials

### Install Dependencies

```bash
cd jira-mcp-server
npm install
```

### Configuration

**Option 1: GitHub Package (Recommended)**

Install directly from GitHub without publishing to npm:

```json
{
  "mcpServers": {
    "JiraMCP": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "@garyw/jira-mcp-server@latest"
      ],
      "env": {
        "JIRA_BASE_URL": "https://yourcompany.atlassian.net",
        "JIRA_USERNAME": "your.email@company.com",
        "JIRA_API_TOKEN": "YOUR_API_TOKEN_HERE",
        "JIRA_CLI_PATH": "/path/to/jira-cli/bin/jira"
      }
    }
  }
}
```

**Option 2: Local Installation**

Clone the repository and use a local path:

```bash
git clone https://github.com/garywenneker/jira-mcp-server.git
cd jira-mcp-server
npm install
```

Then configure:

```json
{
  "mcpServers": {
    "JiraMCP": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/path/to/jira-mcp-server/src/index.js"
      ],
      "env": {
        "JIRA_BASE_URL": "https://yourcompany.atlassian.net",
        "JIRA_USERNAME": "your.email@company.com",
        "JIRA_API_TOKEN": "YOUR_API_TOKEN_HERE",
        "PROJECT_ROOT": "/path/to/your/project",
        "JIRA_CLI_PATH": "/path/to/jira-cli/bin/jira"
      }
    }
  }
}
```

**Option 3: Environment Variables (Most Secure)**

Set credentials as environment variables instead of in config file:

```bash
export JIRA_BASE_URL="https://yourcompany.atlassian.net"
export JIRA_USERNAME="your.email@company.com"
export JIRA_API_TOKEN="YOUR_API_TOKEN_HERE"
export JIRA_CLI_PATH="/path/to/jira-cli/bin/jira"
```

Then use simplified config:

```json
{
  "mcpServers": {
    "JiraMCP": {
      "type": "stdio",
      "command": "npx",
      "args": ["@garyw/jira-mcp-server@latest"]
    }
  }
}
```

**⚠️ Security:** Ensure your MCP config file is in `.gitignore`!

### IDE Configuration Quick Start

Configure the Jira MCP server in your editor or AI assistant with the templates below.

#### Visual Studio Code (Continue)

Install the [Continue](https://continue.dev) copilot extension and add the server to `.continue/config.json` (or use the Continue settings UI):

```json
{
  "mcpServers": {
    "jira-mcp": {
      "command": "node",
      "args": ["${workspaceFolder}/src/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://yourcompany.atlassian.net",
        "JIRA_USERNAME": "your.email@company.com",
        "JIRA_API_TOKEN": "${env:JIRA_API_TOKEN}"
      }
    }
  }
}
```

#### Cursor IDE

Create or update `.cursor/mcp-config.json` in your repository:

```json
{
  "mcpServers": {
    "JiraMCP": {
      "type": "stdio",
      "command": "npx",
      "args": ["@garyw/jira-mcp-server@latest"],
      "env": {
        "JIRA_BASE_URL": "https://yourcompany.atlassian.net",
        "JIRA_USERNAME": "your.email@company.com",
        "JIRA_API_TOKEN": "${env:JIRA_API_TOKEN}"
      }
    }
  }
}
```

#### JetBrains IDEs (AI Assistant)

Add a server entry in `~/.config/JetBrains/ai-assistant/mcp.json` (Linux/macOS) or `%APPDATA%\JetBrains\ai-assistant\mcp.json` (Windows):

```json
{
  "servers": {
    "jira": {
      "transport": "stdio",
      "command": "node",
      "args": ["/path/to/jira-mcp-server/src/index.js"],
      "env": {
        "JIRA_BASE_URL": "https://yourcompany.atlassian.net",
        "JIRA_USERNAME": "your.email@company.com",
        "JIRA_API_TOKEN": "${env:JIRA_API_TOKEN}"
      }
    }
  }
}
```

#### Claude Desktop & Web

Register the server in `claude_desktop_config.json` (Desktop) or the browser MCP settings panel:

```json
{
  "mcpServers": {
    "jira": {
      "command": "npx",
      "args": ["@garyw/jira-mcp-server@latest"],
      "env": {
        "JIRA_BASE_URL": "https://yourcompany.atlassian.net",
        "JIRA_USERNAME": "your.email@company.com",
        "JIRA_API_TOKEN": "${env:JIRA_API_TOKEN}"
      }
    }
  }
}
```

### Getting Your Jira API Token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a meaningful name
4. Copy the token and use it in your configuration

## 📚 Complete Tool Reference

### 🎯 Issue Management (15 tools)

#### `jira_issue_list`
List issues with filters.

**Parameters:**
- `project` (optional): Project key
- `assignee` (optional): Assignee
- `status` (optional): Status
- `type` (optional): Issue type
- `limit` (optional): Max results (default: 50)

#### `jira_issue_get`
Get detailed info of one issue.

**Parameters:**
- `issue_key` (required): Issue key

#### `jira_issue_create`
Create new issue.

**Parameters:**
- `project` (required): Project key
- `type` (required): Issue type
- `summary` (required): Title
- `description` (optional): Description
- `priority` (optional): Priority
- `assignee` (optional): Assignee

#### `jira_issue_update`
Update existing issue.

**Parameters:**
- `issue_key` (required): Issue key
- `status` (optional): New status
- `assignee` (optional): New assignee
- `comment` (optional): Add comment

#### `jira_issue_delete`
Delete an issue (⚠️ use with caution!).

**Parameters:**
- `issue_key` (required): Issue key

#### `jira_issue_clone`
Clone/duplicate an issue.

**Parameters:**
- `issue_key` (required): Issue to clone
- `summary` (optional): New summary

#### `jira_issue_link`
Link two issues together.

**Parameters:**
- `from_issue` (required): Source issue
- `to_issue` (required): Target issue
- `link_type` (required): Link type (e.g., 'blocks', 'relates to')

#### `jira_issue_links`
List all links of an issue.

**Parameters:**
- `issue_key` (required): Issue key

#### `jira_issue_transitions`
List available status transitions.

**Parameters:**
- `issue_key` (required): Issue key

#### `jira_issue_watch`
Watch an issue for notifications.

**Parameters:**
- `issue_key` (required): Issue key

#### `jira_issue_unwatch`
Stop watching an issue.

**Parameters:**
- `issue_key` (required): Issue key

#### `jira_issue_vote`
Vote for an issue.

**Parameters:**
- `issue_key` (required): Issue key

#### `jira_issue_unvote`
Remove your vote.

**Parameters:**
- `issue_key` (required): Issue key

#### `jira_subtask_create`
Create a subtask.

**Parameters:**
- `parent_key` (required): Parent issue
- `summary` (required): Subtask title
- `description` (optional): Description
- `assignee` (optional): Assignee

#### `jira_issue_export`
Export issues to CSV or JSON.

**Parameters:**
- `jql` (required): JQL query
- `format` (required): 'csv' or 'json'
- `output_file` (optional): Output file path
- `maxResults` (optional): Max results (default: 100)

### ⏱️ Worklog Management (2 tools)

#### `jira_worklog_add`
Add time to an issue.

**Parameters:**
- `issue_key` (required): Issue key
- `time_spent` (required): Time (e.g., '2h', '30m', '1d 4h')
- `comment` (optional): Worklog comment
- `date` (optional): Date of work (YYYY-MM-DD)

**Example:**
```
"Log 3 hours work on issue PROJ-123 with comment 'Implemented feature X'"
```

#### `jira_worklog_list`
List all worklogs for an issue.

**Parameters:**
- `issue_key` (required): Issue key

### 🏷️ Label Management (2 tools)

#### `jira_label_add`
Add labels to an issue.

**Parameters:**
- `issue_key` (required): Issue key
- `labels` (required): Comma-separated labels (e.g., 'frontend,bug,urgent')

**Example:**
```
"Add labels 'frontend' and 'high-priority' to PROJ-123"
```

#### `jira_label_remove`
Remove labels from an issue.

**Parameters:**
- `issue_key` (required): Issue key
- `labels` (required): Comma-separated labels

### 🧩 Component Management (2 tools)

#### `jira_component_list`
List components in a project.

**Parameters:**
- `project` (required): Project key

#### `jira_component_add`
Add a component to a project.

**Parameters:**
- `project` (required): Project key
- `name` (required): Component name
- `description` (optional): Description
- `lead` (optional): Component lead

### 🚀 Version/Release Management (2 tools)

#### `jira_version_list`
List versions/releases in a project.

**Parameters:**
- `project` (required): Project key

#### `jira_version_create`
Create a new version/release.

**Parameters:**
- `project` (required): Project key
- `name` (required): Version name (e.g., '1.0.0')
- `description` (optional): Description
- `release_date` (optional): Planned release date (YYYY-MM-DD)

### 📎 Attachment Tools (2 tools)

#### `jira_attachment_add`
Add an attachment to an issue.

**Parameters:**
- `issue_key` (required): Issue key
- `file_path` (required): Full file path

**Example:**
```
"Attach /path/to/screenshot.png to PROJ-123"
```

#### `jira_attachment_list`
List attachments of an issue.

**Parameters:**
- `issue_key` (required): Issue key

### 🏃 Advanced Sprint Operations (4 tools)

#### `jira_sprint_list`
List sprints for a board.

**Parameters:**
- `board_name` (optional): Board name
- `state` (optional): active, future, closed, all

#### `jira_sprint_issues`
Get issues from a sprint.

**Parameters:**
- `sprint_name` (required): Sprint name
- `board_name` (optional): Board name

#### `jira_sprint_add_issue`
Add issues to a sprint.

**Parameters:**
- `sprint_name` (required): Sprint name
- `issue_keys` (required): Comma-separated issue keys
- `board_name` (optional): Board name

**Example:**
```
"Add issues PROJ-100,PROJ-101,PROJ-102 to Sprint 42"
```

#### `jira_sprint_remove_issue`
Remove issues from a sprint.

**Parameters:**
- `sprint_name` (required): Sprint name
- `issue_keys` (required): Comma-separated issue keys
- `board_name` (optional): Board name

### 🔍 JQL & Reporting (3 tools)

#### `jira_jql_query`
Execute custom JQL query.

**Parameters:**
- `jql` (required): JQL query string
- `maxResults` (optional): Max results (default: 100)

**Example JQL:**
```jql
project = PROJ AND type = Bug AND status = "To Do" AND priority = High
```

#### `jira_report_bugs`
Comprehensive bug report with statistics.

**Parameters:**
- `status` (optional): Filter by status
- `maxResults` (optional): Max results (default: 100)
- `outputFormat` (optional): table, csv, json

#### `jira_report_recent_issues`
Recent issues overview (last N days).

**Parameters:**
- `daysBack` (optional): Days to look back (default: 7)
- `maxResults` (optional): Max results (default: 100)

### 📊 Project & Board Tools (4 tools)

#### `jira_project_list`
List all projects.

#### `jira_epic_list`
List epics in a project.

**Parameters:**
- `project` (optional): Project key filter

#### `jira_board_list`
List all boards.

**Parameters:**
- `project` (optional): Project key filter

### 🔧 Utility Tools (3 tools)

#### `jira_open`
Open issue in browser.

**Parameters:**
- `issue_key` (required): Issue key

#### `jira_me`
Show info about configured user.

#### `jira_serverinfo`
Show Jira server info.

## 💡 Usage Examples

### Worklog Management
```
User: "Log 4 hours work on PROJ-3475 with comment 'Implemented authentication'"
AI: → jira_worklog_add(
      issue_key="PROJ-3475",
      time_spent="4h",
      comment="Implemented authentication"
    )
    → ✅ Worklog added
```

### Sprint Planning
```
User: "Add issues PROJ-100 through PROJ-105 to current sprint"
AI: → jira_sprint_add_issue(
      sprint_name="Sprint 42",
      issue_keys="PROJ-100,PROJ-101,PROJ-102,PROJ-103,PROJ-104,PROJ-105"
    )
    → ✅ 6 issues added to sprint
```

### Issue Linking
```
User: "Link PROJ-200 blocks PROJ-201"
AI: → jira_issue_link(
      from_issue="PROJ-200",
      to_issue="PROJ-201",
      link_type="blocks"
    )
    → ✅ Issues linked
```

### Label Management
```
User: "Add labels 'frontend', 'bug' and 'urgent' to PROJ-150"
AI: → jira_label_add(
      issue_key="PROJ-150",
      labels="frontend,bug,urgent"
    )
    → ✅ Labels added
```

### Issue Export
```
User: "Export all bugs from last month to CSV"
AI: → jira_issue_export(
      jql="type = Bug AND created >= -30d",
      format="csv",
      output_file="/path/to/bugs-export.csv"
    )
    → ✅ 47 issues exported
```

## 🔍 JQL Query Examples

```jql
# My open issues
assignee = currentUser() AND status != Done

# Bugs in current sprint
project = PROJ AND type = Bug AND sprint in openSprints()

# High priority issues this week
priority = High AND created >= -7d

# Issues with specific labels
labels in (frontend, urgent) AND status != Done

# Unassigned bugs
type = Bug AND assignee is EMPTY

# Issues with attachments
attachments is not EMPTY

# Issues without Epic
"Epic Link" is EMPTY

# Overdue issues
due < now() AND status != Done

# Recently updated issues
updated >= -24h

# Blocked issues
status = Blocked OR statusCategory = "To Do"
```

## 🔒 Security

### Credentials Management
- ⚠️ **NEVER** commit API tokens to Git
- Store tokens in environment variables or password manager
- Add MCP config file to `.gitignore`
- Rotate tokens every 3-6 months
- Use minimal permissions

## 🐛 Troubleshooting

### "401 Unauthorized"
**Fix:**
1. Generate new API token
2. Update `JIRA_API_TOKEN` in config
3. Restart application

### "403 Forbidden"
**Fix:**
- Check Jira project permissions
- Verify account has Browse/Edit permissions
- Ask admin for access

### "Jira CLI not found"
**Fix:**
- Verify `JIRA_CLI_PATH` is correct
- Check Jira CLI is installed: `jira version`
- Update path in config

### "Invalid JQL query"
**Fix:**
- Test JQL in Jira UI (Filters → Advanced search)
- Check syntax: field names, operators
- Verify project keys and field names

### "Command timeout"
**Fix:**
- Reduce maxResults parameter
- Simplify JQL query
- Check network connection

## 📊 Performance

- **Caching:** No caching (always fresh data)
- **Rate Limiting:** Follows Jira API rate limits
- **Buffer Size:** 10MB per command
- **Timeout:** 60 seconds per operation

## 🚀 Usage

### Standalone Mode
```bash
npm start
```

### Development Mode (auto-reload)
```bash
npm run dev
```

### Via Cursor or Claude Desktop (MCP Integration)
Configure in MCP config file and restart application.

## 📝 Changelog

### Version 2.0.0 (2025-11-01)
- ✨ **MAJOR UPDATE:** Complete Jira CLI feature parity
- ✅ Worklog management (add, list)
- ✅ Watch/Unwatch issues
- ✅ Vote/Unvote issues
- ✅ Issue delete
- ✅ Issue clone
- ✅ Issue linking
- ✅ Label management (add, remove)
- ✅ Component management
- ✅ Version/Release management
- ✅ Attachment support
- ✅ Advanced sprint operations
- ✅ Issue transitions list
- ✅ Subtask creation
- ✅ Issue export (CSV/JSON)
- 📚 Complete documentation overhaul

### Version 1.0.0 (2025-10-31)
- ✨ Initial release
- ✅ Basic issue management
- ✅ JQL query execution
- ✅ Project & sprint management
- ✅ Custom PowerShell reporting

## 🤝 Contributing

Contributions are welcome! For changes:
1. Test locally thoroughly
2. Update this README
3. Update version in package.json
4. Commit with clear message
5. Create pull request with description

## 📧 Support

**Documentation:** This README + inline code comments  
**Jira API Docs:** https://developer.atlassian.com/cloud/jira/platform/rest/v3/  
**Jira CLI Docs:** https://github.com/ankitpokhrel/jira-cli

## 📄 License

MIT License - see LICENSE file for details

---

**v2.0.0** - Complete Jira CLI Integration ✨

Made with ❤️ for the MCP community
