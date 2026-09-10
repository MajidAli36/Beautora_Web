using Beautora.DeviceAgent.Models.Common;

namespace Beautora.DeviceAgent.Devices.DeviceManager;

public interface IDeviceManager
{
    Task<IEnumerable<DeviceInfo>> GetAllDevicesAsync(CancellationToken cancellationToken = default);
    Task<DeviceInfo?> GetDeviceAsync(string deviceId, CancellationToken cancellationToken = default);
    Task RefreshAsync(CancellationToken cancellationToken = default);
}
