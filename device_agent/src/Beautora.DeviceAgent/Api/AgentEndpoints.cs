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

        // Does machine thumb hit SDK/C#? — live diagnostics from watch.mjs
        api.MapGet("/zkteco/watcher", (IHostEnvironment env, IOptions<DeviceAgentOptions> options) =>
        {
            var snap = SyncOps.DeviceAdapters.ZKTeco.Protocol.ZktecoWatcherDiagnostics.Snapshot();
            string? statusJson = null;
            string? logTail = null;
            try
            {
                var roots = new[]
                {
                    Path.Combine(env.ContentRootPath, "logs"),
                    Path.GetFullPath(Path.Combine(env.ContentRootPath, "..", "..", "logs")),
                    Path.GetFullPath(Path.Combine(env.ContentRootPath, "..", "..", "..", "logs")),
                };
                var logDir = roots.FirstOrDefault(Directory.Exists);
                if (logDir is not null)
                {
                    var statusPath = Path.Combine(logDir, "zk-watcher-status.json");
                    var logPath = Path.Combine(logDir, "zk-watcher.log");
                    if (File.Exists(statusPath))
                        statusJson = File.ReadAllText(statusPath);
                    if (File.Exists(logPath))
                    {
                        var lines = File.ReadAllLines(logPath);
                        logTail = string.Join("\n", lines.TakeLast(40));
                    }
                }
            }
            catch
            {
                /* ignore disk errors */
            }

            var lanIp = Beautora.DeviceAgent.Security.LanAddressHelper.GetPreferredLanIPv4() ?? "192.168.1.100";
            var port = options.Value.Port;

            return Results.Json(new
            {
                ok = true,
                host = options.Value.Zkteco.Host,
                port = options.Value.Zkteco.Port,
                flowTcp = "Machine → TCP SDK (watch.mjs) → C# — often silent on this model",
                flowCloud = $"Machine Cloud → http://{lanIp}:{port}/iclock → C# → website",
                cloudServerMustBe = new { address = lanIp, port, proxy = "OFF", mode = "ADMS", domainName = "OFF" },
                checklist = new[]
                {
                    $"1. Device Cloud Server Address = {lanIp} (NOT 192.166.x.x)",
                    $"2. Device Cloud Server Port = {port}",
                    "3. Enable Proxy Server = OFF",
                    "4. Server mode = ADMS, Domain Name = OFF",
                    "5. Save settings, then REBOOT the ZK device",
                    "6. Keep agent running (dotnet run). Press thumb.",
                    "7. This page must show cloudAdms.requestCount > 0",
                    "8. If still 0: run installer/open-firewall.ps1 as Administrator"
                },
                diagnostics = snap,
                statusFile = statusJson is null ? null : System.Text.Json.JsonSerializer.Deserialize<object>(statusJson),
                logTail,
                readThis =
                    "Ignore TCP punchCount=0 if Cloud is used. Check diagnostics.cloudAdms.connected — must become true after you save Cloud Server + reboot ZK."
            });
        });

        // Long-poll: browser waits here so Attendance UI updates the moment ADMS stores a punch.
        api.MapGet("/zkteco/wait", async (long? since, CancellationToken ct) =>
        {
            var sinceVersion = since ?? SyncOps.DeviceAdapters.ZKTeco.Protocol.ZktecoAttendancePunchStore.Version;
            var version = await SyncOps.DeviceAdapters.ZKTeco.Protocol.ZktecoAttendancePunchStore.WaitAsync(
                sinceVersion,
                TimeSpan.FromSeconds(25),
                ct);
            var latest = SyncOps.DeviceAdapters.ZKTeco.Protocol.ZktecoAttendancePunchStore.Get()
                .TakeLast(20)
                .Select(l => new
                {
                    userId = l.UserId,
                    timestamp = l.Timestamp,
                    inOutMode = l.InOutMode,
                    deviceId = l.DeviceId
                })
                .ToList();
            return Results.Json(new
            {
                ok = true,
                version,
                changed = version > sinceVersion,
                punches = latest
            });
        });

        api.MapGet("/zkteco/punches", (long? sinceMs) =>
        {
            var from = sinceMs is > 0
                ? DateTimeOffset.FromUnixTimeMilliseconds(sinceMs.Value)
                : (DateTimeOffset?)null;
            var punches = SyncOps.DeviceAdapters.ZKTeco.Protocol.ZktecoAttendancePunchStore.Get(from)
                .Select(l => new
                {
                    userId = l.UserId,
                    timestamp = l.Timestamp,
                    inOutMode = l.InOutMode,
                    deviceId = l.DeviceId
                })
                .ToList();
            return Results.Json(new
            {
                ok = true,
                version = SyncOps.DeviceAdapters.ZKTeco.Protocol.ZktecoAttendancePunchStore.Version,
                punches
            });
        });

        // Simulate device ATTLOG (proves C# → Beautora path without hardware cloud).
        api.MapPost("/zkteco/simulate-adms-punch", async (SimulateAdmsBody body, HttpRequest http, CancellationToken ct) =>
        {
            var userId = string.IsNullOrWhiteSpace(body.UserId) ? "1" : body.UserId.Trim();
            var at = body.At ?? DateTimeOffset.Now;
            var line = $"{userId}\t{at.ToLocalTime():yyyy-MM-dd HH:mm:ss}\t0\t1\t0\t0\t0";
            // Reuse parser + store via a minimal synthetic call
            SyncOps.DeviceAdapters.ZKTeco.Protocol.ZktecoAttendancePunchStore.Add(userId, at, 0, 1, "simulate");
            SyncOps.DeviceAdapters.ZKTeco.Protocol.ZktecoWatcherDiagnostics.NoteAdmsPunch(userId);
            SyncOps.DeviceAdapters.ZKTeco.Protocol.ZktecoWatcherDiagnostics.NoteAdmsRequest($"SIMULATE {line}");

            var services = http.HttpContext.RequestServices;
            var options = services.GetRequiredService<IOptions<DeviceAgentOptions>>().Value;
            var punchUrl = BeautoraCloudUrls.Api(options.Beautora.AppUrl, "/api/agent/thumb-punch");
            var pushed = false;
            try
            {
                var factory = services.GetRequiredService<IHttpClientFactory>();
                var client = factory.CreateClient("BeautoraAttendance");
                using var request = new HttpRequestMessage(HttpMethod.Post, punchUrl);
                request.Headers.TryAddWithoutValidation("X-Beautora-Agent-Key", options.ApiKey);
                request.Content = System.Net.Http.Json.JsonContent.Create(new
                {
                    thumbId = userId,
                    action = "toggle",
                    at = at.ToUniversalTime().ToString("O"),
                    externalKey = $"{userId}@{at.ToUnixTimeMilliseconds()}"
                });
                using var response = await client.SendAsync(request, ct);
                pushed = response.IsSuccessStatusCode;
            }
            catch
            {
                pushed = false;
            }

            return Results.Json(new
            {
                success = true,
                userId,
                at,
                storedLocally = true,
                pushedToBeautora = pushed,
                message = pushed
                    ? "Simulated ADMS punch stored + pushed to Beautora"
                    : "Simulated ADMS punch stored locally (Beautora push failed or AppUrl empty)"
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

    public sealed class SimulateAdmsBody
    {
        public string? UserId { get; set; }
        public DateTimeOffset? At { get; set; }
    }
}
