using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Beautora.DeviceAgent.Configuration;
using Microsoft.Extensions.Options;
using SyncOps.DeviceSDK.Core;
using SyncOps.DeviceSDK.Models;
using SdkDeviceManager = SyncOps.DeviceSDK.Core.IDeviceManager;

namespace Beautora.DeviceAgent.Services.Attendance;

public sealed class AttendanceBridgeStatus
{
    public bool Configured { get; init; }
    public bool SyncEnabled { get; init; }
    public string AppUrl { get; init; } = "";
    public string? ActiveDeviceId { get; init; }
    public DateTimeOffset? LastSyncUtc { get; init; }
    public DateTimeOffset? WatermarkUtc { get; init; }
    public int LastPushedCount { get; init; }
    public string? LastError { get; init; }
    public string? LastResult { get; init; }
}

public interface IBeautoraAttendanceBridge
{
    AttendanceBridgeStatus GetStatus();
    Task<AttendanceSyncResult> SyncAsync(CancellationToken cancellationToken = default);
    Task<BeautoraPunchResult> PunchAsync(
        string thumbId,
        string action = "toggle",
        DateTimeOffset? at = null,
        string? externalKey = null,
        CancellationToken cancellationToken = default);
}

public sealed class AttendanceSyncResult
{
    public bool Success { get; init; }
    public string Message { get; init; } = "";
    public string? DeviceId { get; init; }
    public int Fetched { get; init; }
    public int Pushed { get; init; }
    public int Deduped { get; init; }
    public int Failed { get; init; }
    public IReadOnlyList<object> Results { get; init; } = Array.Empty<object>();
}

public sealed class BeautoraPunchResult
{
    public bool Success { get; init; }
    public bool Deduped { get; init; }
    public string? Action { get; init; }
    public string? StaffName { get; init; }
    public string? StaffId { get; init; }
    public string? At { get; init; }
    public string? Error { get; init; }
    public int StatusCode { get; init; }
}

