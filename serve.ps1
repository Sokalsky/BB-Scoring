$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://+:$port/")
$listener.Start()
$localIP = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -notlike '169.*' } |
    Select-Object -First 1).IPAddress
[Console]::Out.WriteLine("Serving Bugger Bridge at http://localhost:$port/")
[Console]::Out.WriteLine("On your local network: http://${localIP}:$port/")
[Console]::Out.Flush()

$dir = Split-Path -Parent $MyInvocation.MyCommand.Path

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $url = $context.Request.Url.LocalPath.TrimStart('/')
        if ($url -eq '' -or $url -eq 'index.html') { $url = 'bugger-bridge.html' }
        $filePath = Join-Path $dir $url
        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = switch ($ext) {
                '.html' { 'text/html; charset=utf-8' }
                '.js'   { 'application/javascript' }
                '.css'  { 'text/css' }
                default { 'application/octet-stream' }
            }
            $context.Response.ContentType = $mime
            $context.Response.ContentLength64 = $bytes.Length
            $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $context.Response.StatusCode = 404
        }
        $context.Response.OutputStream.Close()
    } catch { }
}
