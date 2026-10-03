using Beautora.DeviceAgent.Services.Attendance;
using SyncOps.DeviceAdapters.ZKTeco;
using SyncOps.DeviceSDK.Core;
using SyncOps.DeviceSDK.Exceptions;
using SyncOps.DeviceSDK.Models;
using SdkDeviceManager = SyncOps.DeviceSDK.Core.IDeviceManager;

namespace Beautora.DeviceAgent.Api;

/// <summary>
/// Beautora attendance bridge endpoints — browser (/attendance) and local tools call these.
/// Hardware stays in SyncOps SDK; business records stay in Beautora.
/// </summary>
public static class BeautoraAttendanceEndpoints
{
    public static void MapBeautoraAttendanceEndpoints(this WebApplication app)
    {
        var api = app.MapGroup("/api/beautora/attendance");

        api.MapGet("/status", (IBeautoraAttendanceBridge bridge) =>
            Results.Json(bridge.GetStatus()));

        api.MapPost("/sync", async (IBeautoraAttendanceBridge bridge, CancellationToken ct) =>
        {
            var result = await bridge.SyncAsync(ct);
            return result.Success ? Results.Json(result) : Results.BadRequest(result);
        });

        api.MapPost("/punch", async (PunchBody body, IBeautoraAttendanceBridge bridge, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(body.ThumbId))
                return Results.BadRequest(new { success = false, message = "thumbId required" });

            var action = body.Action is "check_in" or "check_out" ? body.Action : "toggle";
            DateTimeOffset? at = null;
            if (!string.IsNullOrWhiteSpace(body.At) && DateTimeOffset.TryParse(body.At, out var parsed))
                at = parsed;

            var result = await bridge.PunchAsync(body.ThumbId, action!, at, body.ExternalKey, ct);
            return result.Success
                ? Results.Json(new
                {
                    success = true,
                    ok = true,
                    action = result.Action,
                    staffName = result.StaffName,
                    staffId = result.StaffId,
                    at = result.At,
                    deduped = result.Deduped
                })
                : Results.Json(new { success = false, error = result.Error }, statusCode: result.StatusCode is >= 400 and < 600 ? result.StatusCode : 400);
        });

        // Simulate a terminal thumb punch (mock ZKTeco only), then optionally push to Beautora.
        app.MapPost("/api/devices/{deviceId}/attendance/simulate-punch", async (
            string deviceId,
            SimulatePunchBody body,
            SdkDeviceManager manager,
            IBeautoraAttendanceBridge bridge,
            CancellationToken ct) =>
        {
            try
            {
                if (string.IsNullOrWhiteSpace(body.UserId) && string.IsNullOrWhiteSpace(body.ThumbId))
                    return Results.BadRequest(new { success = false, message = "userId (thumb id) required" });

                var userId = (body.UserId ?? body.ThumbId)!.Trim();
                await EnsureConnectedAsync(manager, deviceId, ct);

                if (!manager.TryGetConnectedDevice(deviceId, out var device) || device is not ZktecoDevice zk)
                {
                    // Connect path should have created it; try capability cast after connect.
                    var attendance = await manager.GetRequiredCapabilityAsync<IAttendanceDevice>(deviceId, ct);
                    if (attendance is not ZktecoDevice zk2)
                        return Results.BadRequest(new { success = false, message = "Device is not a ZKTeco attendance terminal" });
                    zk = zk2;
                }

                DateTimeOffset? at = null;
                if (!string.IsNullOrWhiteSpace(body.At) && DateTimeOffset.TryParse(body.At, out var parsed))
                    at = parsed;

                var log = await zk.SimulatePunchAsync(userId, body.InOutMode, at, ct);

                BeautoraPunchResult? punch = null;
                if (body.PushToBeautora)
                {
                    var action = body.InOutMode switch
                    {
                        0 => "check_in",
                        1 => "check_out",
                        _ => "toggle"
                    };
                    var externalKey = $"{userId}@{log.Timestamp.ToUnixTimeMilliseconds()}";
                    punch = await bridge.PunchAsync(userId, action, log.Timestamp, externalKey, ct);
                }

                return Results.Json(new
                {
                    success = true,
                    log,
                    beautora = punch is null
                        ? null
                        : new
                        {
                            success = punch.Success,
                            action = punch.Action,
                            staffName = punch.StaffName,
                            at = punch.At,
                            deduped = punch.Deduped,
                            error = punch.Error
                        }
                });
            }
            catch (DeviceException ex)
            {
                return Results.Json(new
                {
                    success = false,
                    message = ex.Message,
                    errorCode = ex.ErrorCode.ToString()
                }, statusCode: ex.ErrorCode == DeviceErrorCode.UnsupportedOperation
                    ? StatusCodes.Status501NotImplemented
                    : StatusCodes.Status400BadRequest);
            }
        });
    }

    private static async Task EnsureConnectedAsync(SdkDeviceManager manager, string deviceId, CancellationToken ct)
    {
        try
        {
            var status = await manager.GetStatusAsync(deviceId, ct);
            if (status.ConnectionState is DeviceConnectionState.Connected or DeviceConnectionState.Mock)
                return;
        }
        catch
        {
            // connect below
        }

        await manager.ConnectAsync(deviceId, null, ct);
    }

    public sealed class PunchBody
    {
        public string? ThumbId { get; set; }
        public string? Action { get; set; } = "toggle";
        public string? At { get; set; }
        public string? ExternalKey { get; set; }
    }

    public sealed class SimulatePunchBody
    {
        public string? UserId { get; set; }
        public string? ThumbId { get; set; }
        public int? InOutMode { get; set; }
        public string? At { get; set; }
        public bool PushToBeautora { get; set; } = true;
    }
}