/// <summary>
/// Syncs ZKTeco attendance logs (and live thumb punches) into Beautora Next.js.
/// </summary>
public sealed class BeautoraAttendanceBridge : IBeautoraAttendanceBridge
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly SdkDeviceManager _manager;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly DeviceAgentOptions _options;
    private readonly ILogger<BeautoraAttendanceBridge> _logger;
    private readonly object _gate = new();
    private DateTimeOffset? _watermarkUtc;
    private DateTimeOffset? _lastSyncUtc;
    private int _lastPushed;
    private string? _lastError;
    private string? _lastResult;
    private string? _activeDeviceId;

    public BeautoraAttendanceBridge(
        SdkDeviceManager manager,
        IHttpClientFactory httpClientFactory,
        IOptions<DeviceAgentOptions> options,
        ILogger<BeautoraAttendanceBridge> logger)
    {
        _manager = manager;
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    public AttendanceBridgeStatus GetStatus()
    {
        var bridge = _options.Beautora;
        return new AttendanceBridgeStatus
        {
            Configured = IsConfigured(),
            SyncEnabled = bridge.AttendanceSyncEnabled && IsConfigured(),
            AppUrl = (bridge.AppUrl ?? "").TrimEnd('/'),
            ActiveDeviceId = _activeDeviceId,
            LastSyncUtc = _lastSyncUtc,
            WatermarkUtc = _watermarkUtc,
            LastPushedCount = _lastPushed,
            LastError = _lastError,
            LastResult = _lastResult
        };
    }

    public async Task<AttendanceSyncResult> SyncAsync(CancellationToken cancellationToken = default)
    {
        if (!IsConfigured())
        {
            return Fail("Beautora attendance bridge not configured. Set DeviceAgent:Beautora:AppUrl and AttendanceApiKey.");
        }

        string deviceId;
        try
        {
            deviceId = await ResolveAttendanceDeviceIdAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            SetError(ex.Message);
            return Fail(ex.Message);
        }

        _activeDeviceId = deviceId;

        try
        {
            var connected = await EnsureConnectedAsync(deviceId, cancellationToken);
            if (!connected)
            {
                return Fail($"Could not connect to attendance device {deviceId}");
            }

            var attendance = await _manager.GetRequiredCapabilityAsync<IAttendanceDevice>(deviceId, cancellationToken);
            var lookback = DateTimeOffset.UtcNow.AddHours(-Math.Max(1, _options.Beautora.AttendanceLookbackHours));
            var from = _watermarkUtc is null ? lookback : _watermarkUtc.Value.AddSeconds(-1);
            var logs = (await attendance.GetAttendanceLogsAsync(from, null, cancellationToken))
                .OrderBy(l => l.Timestamp)
                .ToList();

            var pushed = 0;
            var deduped = 0;
            var failed = 0;
            var results = new List<object>();
            DateTimeOffset? maxTs = _watermarkUtc;

            foreach (var log in logs)
            {
                if (_watermarkUtc is not null && log.Timestamp <= _watermarkUtc)
                    continue;

                var thumbId = log.UserId?.Trim();
                if (string.IsNullOrWhiteSpace(thumbId))
                    continue;

                var externalKey = $"{thumbId}@{log.Timestamp.ToUnixTimeMilliseconds()}";
                var action = ResolveAction(log.InOutMode);
                var punch = await PunchAsync(thumbId, action, log.Timestamp, externalKey, cancellationToken);

                if (punch.Success)
                {
                    if (punch.Deduped) deduped++;
                    else pushed++;
                    results.Add(new
                    {
                        thumbId,
                        action = punch.Action,
                        staffName = punch.StaffName,
                        at = punch.At,
                        deduped = punch.Deduped
                    });
                    if (maxTs is null || log.Timestamp > maxTs)
                        maxTs = log.Timestamp;
                }
                else if (string.Equals(punch.Error, "Already checked in", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(punch.Error, "No open check-in", StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(punch.Error, "Thumb not enrolled", StringComparison.OrdinalIgnoreCase))
                {
                    // Advance watermark past known/handled device events so we do not spin forever.
                    failed++;
                    results.Add(new { thumbId, error = punch.Error, at = log.Timestamp });
                    if (maxTs is null || log.Timestamp > maxTs)
                        maxTs = log.Timestamp;
                }
                else
                {
                    failed++;
                    results.Add(new { thumbId, error = punch.Error, at = log.Timestamp });
                    break; // stop on transport / auth failures
                }
            }

            if (maxTs is not null)
                _watermarkUtc = maxTs;

            _lastSyncUtc = DateTimeOffset.UtcNow;
            _lastPushed = pushed;
            _lastError = failed > 0 ? $"{failed} punch(es) failed" : null;
            _lastResult = $"fetched={logs.Count} pushed={pushed} deduped={deduped} failed={failed}";

            _logger.LogInformation(
                "Beautora attendance sync device={DeviceId} fetched={Fetched} pushed={Pushed} deduped={Deduped} failed={Failed}",
                deviceId, logs.Count, pushed, deduped, failed);

            return new AttendanceSyncResult
            {
                Success = failed == 0,
                Message = _lastResult,
                DeviceId = deviceId,
                Fetched = logs.Count,
                Pushed = pushed,
                Deduped = deduped,
                Failed = failed,
                Results = results
            };
        }
        catch (Exception ex)
        {
            SetError(ex.Message);
            _logger.LogError(ex, "Beautora attendance sync failed");
            return Fail(ex.Message, deviceId);
        }
    }

    public async Task<BeautoraPunchResult> PunchAsync(
        string thumbId,
        string action = "toggle",
        DateTimeOffset? at = null,
        string? externalKey = null,
        CancellationToken cancellationToken = default)
    {
        if (!IsConfigured())
        {
            return new BeautoraPunchResult
            {
                Success = false,
                Error = "Beautora attendance bridge not configured",
                StatusCode = 503
            };
        }

        var id = (thumbId ?? "").Trim();
        if (string.IsNullOrWhiteSpace(id))
        {
            return new BeautoraPunchResult
            {
                Success = false,
                Error = "thumbId required",
                StatusCode = 400
            };
        }

        var resolvedAction = action is "check_in" or "check_out" ? action : "toggle";
        var appUrl = _options.Beautora.AppUrl.TrimEnd('/');
        var client = _httpClientFactory.CreateClient("BeautoraAttendance");

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{appUrl}/api/devices/attendance");
        request.Headers.TryAddWithoutValidation("X-Device-Key", _options.Beautora.AttendanceApiKey);
        request.Content = JsonContent.Create(new
        {
            thumbId = id,
            action = resolvedAction,
            at = at?.ToUniversalTime().ToString("O"),
            externalKey
        }, options: JsonOpts);

        try
        {
            using var response = await client.SendAsync(request, cancellationToken);
            var body = await response.Content.ReadFromJsonAsync<BeautoraAttendanceResponse>(JsonOpts, cancellationToken)
                       ?? new BeautoraAttendanceResponse();

            if (!response.IsSuccessStatusCode)
            {
                return new BeautoraPunchResult
                {
                    Success = false,
                    Error = body.Error ?? $"Beautora returned {(int)response.StatusCode}",
                    StatusCode = (int)response.StatusCode
                };
            }

            return new BeautoraPunchResult
            {
                Success = body.Ok || string.IsNullOrEmpty(body.Error),
                Deduped = body.Deduped,
                Action = body.Action,
                StaffName = body.StaffName,
                StaffId = body.StaffId,
                At = body.At,
                StatusCode = (int)response.StatusCode
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Beautora punch failed for thumbId={ThumbId}", id);
            return new BeautoraPunchResult
            {
                Success = false,
                Error = ex.Message,
                StatusCode = 502
            };
        }
    }

    private bool IsConfigured() =>
        !string.IsNullOrWhiteSpace(_options.Beautora.AppUrl) &&
        !string.IsNullOrWhiteSpace(_options.Beautora.AttendanceApiKey);

    private static string ResolveAction(int? inOutMode) =>
        inOutMode switch
        {
            0 => "check_in",
            1 => "check_out",
            _ => "toggle"
        };

    private async Task<string> ResolveAttendanceDeviceIdAsync(CancellationToken cancellationToken)
    {
        var configured = _options.Beautora.AttendanceDeviceId?.Trim();
        if (!string.IsNullOrWhiteSpace(configured))
            return configured;

        var discovered = await _manager.DiscoverAsync(new DiscoveryRequest
        {
            IncludeMocks = _options.MockMode,
            KnownEndpoints = string.IsNullOrWhiteSpace(_options.Zkteco.Host)
                ? Array.Empty<DeviceConnection>()
                :
                [
                    new DeviceConnection
                    {
                        ConnectionType = ConnectionType.Tcp,
                        Host = _options.Zkteco.Host,
                        Port = _options.Zkteco.Port,
                        TimeoutMs = _options.Zkteco.TimeoutMs
                    }
                ]
        }, cancellationToken);

        var terminal = discovered.FirstOrDefault(d =>
            d.Type == DeviceType.AttendanceTerminal ||
            d.Capabilities.Any(c => c.Kind == DeviceCapabilityKind.Attendance));

        if (terminal is null)
            throw new InvalidOperationException(
                "No attendance terminal discovered. Enable DeviceAgent:Zkteco or set Beautora:AttendanceDeviceId.");

        return terminal.Id;
    }

    private async Task<bool> EnsureConnectedAsync(string deviceId, CancellationToken cancellationToken)
    {
        try
        {
            var status = await _manager.GetStatusAsync(deviceId, cancellationToken);
            if (status.ConnectionState is DeviceConnectionState.Connected or DeviceConnectionState.Mock)
                return true;
        }
        catch
        {
            // Fall through to connect.
        }

        try
        {
            await _manager.ConnectAsync(deviceId, null, cancellationToken);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Connect failed for {DeviceId}", deviceId);
            return false;
        }
    }

    private AttendanceSyncResult Fail(string message, string? deviceId = null)
    {
        SetError(message);
        return new AttendanceSyncResult
        {
            Success = false,
            Message = message,
            DeviceId = deviceId ?? _activeDeviceId
        };
    }

    private void SetError(string message)
    {
        lock (_gate)
        {
            _lastError = message;
            _lastSyncUtc = DateTimeOffset.UtcNow;
        }
    }

    private sealed class BeautoraAttendanceResponse
    {
        public bool Ok { get; set; }
        public bool Deduped { get; set; }
        public string? Action { get; set; }
        public string? StaffName { get; set; }
        public string? StaffId { get; set; }
        public string? At { get; set; }
        public string? Error { get; set; }
    }
}
