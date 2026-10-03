using SyncOps.DeviceSDK.Core;
using SyncOps.DeviceSDK.Exceptions;
using SyncOps.DeviceSDK.Models;
using SdkDeviceManager = SyncOps.DeviceSDK.Core.IDeviceManager;

namespace Beautora.DeviceAgent.Api;

/// <summary>
/// Generic SyncOps Device SDK HTTP surface.
/// Legacy Beautora routes remain in AgentEndpoints.
/// </summary>
public static class SyncOpsEndpoints
{
    public static void MapSyncOpsDeviceEndpoints(this WebApplication app)
    {
        var api = app.MapGroup("/api");

        api.MapGet("/devices/{deviceId}", async (string deviceId, SdkDeviceManager manager, CancellationToken ct) =>
        {
            var device = await manager.GetDeviceAsync(deviceId, ct);
            return device is null ? Results.NotFound(new { success = false, message = "Device not found" }) : Results.Json(device);
        });

        api.MapGet("/devices/{deviceId}/status", async (string deviceId, SdkDeviceManager manager, CancellationToken ct) =>
        {
            try
            {
                return Results.Json(await manager.GetStatusAsync(deviceId, ct));
            }
            catch (DeviceException ex)
            {
                return ToError(ex);
            }
        });

        api.MapGet("/devices/{deviceId}/capabilities", async (string deviceId, SdkDeviceManager manager, CancellationToken ct) =>
        {
            try
            {
                return Results.Json(await manager.GetCapabilitiesAsync(deviceId, ct));
            }
            catch (DeviceException ex)
            {
                return ToError(ex);
            }
        });

        api.MapPost("/devices/{deviceId}/connect", async (string deviceId, ConnectBody? body, SdkDeviceManager manager, CancellationToken ct) =>
        {
            try
            {
                DeviceConnection? conn = null;
                if (body is not null && (!string.IsNullOrWhiteSpace(body.Host) || body.Port is not null))
                {
                    conn = new DeviceConnection
                    {
                        ConnectionType = ConnectionType.Tcp,
                        Host = body.Host,
                        Port = body.Port,
                        TimeoutMs = body.TimeoutMs ?? 5000
                    };
                }

                await manager.ConnectAsync(deviceId, conn, ct);
                return Results.Json(new { success = true, message = "Connected" });
            }
            catch (DeviceException ex)
            {
                return ToError(ex);
            }
        });

        api.MapPost("/devices/{deviceId}/disconnect", async (string deviceId, SdkDeviceManager manager, CancellationToken ct) =>
        {
            try
            {
                await manager.DisconnectAsync(deviceId, ct);
                return Results.Json(new { success = true, message = "Disconnected" });
            }
            catch (DeviceException ex)
            {
                return ToError(ex);
            }
        });

        api.MapPost("/devices/discover", async (DiscoverBody? body, SdkDeviceManager manager, CancellationToken ct) =>
        {
            var request = new DiscoveryRequest
            {
                IncludeMocks = body?.IncludeMocks ?? true,
                IpRangeCidr = body?.IpRangeCidr,
                Port = body?.Port,
                MaxConcurrency = body?.MaxConcurrency ?? 16,
                TimeoutMs = body?.TimeoutMs ?? 1000,
                KnownEndpoints = (body?.KnownEndpoints ?? [])
                    .Select(e => new DeviceConnection
                    {
                        ConnectionType = ConnectionType.Tcp,
                        Host = e.Host,
                        Port = e.Port,
                        TimeoutMs = e.TimeoutMs ?? 1000
                    }).ToList()
            };

            var devices = await manager.DiscoverAsync(request, ct);
            return Results.Json(new { success = true, count = devices.Count, devices });
        });

        api.MapPost("/devices/{deviceId}/print", async (string deviceId, PrintBody body, SdkDeviceManager manager, CancellationToken ct) =>
        {
            try
            {
                var printer = await manager.GetRequiredCapabilityAsync<IPrintableDevice>(deviceId, ct);
                var contentType = ParsePrintType(body.ContentType);
                var result = await printer.PrintAsync(new PrintJob
                {
                    PrinterId = deviceId,
                    ContentType = contentType,
                    Content = body.Content ?? "",
                    Copies = body.Copies <= 0 ? 1 : body.Copies
                }, ct);
                return result.Success ? Results.Json(result) : Results.BadRequest(result);
            }
            catch (DeviceException ex)
            {
                return ToError(ex);
            }
        });

        api.MapPost("/devices/{deviceId}/cash-drawer/open", async (string deviceId, SdkDeviceManager manager, CancellationToken ct) =>
        {
            try
            {
                var drawer = await manager.GetRequiredCapabilityAsync<ICashDrawerDevice>(deviceId, ct);
                var result = await drawer.OpenDrawerAsync(ct);
                return result.Success ? Results.Json(result) : Results.BadRequest(result);
            }
            catch (DeviceException ex)
            {
                return ToError(ex);
            }
        });

        api.MapGet("/devices/{deviceId}/users", async (string deviceId, SdkDeviceManager manager, CancellationToken ct) =>
        {
            try
            {
                var dir = await manager.GetRequiredCapabilityAsync<IUserDirectoryDevice>(deviceId, ct);
                return Results.Json(await dir.GetUsersAsync(ct));
            }
            catch (DeviceException ex)
            {
                return ToError(ex);
            }
        });

        api.MapGet("/devices/{deviceId}/attendance", async (
            string deviceId,
            DateTimeOffset? from,
            DateTimeOffset? to,
            SdkDeviceManager manager,
            CancellationToken ct) =>
        {
            try
            {
                var attendance = await manager.GetRequiredCapabilityAsync<IAttendanceDevice>(deviceId, ct);
                return Results.Json(await attendance.GetAttendanceLogsAsync(from, to, ct));
            }
            catch (DeviceException ex)
            {
                return ToError(ex);
            }
        });

        api.MapGet("/devices/{deviceId}/time", async (string deviceId, SdkDeviceManager manager, CancellationToken ct) =>
        {
            try
            {
                var attendance = await manager.GetRequiredCapabilityAsync<IAttendanceDevice>(deviceId, ct);
                var time = await attendance.GetDeviceTimeAsync(ct);
                return Results.Json(new { success = true, deviceTime = time });
            }
            catch (DeviceException ex)
            {
                return ToError(ex);
            }
        });

        api.MapGet("/devices/{deviceId}/info", async (string deviceId, SdkDeviceManager manager, CancellationToken ct) =>
        {
            try
            {
                return Results.Json(await manager.GetDeviceInfoAsync(deviceId, ct));
            }
            catch (DeviceException ex)
            {
                return ToError(ex);
            }
        });
    }

