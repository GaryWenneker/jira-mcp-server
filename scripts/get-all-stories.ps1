# Jira Story Report Script
# Gets all recent stories
# Configuration: Uses environment variables or optional config file

param(
    [int]$MaxResults = 100,
    [string]$ProjectKey = "",  # Empty = all projects
    [int]$DaysBack = 30,
    [string]$ConfigFile = ""  # Optional: path to MCP config file
)

# Function to read config from file
function Get-ConfigFromFile {
    param([string]$ConfigPath)
    
    if (-not (Test-Path $ConfigPath)) {
        return $null
    }
    
    try {
        $config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
        $jiraConfig = $config.mcpServers.JiraMCP.env
        
        if ($jiraConfig.JIRA_BASE_URL -and $jiraConfig.JIRA_USERNAME -and $jiraConfig.JIRA_API_TOKEN) {
            return @{
                Url = $jiraConfig.JIRA_BASE_URL
                Username = $jiraConfig.JIRA_USERNAME
                Token = $jiraConfig.JIRA_API_TOKEN
            }
        }
    } catch {
        Write-Host "Warning: Failed to read config from $ConfigPath" -ForegroundColor Yellow
    }
    
    return $null
}

# Try to get configuration (priority: env vars > config file > error)
$jiraUrl = $env:JIRA_BASE_URL
$email = $env:JIRA_USERNAME
$apiToken = $env:JIRA_API_TOKEN

# If env vars not set, try config file
if (-not $jiraUrl -or -not $email -or -not $apiToken) {
    # Try provided config file path first
    if ($ConfigFile) {
        $config = Get-ConfigFromFile -ConfigPath $ConfigFile
    }
    # Then try default location (for local development)
    elseif (Test-Path "../../.cursor/mcp-sitecore-config.json") {
        $config = Get-ConfigFromFile -ConfigPath "../../.cursor/mcp-sitecore-config.json"
    }
    
    if ($config) {
        $jiraUrl = $config.Url
        $email = $config.Username
        $apiToken = $config.Token
        Write-Host "Using configuration from config file" -ForegroundColor Gray
    }
}

# Validate configuration
if (-not $jiraUrl -or -not $email -or -not $apiToken) {
    Write-Host "ERROR: Jira configuration not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please provide configuration via:" -ForegroundColor Yellow
    Write-Host "  1. Environment variables:" -ForegroundColor Yellow
    Write-Host "     `$env:JIRA_BASE_URL = 'https://yourcompany.atlassian.net'" -ForegroundColor Gray
    Write-Host "     `$env:JIRA_USERNAME = 'your.email@company.com'" -ForegroundColor Gray
    Write-Host "     `$env:JIRA_API_TOKEN = 'your-api-token'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Config file parameter:" -ForegroundColor Yellow
    Write-Host "     .\get-all-stories.ps1 -ConfigFile 'path\to\config.json'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. MCP config file in default location:" -ForegroundColor Yellow
    Write-Host "     .cursor\mcp-sitecore-config.json" -ForegroundColor Gray
    exit 1
}

Write-Host "Fetching recent stories from Jira..." -ForegroundColor Cyan
Write-Host "Server: $jiraUrl" -ForegroundColor Gray

# Create auth header
$pair = "$($email):$($apiToken)"
$encodedCreds = [System.Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes($pair))

$headers = @{
    Authorization = "Basic $encodedCreds"
    'Content-Type' = "application/json"
    Accept = "application/json"
}

# Build JQL query
if ($ProjectKey) {
    $jql = "project = $ProjectKey AND type = Story AND updated >= -${DaysBack}d ORDER BY updated DESC"
} else {
    $jql = "type = Story AND updated >= -${DaysBack}d ORDER BY updated DESC"
}

try {
    # Make API request
    $escapedJql = [System.Uri]::EscapeDataString($jql)
    $queryString = "jql=$escapedJql`&maxResults=$MaxResults`&fields=key,summary,status,priority,assignee,created,updated,project,sprint,customfield_10020,customfield_10016"
    $uri = "$jiraUrl/rest/api/3/search/jql?$queryString"
    
    Write-Host "JQL: $jql" -ForegroundColor Gray
    
    $response = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
    
    Write-Host "Found $($response.total) total stories (showing first $MaxResults)" -ForegroundColor Green
    
    if ($response.issues.Count -eq 0) {
        Write-Host "No stories found." -ForegroundColor Yellow
        exit
    }
    
    # Process results
    $stories = $response.issues | ForEach-Object {
        # Try to get sprint info from different possible fields
        $sprintInfo = "No Sprint"
        
        # Try customfield_10020 (common sprint field)
        if ($_.fields.customfield_10020) {
            if ($_.fields.customfield_10020 -is [Array] -and $_.fields.customfield_10020.Count -gt 0) {
                $lastSprint = $_.fields.customfield_10020[-1]
                if ($lastSprint.name) {
                    $sprintInfo = $lastSprint.name
                } elseif ($lastSprint -is [String]) {
                    # Parse sprint string if it's in format "name=..."
                    if ($lastSprint -match "name=([^,\]]+)") {
                        $sprintInfo = $matches[1]
                    } else {
                        $sprintInfo = $lastSprint.Substring(0, [Math]::Min(50, $lastSprint.Length))
                    }
                }
            }
        }
        
        # Try customfield_10016 (story points)
        $storyPoints = if ($_.fields.customfield_10016) { $_.fields.customfield_10016 } else { "N/A" }
        
        [PSCustomObject]@{
            Key = $_.key
            Project = $_.fields.project.key
            Summary = $_.fields.summary.Substring(0, [Math]::Min(80, $_.fields.summary.Length))
            Status = $_.fields.status.name
            Priority = if ($_.fields.priority) { $_.fields.priority.name } else { "None" }
            Assignee = if ($_.fields.assignee) { $_.fields.assignee.displayName } else { "Unassigned" }
            Sprint = $sprintInfo
            Points = $storyPoints
            Updated = [DateTime]::Parse($_.fields.updated).ToString("yyyy-MM-dd")
            URL = "$jiraUrl/browse/$($_.key)"
        }
    }
    
    # Output
    Write-Host ""
    Write-Host "RECENT STORIES (Last $DaysBack days)" -ForegroundColor Cyan
    Write-Host ("=" * 200)
    $stories | Format-Table -AutoSize
    Write-Host ("=" * 200)
    Write-Host ""
    Write-Host "Total: $($stories.Count) stories shown" -ForegroundColor Cyan
    
    # Statistics
    Write-Host ""
    Write-Host "STATISTICS" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "By Status:"
    $stories | Group-Object Status | Sort-Object Count -Descending | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "By Project:"
    $stories | Group-Object Project | Sort-Object Count -Descending | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "By Sprint:"
    $stories | Group-Object Sprint | Sort-Object Count -Descending | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "By Assignee (Top 10):"
    $stories | Group-Object Assignee | Sort-Object Count -Descending | Select-Object -First 10 | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor Gray
    }
    
    # Export to CSV
    $csvPath = "jira-stories-$(Get-Date -Format 'yyyyMMdd-HHmmss').csv"
    $stories | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8
    Write-Host ""
    Write-Host "Exported to: $csvPath" -ForegroundColor Green
    
} catch {
    Write-Host "ERROR fetching stories from Jira" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response:" -ForegroundColor Red
        Write-Host $responseBody -ForegroundColor Red
    }
    exit 1
}
