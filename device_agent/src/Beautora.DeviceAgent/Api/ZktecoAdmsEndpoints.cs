using System.Globalization;
using System.Net.Http.Json;
using System.Text;
using Beautora.DeviceAgent.Services.Attendance;
using SyncOps.DeviceAdapters.ZKTeco.Protocol;

namespace Beautora.DeviceAgent.Api;

/// <summary>
/// ZKTeco ADMS / iClock push endpoints.
/// Configure the terminal Cloud Server to: http://&lt;this-pc-lan-ip&gt;:17890
/// When staff press thumb, the device POSTs ATTLOG rows here → punch buffer → Beautora.
/// </summary>
public static class ZktecoAdmsEndpoints
{
    public static void MapZktecoAdmsEndpoints(this WebApplication app)
    {
        // Discovery / handshake — device polls these without an API key.
        app.MapMethods("/iclock/cdata", ["GET", "POST"], HandleCdataAsync);
        app.MapMethods("/iclock/getrequest", ["GET", "POST"], HandleGetRequest);
        app.MapMethods("/iclock/devicecmd", ["GET", "POST"], HandleGetRequest);
        app.MapMethods("/iclock.aspx", ["GET", "POST"], HandleCdataAsync);
        app.MapGet("/iclock/ping", () =>
        {
            ZktecoWatcherDiagnostics.NoteAdmsRequest("GET /iclock/ping");
            return Results.Text("OK");
        });
        app.MapPost("/iclock/attendance", HandleJsonAttendanceAsync);

        // Catch-all for odd firmware paths under /iclock/*
        app.MapMethods("/iclock/{**rest}", ["GET", "POST"], async (string rest, HttpRequest request, IBeautoraAttendanceBridge bridge, ILoggerFactory loggerFactory, CancellationToken ct) =>
        {
            var log = loggerFactory.CreateLogger("ZktecoAdms");
            log.LogInformation("ADMS catch-all /iclock/{Rest} {Method}", rest, request.Method);
            ZktecoWatcherDiagnostics.NoteAdmsRequest($"{request.Method} /iclock/{rest}{request.QueryString}");
            if (HttpMethods.IsGet(request.Method))
                return HandleGetRequest(request);
            return await HandleCdataAsync(request, bridge, loggerFactory, ct);
        });
    }

    private static IResult HandleGetRequest(HttpRequest request)
    {
        ZktecoWatcherDiagnostics.NoteAdmsRequest($"GET /iclock/getrequest {request.QueryString.Value}");
        // Keep device happy — empty OK means "no remote commands".
        return Results.Text("OK");
    }

    private static async Task<IResult> HandleCdataAsync(
        HttpRequest request,
        IBeautoraAttendanceBridge bridge,
        ILoggerFactory loggerFactory,
        CancellationToken ct)
    {
        var log = loggerFactory.CreateLogger("ZktecoAdms");
        var sn = request.Query["SN"].ToString();
        var table = request.Query["table"].ToString();
        if (string.IsNullOrWhiteSpace(table))
            table = request.Query["Table"].ToString();

        ZktecoWatcherDiagnostics.NoteAdmsRequest($"{request.Method} /iclock/cdata sn={sn} table={table}");
        log.LogInformation("ADMS {Method} /iclock/cdata sn={Sn} table={Table} qs={Query}",
            request.Method, sn, table, request.QueryString.Value);

        if (HttpMethods.IsGet(request.Method))
        {
            // Realtime ADMS: device should POST ATTLOG immediately after each thumb.
            // Keep Delay/ErrorDelay low so uploads are not batched for minutes.
            return Results.Text("GET OPTION FROM: " + (sn.Length > 0 ? sn : "SyncOps") + "\n" +
                                "ATTLOGStamp=None\n" +
                                "OPERLOGStamp=None\n" +
                                "ATTPHOTOStamp=None\n" +
                                "ErrorDelay=5\n" +
                                "Delay=0\n" +
                                "TransTimes=00:00;23:59\n" +
                                "TransInterval=1\n" +
                                "TransFlag=1111000000\n" +
                                "TimeZone=5\n" +
                                "Realtime=1\n" +
                                "Encrypt=0\n");
        }

        string body;
        using (var reader = new StreamReader(request.Body, Encoding.UTF8))
            body = await reader.ReadToEndAsync(ct);

        log.LogInformation("ADMS POST bodyLen={Len} preview={Preview}",
            body?.Length ?? 0, (body ?? "").Length > 200 ? body![..200] : body);

        if (string.IsNullOrWhiteSpace(body))
            return Results.Text("OK");

        var pendingPush = new List<(string UserId, DateTimeOffset At, string ExternalKey)>();
        // ATTLOG lines, or raw stamp pushes.
        if (table.Equals("ATTLOG", StringComparison.OrdinalIgnoreCase) ||
            body.Contains('\t') ||
            request.Query.ContainsKey("Stamp"))
        {
            foreach (var rawLine in body.Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries))
            {
                var line = rawLine.Trim();
                if (line.Length == 0 || line.StartsWith("GET OPTION", StringComparison.OrdinalIgnoreCase))
                    continue;

                if (!TryParseAttLogLine(line, out var userId, out var at, out var inOut))
                {
                    log.LogDebug("ADMS skip unparsed line: {Line}", line);
                    continue;
                }

                // Buffer first so UI long-poll wakes immediately; ACK device without waiting on web API.
                ZktecoAttendancePunchStore.Add(userId, at, inOut, 1, string.IsNullOrWhiteSpace(sn) ? null : sn);
                ZktecoWatcherDiagnostics.NoteAdmsPunch(userId);
                pendingPush.Add((userId, at, $"{userId}@{at.ToUnixTimeMilliseconds()}"));
            }
        }

