using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using Beautora.DeviceAgent.Configuration;
using Microsoft.Extensions.Options;
using SyncOps.DeviceAdapters.ZKTeco.Protocol;

namespace Beautora.DeviceAgent.Hosting;

/// <summary>
/// Spawns tools/zk-pull/watch.mjs against the configured ZK host.
/// Flow: Machine thumb → Node ZK SDK (TCP) → stdout JSON → C# buffer + Beautora API.
/// Status mirror: device_agent/logs/zk-watcher-status.json + zk-watcher.log
/// </summary>
public sealed class ZktecoRealtimeWatchHostedService : BackgroundService
{
    private readonly DeviceAgentOptions _options;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ZktecoRealtimeWatchHostedService> _logger;
    private readonly IHostEnvironment _env;

    public ZktecoRealtimeWatchHostedService(
        IOptions<DeviceAgentOptions> options,
        IHttpClientFactory httpClientFactory,
        ILogger<ZktecoRealtimeWatchHostedService> logger,
        IHostEnvironment env)
    {
        _options = options.Value;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _env = env;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Zkteco.Enabled || string.IsNullOrWhiteSpace(_options.Zkteco.Host))
            return;

        var candidates = new[]
        {
            Path.Combine(_env.ContentRootPath, "tools", "zk-pull", "watch.mjs"),
            Path.GetFullPath(Path.Combine(_env.ContentRootPath, "..", "..", "tools", "zk-pull", "watch.mjs")),
            Path.GetFullPath(Path.Combine(_env.ContentRootPath, "..", "..", "..", "tools", "zk-pull", "watch.mjs")),
        };
        var script = candidates.FirstOrDefault(File.Exists);
        if (script is null)
        {
            _logger.LogWarning("ZK realtime watcher skipped — watch.mjs not found");
            ZktecoWatcherDiagnostics.Set(false, "watch.mjs not found");
            return;
        }

        var workDir = Path.GetDirectoryName(script)!;
        _logger.LogInformation(
            "ZK realtime watcher starting → {Host}:{Port} ({Script})",
            _options.Zkteco.Host, _options.Zkteco.Port, script);
        ZktecoWatcherDiagnostics.Set(false, $"starting → {_options.Zkteco.Host}:{_options.Zkteco.Port}");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunOnceAsync(script, workDir, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "ZK realtime watcher crashed — retry in 10s");
                ZktecoWatcherDiagnostics.Set(false, $"crashed: {ex.Message}");
            }

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }

    private async Task RunOnceAsync(string script, string workDir, CancellationToken ct)
    {
        var psi = new ProcessStartInfo
        {
            FileName = "node",
            Arguments = $"\"{script}\" {_options.Zkteco.Host} {_options.Zkteco.Port} \"{(_options.Beautora.AppUrl ?? "http://127.0.0.1:3000").TrimEnd('/')}\"",
            WorkingDirectory = workDir,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };
        psi.Environment["SYNCOPS_AGENT_API_KEY"] = _options.ApiKey;
        psi.Environment["BEAUTORA_APP_URL"] = (_options.Beautora.AppUrl ?? "http://127.0.0.1:3000").TrimEnd('/');
        psi.Environment["SYNCOPS_AGENT_URL"] = $"http://127.0.0.1:{_options.Port}";

        using var proc = new Process { StartInfo = psi, EnableRaisingEvents = true };
        if (!proc.Start())
            throw new InvalidOperationException("Failed to start node watch.mjs");

        ZktecoWatcherDiagnostics.Set(true, "node watch.mjs process started");
        _logger.LogInformation("ZK watcher node PID={Pid}", proc.Id);

        var stdoutTask = ConsumeStdoutAsync(proc.StandardOutput, ct);
        var stderrTask = ConsumeStderrAsync(proc.StandardError, ct);

        await proc.WaitForExitAsync(ct);
        await Task.WhenAll(stdoutTask, stderrTask);
        ZktecoWatcherDiagnostics.Set(false, $"node exited code={proc.ExitCode}");
    }

    private async Task ConsumeStdoutAsync(StreamReader reader, CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(ct);
            if (line is null) break;
            if (string.IsNullOrWhiteSpace(line)) continue;

            try
            {
                using var doc = JsonDocument.Parse(line);
                var root = doc.RootElement;
                var type = root.TryGetProperty("type", out var t) ? t.GetString() : null;

                if (type == "attendance")
                {
                    var userId = root.GetProperty("userId").GetString()?.Trim();
                    if (string.IsNullOrWhiteSpace(userId)) continue;
                    var at = DateTimeOffset.UtcNow;
                    if (root.TryGetProperty("at", out var atEl) &&
                        DateTimeOffset.TryParse(atEl.GetString(), out var parsed))
                        at = parsed;

                    ZktecoAttendancePunchStore.Add(userId, at, null, 1, $"zkteco-{_options.Zkteco.Host}");
                    ZktecoWatcherDiagnostics.NotePunch(userId, at);
                    _logger.LogInformation("Realtime thumb HIT C# user={User} at={At}", userId, at);
                    await PushToBeautoraAsync(userId, at, ct);
                }
                else if (type == "heartbeat")
                {
                    var packets = root.TryGetProperty("packetCount", out var p) ? p.GetInt32() : 0;
                    var punches = root.TryGetProperty("punchCount", out var pu) ? pu.GetInt32() : 0;
                    var events = root.TryGetProperty("eventCount", out var ev) ? ev.GetInt32() : 0;
                    ZktecoWatcherDiagnostics.NoteHeartbeat(packets, events, punches);
                    _logger.LogInformation(
                        "ZK watcher heartbeat packets={Packets} events={Events} punches={Punches}",
                        packets, events, punches);
                }
                else if (type is "status" or "fatal" or "error" or "debug" or "log" or "push" or "push-error")
                {
                    if (type == "status" && root.TryGetProperty("message", out var msg))
                        ZktecoWatcherDiagnostics.Set(true, msg.GetString() ?? "ok");
                    _logger.LogInformation("ZK watcher [{Type}]: {Line}", type, line.Length > 400 ? line[..400] : line);
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Bad watcher line: {Line}", line);
            }
        }
    }

    private async Task ConsumeStderrAsync(StreamReader reader, CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(ct);
            if (line is null) break;
            if (!string.IsNullOrWhiteSpace(line))
                _logger.LogWarning("ZK watcher stderr: {Line}", line);
        }
    }

    private async Task PushToBeautoraAsync(string userId, DateTimeOffset at, CancellationToken ct)
    {
        var appUrl = (_options.Beautora.AppUrl ?? "").TrimEnd('/');
        if (string.IsNullOrWhiteSpace(appUrl))
        {
            _logger.LogWarning("Beautora AppUrl empty — punch stored locally only");
            return;
        }

        try
        {
            var client = _httpClientFactory.CreateClient("BeautoraAttendance");
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{appUrl}/api/agent/thumb-punch");
            request.Headers.TryAddWithoutValidation("X-Beautora-Agent-Key", _options.ApiKey);
            request.Content = JsonContent.Create(new
            {
                thumbId = userId,
                action = "toggle",
                at = at.ToUniversalTime().ToString("O"),
                externalKey = $"{userId}@{at.ToUnixTimeMilliseconds()}"
            });

            using var response = await client.SendAsync(request, ct);
            var body = await response.Content.ReadAsStringAsync(ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Beautora thumb-punch failed ({Status}): {Body}",
                    (int)response.StatusCode, body);
                return;
            }

            _logger.LogInformation("Beautora thumb-punch ok: {Body}", body);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Beautora thumb-punch POST failed for user={User}", userId);
        }
    }
}
