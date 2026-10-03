using Beautora.DeviceAgent.Configuration;
using Beautora.DeviceAgent.Services.Attendance;
using Microsoft.Extensions.Options;

namespace Beautora.DeviceAgent.Hosting;

/// <summary>
/// Periodically pulls ZKTeco attendance logs via SyncOps SDK and posts them to Beautora.
/// </summary>
public sealed class BeautoraAttendanceSyncHostedService : BackgroundService
{
    private readonly IBeautoraAttendanceBridge _bridge;
    private readonly DeviceAgentOptions _options;
    private readonly ILogger<BeautoraAttendanceSyncHostedService> _logger;

    public BeautoraAttendanceSyncHostedService(
        IBeautoraAttendanceBridge bridge,
        IOptions<DeviceAgentOptions> options,
        ILogger<BeautoraAttendanceSyncHostedService> logger)
    {
        _bridge = bridge;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var bridge = _options.Beautora;
        if (!bridge.AttendanceSyncEnabled ||
            string.IsNullOrWhiteSpace(bridge.AttendanceApiKey) ||
            string.IsNullOrWhiteSpace(bridge.AppUrl))
        {
            _logger.LogInformation(
                "Beautora attendance auto-sync disabled (set DeviceAgent:Beautora:AttendanceSyncEnabled=true + AttendanceApiKey)");
            return;
        }

        var interval = TimeSpan.FromSeconds(Math.Clamp(bridge.AttendanceSyncIntervalSeconds, 5, 300));
        _logger.LogInformation(
            "Beautora attendance auto-sync enabled → {AppUrl} every {Seconds}s",
            bridge.AppUrl.TrimEnd('/'),
            interval.TotalSeconds);

        // Brief delay so discovery can finish first.
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(3), stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var result = await _bridge.SyncAsync(stoppingToken);
                if (!result.Success && !string.IsNullOrWhiteSpace(result.Message))
                    _logger.LogWarning("Attendance sync: {Message}", result.Message);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Beautora attendance sync loop failed");
            }

            try
            {
                await Task.Delay(interval, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }
}
