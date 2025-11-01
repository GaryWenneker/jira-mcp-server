#!/usr/bin/env node

/**
 * Custom Jira MCP Server
 * 
 * A Model Context Protocol server that provides comprehensive Jira integration
 * through Jira CLI and custom PowerShell scripts.
 * 
 * Features:
 * - Issue management (list, get, create, update, delete, clone, link)
 * - Worklog management (add, list time tracking)
 * - Watch/Vote management
 * - Label and component management
 * - Version/release management
 * - Attachment support
 * - Project and sprint management (including add/remove issues)
 * - Subtask creation
 * - Issue transitions list
 * - JQL query execution
 * - Issue export (CSV/JSON)
 * - Custom reporting via PowerShell scripts
 * - Epic and board operations
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration from environment or arguments
const JIRA_CLI_PATH = process.env.JIRA_CLI_PATH || `${process.env.USERPROFILE}\\jira-cli\\bin\\jira.exe`;
const JIRA_BASE_URL = process.env.JIRA_BASE_URL || "https://yourcompany.atlassian.net";
const JIRA_USERNAME = process.env.JIRA_USERNAME || "your.email@company.com";
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN || "";
const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();

/**
 * Execute Jira CLI command
 */
async function executeJiraCLI(command, args = []) {
  try {
    const fullCommand = `"${JIRA_CLI_PATH}" ${command} ${args.join(' ')}`;
    const { stdout, stderr } = await execAsync(fullCommand, {
      env: {
        ...process.env,
        JIRA_CONFIG_FILE: join(__dirname, '../.jira-config.yml')
      },
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    if (stderr && !stderr.includes('INF')) {
      console.error('Jira CLI stderr:', stderr);
    }
    
    return { success: true, output: stdout, error: null };
  } catch (error) {
    return { success: false, output: null, error: error.message };
  }
}

/**
 * Execute PowerShell script
 */
async function executePowerShellScript(scriptPath, args = {}) {
  try {
    const scriptFullPath = join(PROJECT_ROOT, scriptPath);
    const argsString = Object.entries(args)
      .map(([key, value]) => `-${key} "${value}"`)
      .join(' ');
    
    const command = `powershell.exe -ExecutionPolicy Bypass -File "${scriptFullPath}" ${argsString}`;
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    return { success: true, output: stdout, error: stderr || null };
  } catch (error) {
    return { success: false, output: null, error: error.message };
  }
}

/**
 * Execute Jira REST API call via PowerShell
 */
async function executeJiraAPI(jql, maxResults = 100) {
  try {
    const script = `
$jiraUrl = "${JIRA_BASE_URL}"
$email = "${JIRA_USERNAME}"
$apiToken = "${JIRA_API_TOKEN}"

$pair = "$($email):$($apiToken)"
$encodedCreds = [System.Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes($pair))

$headers = @{
    Authorization = "Basic $encodedCreds"
    'Content-Type' = "application/json"
    Accept = "application/json"
}

$escapedJql = [System.Uri]::EscapeDataString("${jql}")
$uri = "$jiraUrl/rest/api/3/search/jql?\`jql=$escapedJql\`&maxResults=${maxResults}\`&fields=key,summary,status,priority,assignee,created,updated,project,issuetype"

$response = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
$response | ConvertTo-Json -Depth 10
`;

    const { stdout, stderr } = await execAsync(`powershell.exe -Command "${script.replace(/"/g, '\\"')}"`, {
      maxBuffer: 10 * 1024 * 1024
    });
    
    return { success: true, output: stdout, error: null };
  } catch (error) {
    return { success: false, output: null, error: error.message };
  }
}

// Create MCP server
const server = new Server(
  {
    name: "custom-jira-mcp",
    version: "2.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const TOOLS = [
  // ============================================
  // ISSUE MANAGEMENT TOOLS
  // ============================================
  {
    name: "jira_issue_list",
    description: "List Jira issues with filters (project, assignee, status, type). Uses Jira CLI.",
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "Project key (e.g., 'GVNS4', 'ARSW3')"
        },
        assignee: {
          type: "string",
          description: "Assignee username or 'currentUser()'"
        },
        status: {
          type: "string",
          description: "Issue status (e.g., 'To Do', 'In Progress', 'Done')"
        },
        type: {
          type: "string",
          description: "Issue type (e.g., 'Bug', 'Story', 'Task')"
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 50)"
        }
      }
    }
  },
  {
    name: "jira_issue_get",
    description: "Get detailed information about a specific Jira issue by key (e.g., 'GVNS4-3475')",
    inputSchema: {
      type: "object",
      properties: {
        issue_key: {
          type: "string",
          description: "Jira issue key (e.g., 'PROJ-123')"
        }
      },
      required: ["issue_key"]
    }
  },
  {
    name: "jira_issue_create",
    description: "Create a new Jira issue. Returns the created issue key.",
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "Project key"
        },
        type: {
          type: "string",
          description: "Issue type (Bug, Story, Task, etc.)"
        },
        summary: {
          type: "string",
          description: "Issue summary/title"
        },
        description: {
          type: "string",
          description: "Issue description"
        },
        priority: {
          type: "string",
          description: "Priority (Highest, High, Medium, Low, Lowest)"
        },
        assignee: {
          type: "string",
          description: "Assignee username"
        }
      },
      required: ["project", "type", "summary"]
    }
  },
  {
    name: "jira_issue_update",
    description: "Update an existing Jira issue (status, assignee, priority, etc.)",
    inputSchema: {
      type: "object",
      properties: {
        issue_key: {
          type: "string",
          description: "Jira issue key"
        },
        status: {
          type: "string",
          description: "New status"
        },
        assignee: {
          type: "string",
          description: "New assignee"
        },
        priority: {
          type: "string",
          description: "New priority"
        },
        comment: {
          type: "string",
          description: "Add a comment"
        }
      },
      required: ["issue_key"]
    }
  },
  
  // ============================================
  // JQL QUERY TOOLS
  // ============================================
  {
    name: "jira_jql_query",
    description: "Execute a custom JQL query. Very powerful for complex searches. Returns matching issues.",
    inputSchema: {
      type: "object",
      properties: {
        jql: {
          type: "string",
          description: "JQL query string (e.g., 'project = GVNS4 AND type = Bug AND status = \"To Do\"')"
        },
        maxResults: {
          type: "number",
          description: "Maximum results to return (default: 100)"
        }
      },
      required: ["jql"]
    }
  },
  
  // ============================================
  // PROJECT & SPRINT TOOLS
  // ============================================
  {
    name: "jira_project_list",
    description: "List all Jira projects you have access to",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "jira_sprint_list",
    description: "List sprints for a board",
    inputSchema: {
      type: "object",
      properties: {
        board_name: {
          type: "string",
          description: "Board name"
        },
        state: {
          type: "string",
          description: "Sprint state: active, future, closed, or all"
        }
      }
    }
  },
  {
    name: "jira_sprint_issues",
    description: "Get all issues in a specific sprint",
    inputSchema: {
      type: "object",
      properties: {
        sprint_name: {
          type: "string",
          description: "Sprint name"
        },
        board_name: {
          type: "string",
          description: "Board name"
        }
      },
      required: ["sprint_name"]
    }
  },
  
  // ============================================
  // EPIC & BOARD TOOLS
  // ============================================
  {
    name: "jira_epic_list",
    description: "List epics in a project",
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "Project key"
        }
      }
    }
  },
  {
    name: "jira_board_list",
    description: "List all boards",
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "Filter by project key (optional)"
        }
      }
    }
  },
  
  // ============================================
  // CUSTOM REPORTING TOOLS (PowerShell Scripts)
  // ============================================
  {
    name: "jira_report_bugs",
    description: "Get comprehensive bug report with statistics. Uses custom PowerShell script.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description: "Filter by status (comma-separated, e.g., 'Open,In Progress,To Do'). Use 'All' for all statuses."
        },
        maxResults: {
          type: "number",
          description: "Maximum results (default: 100)"
        },
        outputFormat: {
          type: "string",
          description: "Output format: table, csv, or json"
        }
      }
    }
  },
  {
    name: "jira_report_recent_issues",
    description: "Get report of all recent issues (last N days) with statistics",
    inputSchema: {
      type: "object",
      properties: {
        daysBack: {
          type: "number",
          description: "Number of days to look back (default: 7)"
        },
        maxResults: {
          type: "number",
          description: "Maximum results (default: 100)"
        }
      }
    }
  },
  
  // ============================================
  // WORKLOG MANAGEMENT TOOLS
  // ============================================
  {
    name: "jira_worklog_add",
    description: "Add time spent (worklog) to an issue",
    inputSchema: {
      type: "object",
      properties: {
        issue_key: {
          type: "string",
          description: "Jira issue key"
        },
        time_spent: {
          type: "string",
          description: "Time spent (e.g., '2h', '30m', '1d 4h')"
        },
        comment: {
          type: "string",
          description: "Worklog comment/description"
        },
        date: {
          type: "string",
          description: "Date of work (optional, format: YYYY-MM-DD)"
        }
      },
      required: ["issue_key", "time_spent"]
    }
  },
  {
    name: "jira_worklog_list",
    description: "List worklogs for an issue",
    inputSchema: {
      type: "object",
      properties: {
        issue_key: {
          type: "string",
          description: "Jira issue key"
        }
      },
      required: ["issue_key"]
    }
  },
  
  // ============================================
  // WATCH & VOTE TOOLS
  // ============================================
  {
    name: "jira_issue_watch",
    description: "Watch an issue to receive notifications",
    inputSchema: {
      type: "object",
      properties: {
        issue_key: {
          type: "string",
          description: "Jira issue key"
        }
      },
      required: ["issue_key"]
    }
  },
  {
    name: "jira_issue_unwatch",
    description: "Unwatch an issue to stop receiving notifications",
    inputSchema: {
      type: "object",
      properties: {
        issue_key: {
          type: "string",
          description: "Jira issue key"
        }
      },
      required: ["issue_key"]
    }
  },
  {
    name: "jira_issue_vote",
    description: "Vote for an issue",
    inputSchema: {
      type: "object",
      properties: {
        issue_key: {
          type: "string",
          description: "Jira issue key"
        }
      },
      required: ["issue_key"]
    }
  },
  {
    name: "jira_issue_unvote",
    description: "Remove your vote from an issue",
    inputSchema: {
      type: "object",
      properties: {
        issue_key: {
          type: "string",
          description: "Jira issue key"
        }
      },
      required: ["issue_key"]
    }
  },
  
  // ============================================
  // ISSUE OPERATIONS (DELETE, CLONE, LINK)
  // ============================================
  {
    name: "jira_issue_delete",
    description: "Delete a Jira issue (use with caution!)",
    inputSchema: {
      type: "object",
      properties: {
        issue_key: {
          type: "string",
          description: "Jira issue key to delete"
        }
      },
      required: ["issue_key"]
    }
  },
  {
    name: "jira_issue_clone",
    description: "Clone/duplicate an existing issue",
    inputSchema: {
      type: "object",
      properties: {
        issue_key: {
          type: "string",
          description: "Jira issue key to clone"
        },
        summary: {
          type: "string",
          description: "New summary (optional, will use original if not provided)"
        }
      },
      required: ["issue_key"]
    }
  },
  {
    name: "jira_issue_link",
    description: "Link two issues together (e.g., blocks, relates to, duplicates)",
    inputSchema: {
      type: "object",
      properties: {
        from_issue: {
          type: "string",
          description: "Source issue key"
        },
        to_issue: {
          type: "string",
          description: "Target issue key"
        },
        link_type: {
          type: "string",
          description: "Link type (e.g., 'blocks', 'relates to', 'duplicates', 'is blocked by')"
        }
      },
      required: ["from_issue", "to_issue", "link_type"]
    }
  },
  {
    name: "jira_issue_links",
    description: "List all links for an issue",
    inputSchema: {
      type: "object",
      properties: {
        issue_key: {
          type: "string",
          description: "Jira issue key"
        }
      },
      required: ["issue_key"]
    }
  },
  
  // ============================================
  // LABEL MANAGEMENT TOOLS
  // ============================================
  {
    name: "jira_label_add",
    description: "Add one or more labels to an issue",
    inputSchema: {
      type: "object",
      properties: {
        issue_key: {
          type: "string",
          description: "Jira issue key"
        },
        labels: {
          type: "string",
          description: "Labels to add (comma-separated, e.g., 'frontend,bug,urgent')"
        }
      },
      required: ["issue_key", "labels"]
    }
  },
  {
    name: "jira_label_remove",
    description: "Remove one or more labels from an issue",
    inputSchema: {
      type: "object",
      properties: {
        issue_key: {
          type: "string",
          description: "Jira issue key"
        },
        labels: {
          type: "string",
          description: "Labels to remove (comma-separated)"
        }
      },
      required: ["issue_key", "labels"]
    }
  },
  
  // ============================================
  // COMPONENT MANAGEMENT TOOLS
  // ============================================
  {
    name: "jira_component_list",
    description: "List components in a project",
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "Project key"
        }
      },
      required: ["project"]
    }
  },
  {
    name: "jira_component_add",
    description: "Add a new component to a project",
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "Project key"
        },
        name: {
          type: "string",
          description: "Component name"
        },
        description: {
          type: "string",
          description: "Component description (optional)"
        },
        lead: {
          type: "string",
          description: "Component lead username (optional)"
        }
      },
      required: ["project", "name"]
    }
  },
  
  // ============================================
  // VERSION/RELEASE MANAGEMENT TOOLS
  // ============================================
  {
    name: "jira_version_list",
    description: "List versions/releases in a project",
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "Project key"
        }
      },
      required: ["project"]
    }
  },
  {
    name: "jira_version_create",
    description: "Create a new version/release in a project",
    inputSchema: {
      type: "object",
      properties: {
        project: {
          type: "string",
          description: "Project key"
        },
        name: {
          type: "string",
          description: "Version name (e.g., '1.0.0', 'Sprint 42')"
        },
        description: {
          type: "string",
          description: "Version description (optional)"
        },
        release_date: {
          type: "string",
          description: "Planned release date (optional, format: YYYY-MM-DD)"
        }
      },
      required: ["project", "name"]
    }
  },
  
  // ============================================
  // ATTACHMENT TOOLS
  // ============================================
  {
    name: "jira_attachment_add",
    description: "Add an attachment to an issue",
    inputSchema: {
      type: "object",
      properties: {
        issue_key: {
          type: "string",
          description: "Jira issue key"
        },
        file_path: {
          type: "string",
          description: "Full path to the file to attach"
        }
      },
      required: ["issue_key", "file_path"]
    }
  },
  {
    name: "jira_attachment_list",
    description: "List attachments for an issue",
    inputSchema: {
      type: "object",
      properties: {
        issue_key: {
          type: "string",
          description: "Jira issue key"
        }
      },
      required: ["issue_key"]
    }
  },
  
  // ============================================
  // ADVANCED SPRINT OPERATIONS
  // ============================================
  {
    name: "jira_sprint_add_issue",
    description: "Add issues to a sprint",
    inputSchema: {
      type: "object",
      properties: {
        sprint_name: {
          type: "string",
          description: "Sprint name"
        },
        issue_keys: {
          type: "string",
          description: "Issue keys to add (comma-separated, e.g., 'PROJ-1,PROJ-2')"
        },
        board_name: {
          type: "string",
          description: "Board name (optional)"
        }
      },
      required: ["sprint_name", "issue_keys"]
    }
  },
  {
    name: "jira_sprint_remove_issue",
    description: "Remove issues from a sprint",
    inputSchema: {
      type: "object",
      properties: {
        sprint_name: {
          type: "string",
          description: "Sprint name"
        },
        issue_keys: {
          type: "string",
          description: "Issue keys to remove (comma-separated)"
        },
        board_name: {
          type: "string",
          description: "Board name (optional)"
        }
      },
      required: ["sprint_name", "issue_keys"]
    }
  },
  
  // ============================================
  // ISSUE TRANSITIONS
  // ============================================
  {
    name: "jira_issue_transitions",
    description: "List available status transitions for an issue",
    inputSchema: {
      type: "object",
      properties: {
        issue_key: {
          type: "string",
          description: "Jira issue key"
        }
      },
      required: ["issue_key"]
    }
  },
  
  // ============================================
  // SUBTASK MANAGEMENT
  // ============================================
  {
    name: "jira_subtask_create",
    description: "Create a subtask under a parent issue",
    inputSchema: {
      type: "object",
      properties: {
        parent_key: {
          type: "string",
          description: "Parent issue key"
        },
        summary: {
          type: "string",
          description: "Subtask summary/title"
        },
        description: {
          type: "string",
          description: "Subtask description (optional)"
        },
        assignee: {
          type: "string",
          description: "Assignee username (optional)"
        }
      },
      required: ["parent_key", "summary"]
    }
  },
  
  // ============================================
  // ISSUE EXPORT
  // ============================================
  {
    name: "jira_issue_export",
    description: "Export issues to CSV or JSON format",
    inputSchema: {
      type: "object",
      properties: {
        jql: {
          type: "string",
          description: "JQL query to filter issues"
        },
        format: {
          type: "string",
          description: "Export format: 'csv' or 'json'"
        },
        output_file: {
          type: "string",
          description: "Output file path (optional, will print to console if not provided)"
        },
        maxResults: {
          type: "number",
          description: "Maximum results (default: 100)"
        }
      },
      required: ["jql", "format"]
    }
  },
  
  // ============================================
  // UTILITY TOOLS
  // ============================================
  {
    name: "jira_open",
    description: "Open a Jira issue in the default browser",
    inputSchema: {
      type: "object",
      properties: {
        issue_key: {
          type: "string",
          description: "Jira issue key"
        }
      },
      required: ["issue_key"]
    }
  },
  {
    name: "jira_me",
    description: "Display information about the configured Jira user",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "jira_serverinfo",
    description: "Display information about the Jira instance",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];

