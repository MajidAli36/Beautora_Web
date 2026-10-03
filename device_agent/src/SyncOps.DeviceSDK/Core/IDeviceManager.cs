using SyncOps.DeviceSDK.Models;

namespace SyncOps.DeviceSDK.Core;

public interface IDiscoveryProvider
{
    string ProviderId { get; }
    Task<IReadOnlyList<DeviceInfo>> DiscoverAsync(
        DiscoveryRequest request,
        CancellationToken cancellationToken = default);
}

public interface IDeviceTransport : IAsyncDisposable
{
    ConnectionType ConnectionType { get; }
    bool IsConnected { get; }

    Task ConnectAsync(DeviceConnection connection, CancellationToken cancellationToken = default);
    Task DisconnectAsync(CancellationToken cancellationToken = default);
    Task<int> SendAsync(ReadOnlyMemory<byte> data, CancellationToken cancellationToken = default);
    Task<int> ReceiveAsync(Memory<byte> buffer, CancellationToken cancellationToken = default);
}

public interface IDeviceRegistry
{
    Task UpsertAsync(RegisteredDevice device, CancellationToken cancellationToken = default);
    Task<RegisteredDevice?> GetAsync(string deviceId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<RegisteredDevice>> GetAllAsync(CancellationToken cancellationToken = default);
    Task DeleteAsync(string deviceId, CancellationToken cancellationToken = default);
}

public interface IDeviceManager
{
    void RegisterAdapter(IDeviceAdapter adapter);

    Task<IReadOnlyList<DeviceInfo>> DiscoverAsync(
        DiscoveryRequest? request = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DeviceInfo>> GetDevicesAsync(CancellationToken cancellationToken = default);
    Task<DeviceInfo?> GetDeviceAsync(string deviceId, CancellationToken cancellationToken = default);

    Task ConnectAsync(string deviceId, DeviceConnection? connection = null, CancellationToken cancellationToken = default);
    Task DisconnectAsync(string deviceId, CancellationToken cancellationToken = default);

    Task<DeviceInfo> GetDeviceInfoAsync(string deviceId, CancellationToken cancellationToken = default);
    Task<DeviceStatus> GetStatusAsync(string deviceId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DeviceCapability>> GetCapabilitiesAsync(string deviceId, CancellationToken cancellationToken = default);

    Task<T> GetRequiredCapabilityAsync<T>(string deviceId, CancellationToken cancellationToken = default)
        where T : class, IDevice;

    bool TryGetConnectedDevice(string deviceId, out IDevice? device);
}
