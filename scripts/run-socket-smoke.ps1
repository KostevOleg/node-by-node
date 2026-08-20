param(
  [string]$Email = "user-2@example.com",
  [string]$Password = "qwerty1234",
  [string]$ChatId = "",
  [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"

$loginBody = @{
  email = $Email
  password = $Password
} | ConvertTo-Json -Compress

$loginResponse = Invoke-RestMethod `
  -Method Post `
  -Uri "$BaseUrl/auth/sign-in" `
  -ContentType "application/json" `
  -Body $loginBody

$env:ACCESS_TOKEN = $loginResponse.accessToken

if (-not $env:ACCESS_TOKEN) {
  throw "Sign-in did not return accessToken."
}

if ($ChatId) {
  $env:CHAT_ID = $ChatId
} else {
  Remove-Item Env:CHAT_ID -ErrorAction SilentlyContinue
}

$env:SOCKET_URL = "$BaseUrl/chat"

Write-Host "Socket URL: $env:SOCKET_URL"
Write-Host "Email: $Email"
if ($env:CHAT_ID) {
  Write-Host "Chat ID: $env:CHAT_ID"
} else {
  Write-Host "Chat ID: <not set>"
}

node scripts/socket-smoke-test.cjs
