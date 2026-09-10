using Beautora.DeviceAgent.Models.Common;

namespace Beautora.DeviceAgent.Devices.DeviceDiscovery;

public interface IDeviceDiscoveryService
{
    Task<IReadOnlyList<DeviceInfo>> DiscoverAsync(CancellationToken cancellationToken = default);
}
