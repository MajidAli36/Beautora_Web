using System.Security.Cryptography;
using System.Text;
using Beautora.DeviceAgent.Configuration;
using Microsoft.Extensions.Options;

namespace Beautora.DeviceAgent.Security;

public static class LocalApiAuthentication
{
    public const string HeaderName = "X-Beautora-Agent-Key";
    public const string SyncOpsHeaderName = "X-SyncOps-Agent-Key";

    public static bool IsAuthorized(HttpRequest request, DeviceAgentOptions options)
    {
        // Open mode: no API key required.
        if (options.DisableSecurity)
            return true;

        if (string.IsNullOrWhiteSpace(options.ApiKey))
            return false;

        string? provided = null;

        if (request.Headers.TryGetValue(HeaderName, out var beautora) && !string.IsNullOrWhiteSpace(beautora))
            provided = beautora.ToString();
        else if (request.Headers.TryGetValue(SyncOpsHeaderName, out var syncops) && !string.IsNullOrWhiteSpace(syncops))
            provided = syncops.ToString();
        else
        {
            var auth = request.Headers.Authorization.ToString();
            if (auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                provided = auth["Bearer ".Length..].Trim();
        }

        if (string.IsNullOrWhiteSpace(provided))
            return false;

        return FixedTimeEquals(provided, options.ApiKey);
    }

    private static bool FixedTimeEquals(string a, string b)
    {
        var ba = Encoding.UTF8.GetBytes(a);
        var bb = Encoding.UTF8.GetBytes(b);
        if (ba.Length != bb.Length) return false;
        return CryptographicOperations.FixedTimeEquals(ba, bb);
    }

    public static bool IsLoopback(HttpContext context)
    {
        var ip = context.Connection.RemoteIpAddress;
        return ip is not null && (System.Net.IPAddress.IsLoopback(ip) || ip.Equals(System.Net.IPAddress.IPv6Loopback));
    }
}

/// <summary>
/// When DeviceAgent:DisableSecurity=true (current default for ZK bring-up),
/// every request from LAN/localhost is allowed — no API key, no loopback lock.
/// </summary>
public sealed class AgentAuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly DeviceAgentOptions _options;
    private readonly ILogger<AgentAuthMiddleware> _logger;

    public AgentAuthMiddleware(RequestDelegate next, IOptions<DeviceAgentOptions> options, ILogger<AgentAuthMiddleware> logger)
    {
        _next = next;
        _options = options.Value;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // DEV / ZK bring-up: fully open — device on LAN must reach /iclock + APIs.
        if (_options.DisableSecurity)
        {
            await _next(context);
            return;
        }

        var path = context.Request.Path;
        var isAdms = path.StartsWithSegments("/iclock");

        if (!LocalApiAuthentication.IsLoopback(context) && !isAdms)
        {
            _logger.LogWarning("Rejected non-loopback request from {IP}", context.Connection.RemoteIpAddress);
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new { success = false, message = "Agent API is localhost-only." });
            return;
        }

        if (path.StartsWithSegments("/api/health") ||
            path.StartsWithSegments("/api/zkteco/watcher") ||
            path.StartsWithSegments("/iclock") ||
            path.StartsWithSegments("/swagger") ||
            path.StartsWithSegments("/favicon.ico") ||
            HttpMethods.IsOptions(context.Request.Method) ||
            !path.StartsWithSegments("/api"))
        {
            await _next(context);
            return;
        }

        if (!LocalApiAuthentication.IsAuthorized(context.Request, _options))
        {
            _logger.LogWarning("Authentication failure for {Path}", path);
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { success = false, message = "Invalid or missing agent API key." });
            return;
        }

        await _next(context);
    }
}
