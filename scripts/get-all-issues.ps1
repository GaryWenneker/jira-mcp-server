# Jira All Issues Report
# Gets all recent issues regardless of type
# Configuration: Uses environment variables or optional config file

param(
    [int]$MaxResults = 100,
    [int]$DaysBack = 7,
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
    Write-Host "     .\get-all-issues.ps1 -ConfigFile 'path\to\config.json'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. MCP config file in default location:" -ForegroundColor Yellow
    Write-Host "     .cursor\mcp-sitecore-config.json" -ForegroundColor Gray
    exit 1
}

Write-Host "Fetching recent issues from Jira..." -ForegroundColor Cyan
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
$jql = "updated >= -${DaysBack}d ORDER BY updated DESC"

try {
    # Make API request
    $escapedJql = [System.Uri]::EscapeDataString($jql)
    $queryString = "jql=$escapedJql`&maxResults=$MaxResults`&fields=key,summary,status,priority,assignee,issuetype,created,updated,project"
    $uri = "$jiraUrl/rest/api/3/search/jql?$queryString"
    
    Write-Host "JQL: $jql" -ForegroundColor Gray
    
    $response = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
    
    Write-Host "Found $($response.total) total issues (showing first $MaxResults)" -ForegroundColor Green
    
    if ($response.issues.Count -eq 0) {
        Write-Host "No issues found." -ForegroundColor Yellow
        exit
    }
    
    # Process results
    $issues = $response.issues | ForEach-Object {
        [PSCustomObject]@{
            Key = $_.key
            Type = $_.fields.issuetype.name
            Project = $_.fields.project.key
            Summary = $_.fields.summary.Substring(0, [Math]::Min(70, $_.fields.summary.Length))
            Status = $_.fields.status.name
            Priority = if ($_.fields.priority) { $_.fields.priority.name } else { "None" }
            Assignee = if ($_.fields.assignee) { $_.fields.assignee.displayName } else { "Unassigned" }
            Updated = [DateTime]::Parse($_.fields.updated).ToString("yyyy-MM-dd HH:mm")
            URL = "$jiraUrl/browse/$($_.key)"
        }
    }
    
    # Output
    Write-Host ""
    Write-Host "RECENT ISSUES (Last $DaysBack days)" -ForegroundColor Cyan
    Write-Host ("=" * 200)
    $issues | Format-Table -AutoSize
    Write-Host ("=" * 200)
    Write-Host ""
    Write-Host "Total: $($issues.Count) issues shown" -ForegroundColor Cyan
    
    # Statistics
    Write-Host ""
    Write-Host "STATISTICS" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "By Issue Type:"
    $issues | Group-Object Type | Sort-Object Count -Descending | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "By Status:"
    $issues | Group-Object Status | Sort-Object Count -Descending | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "By Project:"
    $issues | Group-Object Project | Sort-Object Count -Descending | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "By Assignee:"
    $issues | Group-Object Assignee | Sort-Object Count -Descending | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor Gray
    }
    
    # Export to CSV
    $csvPath = "jira-all-issues-$(Get-Date -Format 'yyyyMMdd-HHmmss').csv"
    $issues | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8
    Write-Host ""
    Write-Host "Exported to: $csvPath" -ForegroundColor Green
    
} catch {
    Write-Host "ERROR fetching issues from Jira" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response:" -ForegroundColor Red
        Write-Host $responseBody -ForegroundColor Red
    }
    exit 1
}
