using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using Beautora.DeviceAgent.Configuration;
using Microsoft.Extensions.Options;

namespace Beautora.DeviceAgent.Security;

/// <summary>
/// Logs every inbound LAN request (especially from the ZK device) so we can see
/// if Cloud/ADMS traffic arrives — even on unexpected paths.
/// </summary>
public sealed class AdmsRequestProbeMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AdmsRequestProbeMiddleware> _logger;

    public AdmsRequestProbeMiddleware(RequestDelegate next, ILogger<AdmsRequestProbeMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var ip = context.Connection.RemoteIpAddress;
        var isLoopback = ip is not null && IPAddress.IsLoopback(ip);
        var path = context.Request.Path.Value ?? "";

        if (!isLoopback || path.StartsWith("/iclock", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogInformation(
                "INBOUND {Method} {Path}{Query} from {IP}",
                context.Request.Method,
                path,
                context.Request.QueryString.Value,
                ip);

            if (path.StartsWith("/iclock", StringComparison.OrdinalIgnoreCase) ||
                path.Contains("cdata", StringComparison.OrdinalIgnoreCase) ||
                path.Contains("iclock", StringComparison.OrdinalIgnoreCase))
            {
                SyncOps.DeviceAdapters.ZKTeco.Protocol.ZktecoWatcherDiagnostics.NoteAdmsRequest(
                    $"{context.Request.Method} {path}{context.Request.QueryString} from {ip}");
            }
        }

        await _next(context);
    }
}

public static class LanAddressHelper
{
    public static string? GetPreferredLanIPv4()
    {
        try
        {
            foreach (var ni in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (ni.OperationalStatus != OperationalStatus.Up) continue;
                if (ni.NetworkInterfaceType is NetworkInterfaceType.Loopback) continue;
                var props = ni.GetIPProperties();
                foreach (var addr in props.UnicastAddresses)
                {
                    if (addr.Address.AddressFamily != AddressFamily.InterNetwork) continue;
                    var s = addr.Address.ToString();
                    // Prefer 192.168.1.x (salon LAN with ZK)
                    if (s.StartsWith("192.168.1.", StringComparison.Ordinal))
                        return s;
                }
            }

            foreach (var ni in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (ni.OperationalStatus != OperationalStatus.Up) continue;
                if (ni.NetworkInterfaceType is NetworkInterfaceType.Loopback) continue;
                foreach (var addr in ni.GetIPProperties().UnicastAddresses)
                {
                    if (addr.Address.AddressFamily == AddressFamily.InterNetwork)
                        return addr.Address.ToString();
                }
            }
        }
        catch
        {
            /* ignore */
        }

        return null;
    }
}