        if (pendingPush.Count > 0)
        {
            var scopeFactory = request.HttpContext.RequestServices.GetRequiredService<IServiceScopeFactory>();
            var snapshot = pendingPush.ToArray();
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = scopeFactory.CreateScope();
                    var sp = scope.ServiceProvider;
                    var bgBridge = sp.GetRequiredService<IBeautoraAttendanceBridge>();
                    var bgLog = sp.GetRequiredService<ILoggerFactory>().CreateLogger("ZktecoAdms");
                    foreach (var (userId, at, externalKey) in snapshot)
                    {
                        try
                        {
                            var pushedOk = await PushAgentThumbPunchAsync(sp, userId, at, externalKey, CancellationToken.None);
                            if (pushedOk)
                            {
                                bgLog.LogInformation("ADMS→Beautora ok user={User} at={At}", userId, at);
                                continue;
                            }

                            var punch = await bgBridge.PunchAsync(userId, "toggle", at, externalKey, CancellationToken.None);
                            bgLog.LogInformation(
                                "ADMS punch user={User} at={At} ok={Ok} action={Action} err={Err}",
                                userId, at, punch.Success, punch.Action, punch.Error);
                        }
                        catch (Exception ex)
                        {
                            bgLog.LogWarning(ex, "ADMS background punch failed for {User}", userId);
                        }
                    }
                }
                catch (Exception ex)
                {
                    log.LogWarning(ex, "ADMS background push loop failed");
                }
            });
        }

        // ACK device immediately — do not block on Next.js / Supabase latency.
        return Results.Text(pendingPush.Count > 0 ? $"OK: {pendingPush.Count}" : "OK");
    }

    private static async Task<IResult> HandleJsonAttendanceAsync(
        HttpRequest request,
        IBeautoraAttendanceBridge bridge,
        CancellationToken ct)
    {
        using var doc = await System.Text.Json.JsonDocument.ParseAsync(request.Body, cancellationToken: ct);
        var root = doc.RootElement;
        var userId = root.TryGetProperty("userId", out var u) ? u.GetString()
            : root.TryGetProperty("thumbId", out var t) ? t.GetString() : null;
        if (string.IsNullOrWhiteSpace(userId))
            return Results.BadRequest(new { success = false, message = "userId required" });

        DateTimeOffset at = DateTimeOffset.UtcNow;
        if (root.TryGetProperty("at", out var atEl) && atEl.ValueKind == System.Text.Json.JsonValueKind.String &&
            DateTimeOffset.TryParse(atEl.GetString(), out var parsed))
            at = parsed;

        ZktecoAttendancePunchStore.Add(userId, at, null, 1, "json");
        var externalKey = $"{userId}@{at.ToUnixTimeMilliseconds()}";
        var scopeFactory = request.HttpContext.RequestServices.GetRequiredService<IServiceScopeFactory>();
        _ = Task.Run(async () =>
        {
            using var scope = scopeFactory.CreateScope();
            var sp = scope.ServiceProvider;
            var pushedOk = await PushAgentThumbPunchAsync(sp, userId, at, externalKey, CancellationToken.None);
            if (pushedOk) return;
            var bgBridge = sp.GetRequiredService<IBeautoraAttendanceBridge>();
            await bgBridge.PunchAsync(userId, "toggle", at, externalKey, CancellationToken.None);
        });
        return Results.Json(new { success = true, action = "toggle", queued = true });
    }

    private static async Task<bool> PushAgentThumbPunchAsync(
        IServiceProvider services,
        string userId,
        DateTimeOffset at,
        string externalKey,
        CancellationToken ct)
    {
        try
        {
            var options = services.GetRequiredService<Microsoft.Extensions.Options.IOptions<Beautora.DeviceAgent.Configuration.DeviceAgentOptions>>().Value;
            var punchUrl = Beautora.DeviceAgent.Configuration.BeautoraCloudUrls.Api(
                options.Beautora.AppUrl,
                "/api/agent/thumb-punch");

            var factory = services.GetRequiredService<IHttpClientFactory>();
            var client = factory.CreateClient("BeautoraAttendance");
            using var request = new HttpRequestMessage(HttpMethod.Post, punchUrl);
            request.Headers.TryAddWithoutValidation("X-Beautora-Agent-Key", options.ApiKey);
            request.Content = JsonContent.Create(new
            {
                thumbId = userId,
                action = "toggle",
                at = at.ToUniversalTime().ToString("O"),
                externalKey
            });
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
            timeout.CancelAfter(TimeSpan.FromSeconds(8));
            using var response = await client.SendAsync(request, timeout.Token);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    internal static bool TryParseAttLogLine(string line, out string userId, out DateTimeOffset at, out int? inOut)
    {
        userId = "";
        at = DateTimeOffset.UtcNow;
        inOut = null;

        var parts = line.Split('\t');
        if (parts.Length < 2)
            parts = line.Split([',', ' '], StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length < 2) return false;

        userId = parts[0].Trim();
        if (string.IsNullOrWhiteSpace(userId)) return false;

        // Common: 2024-01-15 08:30:00
        var timeRaw = parts[1].Trim();
        if (!DateTime.TryParse(timeRaw, CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out var local))
        {
            // Sometimes timestamp is unix seconds
            if (long.TryParse(timeRaw, out var unix) && unix > 1_000_000_000)
                at = DateTimeOffset.FromUnixTimeSeconds(unix);
            else
                return false;
        }
        else
        {
            at = new DateTimeOffset(local);
        }

        if (parts.Length >= 3 && int.TryParse(parts[2].Trim(), out var mode))
            inOut = mode is 0 or 1 ? mode : null;

        return true;
    }
}
