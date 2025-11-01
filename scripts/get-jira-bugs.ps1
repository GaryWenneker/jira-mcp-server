# Jira Bug Report Script
# Gets all open bugs from Jira
# Configuration: Uses environment variables or optional config file

param(
    [string]$Status = "Open,In Progress,To Do,Backlog",
    [int]$MaxResults = 100,
    [string]$OutputFormat = "table",
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
    Write-Host "     .\get-jira-bugs.ps1 -ConfigFile 'path\to\config.json'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. MCP config file in default location:" -ForegroundColor Yellow
    Write-Host "     .cursor\mcp-sitecore-config.json" -ForegroundColor Gray
    exit 1
}

Write-Host "Fetching bugs from Jira..." -ForegroundColor Cyan
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
$jql = "type = Bug ORDER BY priority DESC, updated DESC"

try {
    # Make API request
    $escapedJql = [System.Uri]::EscapeDataString($jql)
    $queryString = "jql=$escapedJql`&maxResults=$MaxResults`&fields=key,summary,status,priority,assignee,created,updated,project"
    $uri = "$jiraUrl/rest/api/3/search/jql?$queryString"
    
    Write-Host "Calling API..." -ForegroundColor Gray
    
    $response = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get
    
    Write-Host "Found $($response.total) total bugs" -ForegroundColor Green
    
    if ($response.issues.Count -eq 0) {
        Write-Host "No bugs found matching criteria." -ForegroundColor Yellow
        exit
    }
    
    # Process results
    $bugs = $response.issues | ForEach-Object {
        [PSCustomObject]@{
            Key = $_.key
            Project = $_.fields.project.key
            Summary = $_.fields.summary
            Status = $_.fields.status.name
            Priority = if ($_.fields.priority) { $_.fields.priority.name } else { "None" }
            Assignee = if ($_.fields.assignee) { $_.fields.assignee.displayName } else { "Unassigned" }
            Created = [DateTime]::Parse($_.fields.created).ToString("yyyy-MM-dd")
            Updated = [DateTime]::Parse($_.fields.updated).ToString("yyyy-MM-dd")
            URL = "$jiraUrl/browse/$($_.key)"
        }
    }
    
    # Filter by status if specified
    if ($Status -ne "All") {
        $statusList = $Status -split ',' | ForEach-Object { $_.Trim() }
        $bugs = $bugs | Where-Object { $statusList -contains $_.Status }
    }
    
    # Output
    Write-Host ""
    Write-Host "BUG LIST" -ForegroundColor Cyan
    Write-Host ("=" * 150)
    $bugs | Format-Table -AutoSize
    Write-Host ("=" * 150)
    Write-Host ""
    Write-Host "Total: $($bugs.Count) bugs" -ForegroundColor Cyan
    
    # Statistics
    Write-Host ""
    Write-Host "STATISTICS" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "By Status:"
    $bugs | Group-Object Status | Sort-Object Count -Descending | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "By Priority:"
    $bugs | Group-Object Priority | Sort-Object Count -Descending | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "By Project:"
    $bugs | Group-Object Project | Sort-Object Count -Descending | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor Gray
    }
    
    # Export options
    if ($OutputFormat.ToLower() -eq "csv") {
        $csvPath = "jira-bugs-$(Get-Date -Format 'yyyyMMdd-HHmmss').csv"
        $bugs | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8
        Write-Host ""
        Write-Host "Exported to: $csvPath" -ForegroundColor Green
    }
    
    if ($OutputFormat.ToLower() -eq "json") {
        $jsonPath = "jira-bugs-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
        $bugs | ConvertTo-Json -Depth 5 | Out-File -FilePath $jsonPath -Encoding UTF8
        Write-Host ""
        Write-Host "Exported to: $jsonPath" -ForegroundColor Green
    }
    
} catch {
    Write-Host "ERROR fetching bugs from Jira" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response:" -ForegroundColor Red
        Write-Host $responseBody -ForegroundColor Red
    }
    exit 1
}
