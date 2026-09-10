using Beautora.DeviceAgent.Devices.DeviceDiscovery;
using Beautora.DeviceAgent.Models.Common;

namespace Beautora.DeviceAgent.Devices.DeviceManager;

public sealed class DeviceManager : IDeviceManager
{
    private readonly IDeviceDiscoveryService _discovery;
    private readonly ILogger<DeviceManager> _logger;
    private readonly object _gate = new();
    private IReadOnlyList<DeviceInfo> _cache = Array.Empty<DeviceInfo>();

    public DeviceManager(IDeviceDiscoveryService discovery, ILogger<DeviceManager> logger)
    {
        _discovery = discovery;
        _logger = logger;
    }

    public async Task<IEnumerable<DeviceInfo>> GetAllDevicesAsync(CancellationToken cancellationToken = default)
    {
        if (_cache.Count == 0)
            await RefreshAsync(cancellationToken);
        lock (_gate) return _cache.ToList();
    }

    public async Task<DeviceInfo?> GetDeviceAsync(string deviceId, CancellationToken cancellationToken = default)
    {
        var all = await GetAllDevicesAsync(cancellationToken);
        return all.FirstOrDefault(d => string.Equals(d.Id, deviceId, StringComparison.OrdinalIgnoreCase));
    }

    public async Task RefreshAsync(CancellationToken cancellationToken = default)
    {
        var discovered = await _discovery.DiscoverAsync(cancellationToken);
        lock (_gate) _cache = discovered;
        _logger.LogInformation("Device discovery refreshed: {Count} device(s)", discovered.Count);
        foreach (var d in discovered)
            _logger.LogInformation("Device discovered: {Type} {Name} ({Id}) {Status}", d.Type, d.Name, d.Id, d.Status);
    }
}
