using System.Security.Cryptography;
using System.Text;
using Beautora.DeviceAgent.Configuration;
using Microsoft.Extensions.Options;

namespace Beautora.DeviceAgent.Security;

public static class LocalApiAuthentication
{
    public const string HeaderName = "X-Beautora-Agent-Key";

    public static bool IsAuthorized(HttpRequest request, DeviceAgentOptions options)
    {
        if (string.IsNullOrWhiteSpace(options.ApiKey))
            return false;

        if (!request.Headers.TryGetValue(HeaderName, out var provided) ||
            string.IsNullOrWhiteSpace(provided))
        {
            // Also accept Authorization: Bearer <key>
            var auth = request.Headers.Authorization.ToString();
            if (auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                provided = auth["Bearer ".Length..].Trim();
            else
                return false;
        }

        return FixedTimeEquals(provided.ToString(), options.ApiKey);
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

public sealed class AgentAuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly DeviceAgentOptions _options;
    private readonly ILogger<AgentAuthMiddleware> _logger;

    private static readonly PathString[] PublicPaths =
    [
        "/api/health",
        "/swagger",
        "/favicon.ico"
    ];

    public AgentAuthMiddleware(RequestDelegate next, IOptions<DeviceAgentOptions> options, ILogger<AgentAuthMiddleware> logger)
    {
        _next = next;
        _options = options.Value;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path;

        if (!LocalApiAuthentication.IsLoopback(context))
        {
            _logger.LogWarning("Rejected non-loopback request from {IP}", context.Connection.RemoteIpAddress);
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsJsonAsync(new { success = false, message = "Agent API is localhost-only." });
            return;
        }

        if (PublicPaths.Any(p => path.StartsWithSegments(p)))
        {
            await _next(context);
            return;
        }

        if (!path.StartsWithSegments("/api"))
        {
            await _next(context);
            return;
        }

        if (!LocalApiAuthentication.IsAuthorized(context.Request, _options))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { success = false, message = "Invalid or missing agent API key." });
            return;
        }

        await _next(context);
    }
}