// Register list tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS
  };
});

// Register call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // ============================================
      // ISSUE MANAGEMENT
      // ============================================
      case "jira_issue_list": {
        const filters = [];
        if (args.project) filters.push(`project = ${args.project}`);
        if (args.assignee) filters.push(`assignee = ${args.assignee}`);
        if (args.status) filters.push(`status = "${args.status}"`);
        if (args.type) filters.push(`type = ${args.type}`);
        
        const jql = filters.length > 0 ? filters.join(' AND ') : 'order by updated DESC';
        const limit = args.limit || 50;
        
        const result = await executeJiraCLI('issue', ['list', '-q', `"${jql}"`, '--plain', `-n ${limit}`]);
        
        return {
          content: [
            {
              type: "text",
              text: result.success ? result.output : `Error: ${result.error}`
            }
          ]
        };
      }
      
      case "jira_issue_get": {
        const result = await executeJiraCLI('issue', ['view', args.issue_key, '--plain']);
        
        return {
          content: [
            {
              type: "text",
              text: result.success ? result.output : `Error: ${result.error}`
            }
          ]
        };
      }
      
      case "jira_issue_create": {
        const createArgs = [
          'create',
          '-t', args.type,
          '-s', `"${args.summary}"`,
          '-p', args.project
        ];
        
        if (args.description) createArgs.push('-b', `"${args.description}"`);
        if (args.priority) createArgs.push('--priority', args.priority);
        if (args.assignee) createArgs.push('-a', args.assignee);
        
        const result = await executeJiraCLI('issue', createArgs);
        
        return {
          content: [
            {
              type: "text",
              text: result.success 
                ? `✅ Issue created successfully!\n\n${result.output}` 
                : `Error creating issue: ${result.error}`
            }
          ]
        };
      }
      
      case "jira_issue_update": {
        let updateCommands = [];
        
        // Transition to new status
        if (args.status) {
          const transitionResult = await executeJiraCLI('issue', [
            'move', args.issue_key, args.status
          ]);
          updateCommands.push(`Status transition: ${transitionResult.success ? '✅' : '❌'}`);
        }
        
        // Assign
        if (args.assignee) {
          const assignResult = await executeJiraCLI('issue', [
            'assign', args.issue_key, args.assignee
          ]);
          updateCommands.push(`Assignee update: ${assignResult.success ? '✅' : '❌'}`);
        }
        
        // Add comment
        if (args.comment) {
          const commentResult = await executeJiraCLI('issue', [
            'comment', 'add', args.issue_key, '-m', `"${args.comment}"`
          ]);
          updateCommands.push(`Comment added: ${commentResult.success ? '✅' : '❌'}`);
        }
        
        return {
          content: [
            {
              type: "text",
              text: `Issue ${args.issue_key} updated:\n${updateCommands.join('\n')}`
            }
          ]
        };
      }
      
      // ============================================
      // JQL QUERIES
      // ============================================
      case "jira_jql_query": {
        const maxResults = args.maxResults || 100;
        const result = await executeJiraAPI(args.jql, maxResults);
        
        if (result.success) {
          try {
            const data = JSON.parse(result.output);
            const issues = data.issues || [];
            
            let output = `Found ${data.total} issues (showing ${issues.length}):\n\n`;
            
            issues.forEach(issue => {
              output += `${issue.key} - ${issue.fields.summary}\n`;
              output += `  Status: ${issue.fields.status.name}\n`;
              output += `  Type: ${issue.fields.issuetype.name}\n`;
              output += `  Priority: ${issue.fields.priority?.name || 'None'}\n`;
              output += `  Assignee: ${issue.fields.assignee?.displayName || 'Unassigned'}\n`;
              output += `  URL: ${JIRA_BASE_URL}/browse/${issue.key}\n\n`;
            });
            
            return {
              content: [{ type: "text", text: output }]
            };
          } catch (e) {
            return {
              content: [{ type: "text", text: `Error parsing response: ${e.message}` }]
            };
          }
        } else {
          return {
            content: [{ type: "text", text: `Error executing JQL: ${result.error}` }]
          };
        }
      }
      
      // ============================================
      // PROJECT & SPRINT
      // ============================================
      case "jira_project_list": {
        const result = await executeJiraCLI('project', ['list', '--plain']);
        return {
          content: [{ type: "text", text: result.success ? result.output : `Error: ${result.error}` }]
        };
      }
      
      case "jira_sprint_list": {
        const sprintArgs = ['list'];
        if (args.board_name) sprintArgs.push('--board', args.board_name);
        if (args.state) sprintArgs.push('--state', args.state);
        sprintArgs.push('--plain');
        
        const result = await executeJiraCLI('sprint', sprintArgs);
        return {
          content: [{ type: "text", text: result.success ? result.output : `Error: ${result.error}` }]
        };
      }
      
      case "jira_sprint_issues": {
        const sprintArgs = ['list', '--current'];
        if (args.board_name) sprintArgs.push('--board', args.board_name);
        sprintArgs.push('--plain');
        
        const result = await executeJiraCLI('issue', sprintArgs);
        return {
          content: [{ type: "text", text: result.success ? result.output : `Error: ${result.error}` }]
        };
      }
      
      // ============================================
      // EPIC & BOARD
      // ============================================
      case "jira_epic_list": {
        const epicArgs = ['list', '--plain'];
        if (args.project) epicArgs.push('-p', args.project);
        
        const result = await executeJiraCLI('epic', epicArgs);
        return {
          content: [{ type: "text", text: result.success ? result.output : `Error: ${result.error}` }]
        };
      }
      
      case "jira_board_list": {
        const boardArgs = ['list', '--plain'];
        if (args.project) boardArgs.push('-p', args.project);
        
        const result = await executeJiraCLI('board', boardArgs);
        return {
          content: [{ type: "text", text: result.success ? result.output : `Error: ${result.error}` }]
        };
      }
      
      // ============================================
      // CUSTOM REPORTING (PowerShell)
      // ============================================
      case "jira_report_bugs": {
        const scriptArgs = {};
        if (args.status) scriptArgs.Status = args.status;
        if (args.maxResults) scriptArgs.MaxResults = args.maxResults;
        if (args.outputFormat) scriptArgs.OutputFormat = args.outputFormat;
        
        const result = await executePowerShellScript('Local/get-jira-bugs.ps1', scriptArgs);
        return {
          content: [{ type: "text", text: result.success ? result.output : `Error: ${result.error}` }]
        };
      }
      
      case "jira_report_recent_issues": {
        const scriptArgs = {};
        if (args.daysBack) scriptArgs.DaysBack = args.daysBack;
        if (args.maxResults) scriptArgs.MaxResults = args.maxResults;
        
        const result = await executePowerShellScript('Local/get-all-issues.ps1', scriptArgs);
        return {
          content: [{ type: "text", text: result.success ? result.output : `Error: ${result.error}` }]
        };
      }
      
      // ============================================
      // WORKLOG MANAGEMENT
      // ============================================
      case "jira_worklog_add": {
        const worklogArgs = ['worklog', 'add', args.issue_key, '--time-spent', args.time_spent];
        if (args.comment) worklogArgs.push('-m', `"${args.comment}"`);
        if (args.date) worklogArgs.push('--started', args.date);
        
        const result = await executeJiraCLI('issue', worklogArgs);
        return {
          content: [{ type: "text", text: result.success ? `✅ Worklog added to ${args.issue_key}` : `Error: ${result.error}` }]
        };
      }
      
      case "jira_worklog_list": {
        const result = await executeJiraCLI('issue', ['worklog', 'list', args.issue_key, '--plain']);
        return {
          content: [{ type: "text", text: result.success ? result.output : `Error: ${result.error}` }]
        };
      }
      
      // ============================================
      // WATCH & VOTE
      // ============================================
      case "jira_issue_watch": {
        const result = await executeJiraCLI('issue', ['watch', args.issue_key]);
        return {
          content: [{ type: "text", text: result.success ? `✅ Now watching ${args.issue_key}` : `Error: ${result.error}` }]
        };
      }
      
      case "jira_issue_unwatch": {
        const result = await executeJiraCLI('issue', ['unwatch', args.issue_key]);
        return {
          content: [{ type: "text", text: result.success ? `✅ Stopped watching ${args.issue_key}` : `Error: ${result.error}` }]
        };
      }
      
      case "jira_issue_vote": {
        const result = await executeJiraCLI('issue', ['vote', 'up', args.issue_key]);
        return {
          content: [{ type: "text", text: result.success ? `✅ Voted for ${args.issue_key}` : `Error: ${result.error}` }]
        };
      }
      
      case "jira_issue_unvote": {
        const result = await executeJiraCLI('issue', ['vote', 'down', args.issue_key]);
        return {
          content: [{ type: "text", text: result.success ? `✅ Removed vote from ${args.issue_key}` : `Error: ${result.error}` }]
        };
      }
      
      // ============================================
      // ISSUE OPERATIONS (DELETE, CLONE, LINK)
      // ============================================
      case "jira_issue_delete": {
        const result = await executeJiraCLI('issue', ['delete', args.issue_key, '--force']);
        return {
          content: [{ type: "text", text: result.success ? `✅ Issue ${args.issue_key} deleted` : `Error: ${result.error}` }]
        };
      }
      
      case "jira_issue_clone": {
        const cloneArgs = ['clone', args.issue_key];
        if (args.summary) cloneArgs.push('-s', `"${args.summary}"`);
        
        const result = await executeJiraCLI('issue', cloneArgs);
        return {
          content: [{ type: "text", text: result.success ? `✅ Issue cloned\n${result.output}` : `Error: ${result.error}` }]
        };
      }
      
      case "jira_issue_link": {
        const result = await executeJiraCLI('issue', [
          'link', args.from_issue, args.to_issue, '--type', `"${args.link_type}"`
        ]);
        return {
          content: [{ type: "text", text: result.success ? `✅ Linked ${args.from_issue} to ${args.to_issue}` : `Error: ${result.error}` }]
        };
      }
      
      case "jira_issue_links": {
        const result = await executeJiraCLI('issue', ['view', args.issue_key, '--plain']);
        // Parse output to extract links section
        return {
          content: [{ type: "text", text: result.success ? result.output : `Error: ${result.error}` }]
        };
      }
      
      // ============================================
      // LABEL MANAGEMENT
      // ============================================
      case "jira_label_add": {
        const labels = args.labels.split(',').map(l => l.trim());
        const result = await executeJiraCLI('issue', ['label', 'add', args.issue_key, ...labels]);
        return {
          content: [{ type: "text", text: result.success ? `✅ Labels added to ${args.issue_key}` : `Error: ${result.error}` }]
        };
      }
      
      case "jira_label_remove": {
        const labels = args.labels.split(',').map(l => l.trim());
        const result = await executeJiraCLI('issue', ['label', 'remove', args.issue_key, ...labels]);
        return {
          content: [{ type: "text", text: result.success ? `✅ Labels removed from ${args.issue_key}` : `Error: ${result.error}` }]
        };
      }
      
      // ============================================
      // COMPONENT MANAGEMENT
      // ============================================
      case "jira_component_list": {
        const result = await executeJiraCLI('component', ['list', '-p', args.project, '--plain']);
        return {
          content: [{ type: "text", text: result.success ? result.output : `Error: ${result.error}` }]
        };
      }
      
      case "jira_component_add": {
        const compArgs = ['add', args.name, '-p', args.project];
        if (args.description) compArgs.push('-d', `"${args.description}"`);
        if (args.lead) compArgs.push('-l', args.lead);
        
        const result = await executeJiraCLI('component', compArgs);
        return {
          content: [{ type: "text", text: result.success ? `✅ Component '${args.name}' added to ${args.project}` : `Error: ${result.error}` }]
        };
      }
      
      // ============================================
      // VERSION/RELEASE MANAGEMENT
      // ============================================
      case "jira_version_list": {
        const result = await executeJiraCLI('version', ['list', '-p', args.project, '--plain']);
        return {
          content: [{ type: "text", text: result.success ? result.output : `Error: ${result.error}` }]
        };
      }
      
      case "jira_version_create": {
        const verArgs = ['create', args.name, '-p', args.project];
        if (args.description) verArgs.push('-d', `"${args.description}"`);
        if (args.release_date) verArgs.push('-r', args.release_date);
        
        const result = await executeJiraCLI('version', verArgs);
        return {
          content: [{ type: "text", text: result.success ? `✅ Version '${args.name}' created in ${args.project}` : `Error: ${result.error}` }]
        };
      }
      
      // ============================================
      // ATTACHMENTS
      // ============================================
      case "jira_attachment_add": {
        const result = await executeJiraCLI('issue', ['attach', args.issue_key, args.file_path]);
        return {
          content: [{ type: "text", text: result.success ? `✅ File attached to ${args.issue_key}` : `Error: ${result.error}` }]
        };
      }
      
      case "jira_attachment_list": {
        // Get issue details and parse attachments
        const result = await executeJiraCLI('issue', ['view', args.issue_key, '--plain']);
        return {
          content: [{ type: "text", text: result.success ? result.output : `Error: ${result.error}` }]
        };
      }
      
      // ============================================
      // ADVANCED SPRINT OPERATIONS
      // ============================================
      case "jira_sprint_add_issue": {
        const issues = args.issue_keys.split(',').map(k => k.trim());
        const sprintArgs = ['add', args.sprint_name, ...issues];
        if (args.board_name) sprintArgs.push('--board', args.board_name);
        
        const result = await executeJiraCLI('sprint', sprintArgs);
        return {
          content: [{ type: "text", text: result.success ? `✅ Issues added to sprint '${args.sprint_name}'` : `Error: ${result.error}` }]
        };
      }
      
      case "jira_sprint_remove_issue": {
        const issues = args.issue_keys.split(',').map(k => k.trim());
        const sprintArgs = ['remove', args.sprint_name, ...issues];
        if (args.board_name) sprintArgs.push('--board', args.board_name);
        
        const result = await executeJiraCLI('sprint', sprintArgs);
        return {
          content: [{ type: "text", text: result.success ? `✅ Issues removed from sprint '${args.sprint_name}'` : `Error: ${result.error}` }]
        };
      }
      
      // ============================================
      // ISSUE TRANSITIONS
      // ============================================
      case "jira_issue_transitions": {
        const result = await executeJiraCLI('issue', ['transitions', args.issue_key, '--plain']);
        return {
          content: [{ type: "text", text: result.success ? result.output : `Error: ${result.error}` }]
        };
      }
      
      // ============================================
      // SUBTASK MANAGEMENT
      // ============================================
      case "jira_subtask_create": {
        const subtaskArgs = [
          'create',
          '-t', 'Subtask',
          '-s', `"${args.summary}"`,
          '--parent', args.parent_key
        ];
        
        if (args.description) subtaskArgs.push('-b', `"${args.description}"`);
        if (args.assignee) subtaskArgs.push('-a', args.assignee);
        
        const result = await executeJiraCLI('issue', subtaskArgs);
        return {
          content: [{ type: "text", text: result.success ? `✅ Subtask created under ${args.parent_key}\n${result.output}` : `Error: ${result.error}` }]
        };
      }
      
      // ============================================
      // ISSUE EXPORT
      // ============================================
      case "jira_issue_export": {
        const maxResults = args.maxResults || 100;
        const result = await executeJiraAPI(args.jql, maxResults);
        
        if (result.success) {
          try {
            const data = JSON.parse(result.output);
            const issues = data.issues || [];
            
            if (args.format === 'json') {
              const jsonOutput = JSON.stringify(issues, null, 2);
              if (args.output_file) {
                // Write to file via PowerShell
                const writeScript = `
$content = @'
${jsonOutput}
'@
$content | Out-File -FilePath "${args.output_file}" -Encoding UTF8
Write-Host "✅ Exported ${issues.length} issues to ${args.output_file}"
`;
                const writeResult = await execAsync(`powershell.exe -Command "${writeScript.replace(/"/g, '\\"')}"`);
                return {
                  content: [{ type: "text", text: writeResult.stdout }]
                };
              } else {
                return {
                  content: [{ type: "text", text: jsonOutput }]
                };
              }
            } else if (args.format === 'csv') {
              let csvOutput = 'Key,Summary,Status,Type,Priority,Assignee,Created,Updated\n';
              issues.forEach(issue => {
                const row = [
                  issue.key,
                  `"${issue.fields.summary.replace(/"/g, '""')}"`,
                  issue.fields.status.name,
                  issue.fields.issuetype.name,
                  issue.fields.priority?.name || 'None',
                  issue.fields.assignee?.displayName || 'Unassigned',
                  issue.fields.created,
                  issue.fields.updated
                ].join(',');
                csvOutput += row + '\n';
              });
              
              if (args.output_file) {
                // Write to file via PowerShell
                const writeScript = `
$content = @'
${csvOutput}
'@
$content | Out-File -FilePath "${args.output_file}" -Encoding UTF8
Write-Host "✅ Exported ${issues.length} issues to ${args.output_file}"
`;
                const writeResult = await execAsync(`powershell.exe -Command "${writeScript.replace(/"/g, '\\"')}"`);
                return {
                  content: [{ type: "text", text: writeResult.stdout }]
                };
              } else {
                return {
                  content: [{ type: "text", text: csvOutput }]
                };
              }
            }
          } catch (e) {
            return {
              content: [{ type: "text", text: `Error exporting: ${e.message}` }]
            };
          }
        } else {
          return {
            content: [{ type: "text", text: `Error executing query: ${result.error}` }]
          };
        }
      }
      
      // ============================================
      // UTILITY
      // ============================================
      case "jira_open": {
        const result = await executeJiraCLI('open', [args.issue_key]);
        return {
          content: [{ type: "text", text: result.success ? `Opened ${args.issue_key} in browser` : `Error: ${result.error}` }]
        };
      }
      
      case "jira_me": {
        const result = await executeJiraCLI('me', ['--plain']);
        return {
          content: [{ type: "text", text: result.success ? result.output : `Error: ${result.error}` }]
        };
      }
      
      case "jira_serverinfo": {
        const result = await executeJiraCLI('serverinfo', ['--plain']);
        return {
          content: [{ type: "text", text: result.success ? result.output : `Error: ${result.error}` }]
        };
      }
      
      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error executing ${name}: ${error.message}` }],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Custom Jira MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});