    private static PrintContentType ParsePrintType(string? value)
    {
        var v = (value ?? "text").Trim().ToLowerInvariant();
        return v switch
        {
            "escpos" => PrintContentType.EscPos,
            "escpos-base64" or "escpos_base64" => PrintContentType.EscPosBase64,
            _ => PrintContentType.Text
        };
    }

    private static IResult ToError(DeviceException ex) =>
        Results.Json(new
        {
            success = false,
            message = ex.Message,
            errorCode = ex.ErrorCode.ToString(),
            deviceId = ex.DeviceId
        }, statusCode: ex.ErrorCode switch
        {
            DeviceErrorCode.DeviceNotFound => StatusCodes.Status404NotFound,
            DeviceErrorCode.UnsupportedOperation => StatusCodes.Status501NotImplemented,
            DeviceErrorCode.AuthenticationFailed or DeviceErrorCode.PermissionDenied => StatusCodes.Status403Forbidden,
            _ => StatusCodes.Status400BadRequest
        });

    public sealed class ConnectBody
    {
        public string? Host { get; set; }
        public int? Port { get; set; }
        public int? TimeoutMs { get; set; }
    }

    public sealed class DiscoverBody
    {
        public bool IncludeMocks { get; set; } = true;
        public string? IpRangeCidr { get; set; }
        public int? Port { get; set; }
        public int MaxConcurrency { get; set; } = 16;
        public int TimeoutMs { get; set; } = 1000;
        public List<KnownEndpointBody>? KnownEndpoints { get; set; }
    }

    public sealed class KnownEndpointBody
    {
        public string? Host { get; set; }
        public int? Port { get; set; }
        public int? TimeoutMs { get; set; }
    }

    public sealed class PrintBody
    {
        public string? ContentType { get; set; } = "text";
        public string? Content { get; set; }
        public int Copies { get; set; } = 1;
    }
}
