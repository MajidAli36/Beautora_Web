using Microsoft.Extensions.Logging;
using SyncOps.DeviceSDK.Core;
using SyncOps.DeviceSDK.Models;

namespace SyncOps.DeviceSDK.Discovery;

public sealed class DeviceDiscoveryEngine
{
    private readonly List<IDiscoveryProvider> _providers = new();
    private readonly List<IDeviceAdapter> _adapters = new();
    private readonly ILogger<DeviceDiscoveryEngine> _logger;

    public DeviceDiscoveryEngine(ILogger<DeviceDiscoveryEngine> logger)
    {
        _logger = logger;
    }

    public void AddProvider(IDiscoveryProvider provider) => _providers.Add(provider);
    public void AddAdapter(IDeviceAdapter adapter) => _adapters.Add(adapter);

    public async Task<IReadOnlyList<DeviceInfo>> DiscoverAsync(
        DiscoveryRequest request,
        CancellationToken cancellationToken = default)
    {
        var results = new List<DeviceInfo>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var provider in _providers)
        {
            cancellationToken.ThrowIfCancellationRequested();
            try
            {
                var found = await provider.DiscoverAsync(request, cancellationToken).ConfigureAwait(false);
                foreach (var d in found)
                {
                    if (seen.Add(d.Id))
                        results.Add(d);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Discovery provider {ProviderId} failed", provider.ProviderId);
            }
        }

        foreach (var adapter in _adapters)
        {
            cancellationToken.ThrowIfCancellationRequested();
            try
            {
                var found = await adapter.DiscoverAsync(request, cancellationToken).ConfigureAwait(false);
                foreach (var d in found)
                {
                    if (seen.Add(d.Id))
                        results.Add(d);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Adapter discovery {AdapterId} failed", adapter.AdapterId);
            }
        }

        _logger.LogInformation("Discovery completed: {Count} device(s)", results.Count);
        return results;
    }
}

/// <summary>
/// Registers explicitly configured endpoints without scanning networks.
/// </summary>
public sealed class KnownEndpointDiscoveryProvider : IDiscoveryProvider
{
    public string ProviderId => "known-endpoint";

    public Task<IReadOnlyList<DeviceInfo>> DiscoverAsync(
        DiscoveryRequest request,
        CancellationToken cancellationToken = default)
    {
        var list = new List<DeviceInfo>();
        foreach (var ep in request.KnownEndpoints)
        {
            if (string.IsNullOrWhiteSpace(ep.Host) || ep.Port is null)
                continue;

            var id = $"tcp-{ep.Host}-{ep.Port}";
            list.Add(new DeviceInfo
            {
                Id = id,
                Type = DeviceType.Unknown,
                Name = $"{ep.Host}:{ep.Port}",
                Status = DeviceOnlineStatus.Unknown,
                ConnectionType = ConnectionType.Tcp,
                Host = ep.Host,
                Port = ep.Port,
                Detail = "known-endpoint"
            });
        }

        return Task.FromResult<IReadOnlyList<DeviceInfo>>(list);
    }
}
