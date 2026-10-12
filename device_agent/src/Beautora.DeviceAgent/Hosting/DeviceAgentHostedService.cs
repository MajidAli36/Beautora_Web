using Beautora.DeviceAgent.Devices.DeviceManager;
using Beautora.DeviceAgent.Configuration;
using Microsoft.Extensions.Options;

namespace Beautora.DeviceAgent.Hosting;

/// <summary>Periodic refresh + keeps the process alive as a background worker.</summary>
public sealed class DeviceAgentHostedService : BackgroundService
{
    private readonly IDeviceManager _devices;
    private readonly ILogger<DeviceAgentHostedService> _logger;
    private readonly DeviceAgentOptions _options;

    public DeviceAgentHostedService(
        IDeviceManager devices,
        IOptions<DeviceAgentOptions> options,
        ILogger<DeviceAgentHostedService> logger)
    {
        _devices = devices;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Device Agent started on {Url} (MockMode={Mock})", _options.ListenUrl, _options.MockMode);
        await _devices.RefreshAsync(stoppingToken);

        var intervalMinutes = Math.Clamp(_options.DiscoveryIntervalMinutes, 5, 120);
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromMinutes(intervalMinutes), stoppingToken);
                await _devices.RefreshAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Background device refresh failed");
            }
        }

        _logger.LogInformation("Device Agent shutting down");
    }
}
