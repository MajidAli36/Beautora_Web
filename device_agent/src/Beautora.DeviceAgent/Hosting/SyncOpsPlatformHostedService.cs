using Beautora.DeviceAgent.Configuration;
using Microsoft.Extensions.Options;
using SyncOps.DeviceSDK.Cloud;
using SyncOps.DeviceSDK.Core;
using SyncOps.DeviceSDK.Models;

namespace Beautora.DeviceAgent.Hosting;

/// <summary>
/// Boots SyncOps DeviceManager discovery and optional cloud channel.
/// </summary>
public sealed class SyncOpsPlatformHostedService : BackgroundService
{
    private readonly SyncOps.DeviceSDK.Core.IDeviceManager _manager;
    private readonly ICloudDeviceChannel _cloud;
    private readonly DeviceAgentOptions _options;
    private readonly ILogger<SyncOpsPlatformHostedService> _logger;

    public SyncOpsPlatformHostedService(
        SyncOps.DeviceSDK.Core.IDeviceManager manager,
        ICloudDeviceChannel cloud,
        IOptions<DeviceAgentOptions> options,
        ILogger<SyncOpsPlatformHostedService> logger)
    {
        _manager = manager;
        _cloud = cloud;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            var request = new DiscoveryRequest
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
            };

            var devices = await _manager.DiscoverAsync(request, stoppingToken);
            _logger.LogInformation("SyncOps discovery found {Count} device(s)", devices.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Initial SyncOps discovery failed");
        }

        if (_cloud.IsEnabled)
        {
            try
            {
                await _cloud.ConnectAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "SyncOps Cloud channel not available yet");
            }
        }

        var intervalMinutes = Math.Clamp(_options.DiscoveryIntervalMinutes, 5, 120);
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromMinutes(intervalMinutes), stoppingToken);
                await _manager.DiscoverAsync(new DiscoveryRequest { IncludeMocks = _options.MockMode }, stoppingToken);
                if (_cloud.IsEnabled)
                {
                    try { await _cloud.ReportHeartbeatAsync(stoppingToken); }
                    catch (Exception ex) { _logger.LogDebug(ex, "Cloud heartbeat skipped"); }
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SyncOps platform refresh failed");
            }
        }
    }
}
