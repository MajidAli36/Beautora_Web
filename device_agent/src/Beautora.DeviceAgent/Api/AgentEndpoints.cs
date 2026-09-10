using System.Reflection;
using Beautora.DeviceAgent.Configuration;
using Beautora.DeviceAgent.Devices.DeviceManager;
using Beautora.DeviceAgent.Models.Common;
using Beautora.DeviceAgent.Models.Drawer;
using Beautora.DeviceAgent.Models.Fingerprint;
using Beautora.DeviceAgent.Models.Printer;
using Beautora.DeviceAgent.Services.Drawer;
using Beautora.DeviceAgent.Services.Fingerprint;
using Beautora.DeviceAgent.Services.Printer;
using Microsoft.Extensions.Options;

namespace Beautora.DeviceAgent.Api;

public static class AgentEndpoints
{
    public static void MapAgentEndpoints(this WebApplication app)
    {
        var api = app.MapGroup("/api");

        api.MapGet("/health", (IOptions<DeviceAgentOptions> options) =>
        {
            var version = Assembly.GetExecutingAssembly().GetName().Version?.ToString(3) ?? "1.0.0";
            return Results.Json(new
            {
                status = "ok",
                agentVersion = version,
                mockMode = options.Value.MockMode,
                timestamp = DateTimeOffset.UtcNow
            });
        });

        api.MapGet("/devices", async (IDeviceManager devices, IOptions<DeviceAgentOptions> options, CancellationToken ct) =>
        {
            var version = Assembly.GetExecutingAssembly().GetName().Version?.ToString(3) ?? "1.0.0";
            var list = await devices.GetAllDevicesAsync(ct);
            return Results.Json(new DevicesResponse
            {
                Agent = new AgentInfo
                {
                    Version = version,
                    Status = "online",
                    MockMode = options.Value.MockMode
                },
                Devices = list.ToList()
            });
        });

        api.MapPost("/devices/refresh", async (IDeviceManager devices, CancellationToken ct) =>
        {
            await devices.RefreshAsync(ct);
            return Results.Json(ApiResult.Ok("Device list refreshed"));
        });

        // Printer
        api.MapGet("/printer/list", async (IPrinterService printers, CancellationToken ct) =>
            Results.Json(await printers.GetPrintersAsync(ct)));

        api.MapGet("/printer/{printerId}/status", async (string printerId, IPrinterService printers, CancellationToken ct) =>
            Results.Json(await printers.GetStatusAsync(printerId, ct)));

        api.MapPost("/printer/print", async (PrintRequest request, IPrinterService printers, CancellationToken ct) =>
        {
            var result = await printers.PrintAsync(request, ct);
            return result.Success ? Results.Json(result) : Results.BadRequest(result);
        });

        api.MapPost("/printer/{printerId}/test", async (string printerId, IPrinterService printers, CancellationToken ct) =>
        {
            var ok = await printers.TestPrintAsync(printerId, ct);
            return ok
                ? Results.Json(ApiResult.Ok("Test print sent"))
                : Results.BadRequest(ApiResult.Fail("Test print failed"));
        });

        // Drawer — separate from print (no auto-open)
        api.MapGet("/drawer/list", async (IDrawerService drawers, CancellationToken ct) =>
            Results.Json(await drawers.GetDrawersAsync(ct)));

        api.MapGet("/drawer/{drawerId}/status", async (string drawerId, IDrawerService drawers, CancellationToken ct) =>
            Results.Json(await drawers.GetStatusAsync(drawerId, ct)));

        api.MapPost("/drawer/{drawerId}/open", async (string drawerId, IDrawerService drawers, CancellationToken ct) =>
        {
            var result = await drawers.OpenAsync(drawerId, ct);
            return result.Success ? Results.Json(result) : Results.BadRequest(result);
        });

        // Fingerprint
        api.MapGet("/fingerprint/list", async (IFingerprintService fp, CancellationToken ct) =>
            Results.Json(await fp.GetDevicesAsync(ct)));

        api.MapPost("/fingerprint/{deviceId}/scan", async (string deviceId, IFingerprintService fp, CancellationToken ct) =>
        {
            var result = await fp.ScanAsync(deviceId, ct);
            // Never return raw template in production logs; response may include mock template for dev.
            return result.Success ? Results.Json(result) : Results.BadRequest(result);
        });

        api.MapPost("/fingerprint/{deviceId}/verify", async (string deviceId, VerifyBody body, IFingerprintService fp, CancellationToken ct) =>
        {
            byte[] template;
            try
            {
                template = Convert.FromBase64String(body.TemplateBase64 ?? "");
            }
            catch
            {
                return Results.BadRequest(new FingerprintVerificationResult
                {
                    Success = false,
                    Matched = false,
                    Message = "Invalid templateBase64"
                });
            }

            var result = await fp.VerifyAsync(deviceId, template, ct);
            return result.Success ? Results.Json(result) : Results.BadRequest(result);
        });
    }

    public sealed class VerifyBody
    {
        public string? TemplateBase64 { get; set; }
    }
}
