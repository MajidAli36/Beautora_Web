using Microsoft.Extensions.Logging;
using SyncOps.DeviceSDK.Core;
using SyncOps.DeviceSDK.Discovery;
using SyncOps.DeviceSDK.Exceptions;
using SyncOps.DeviceSDK.Logging;
using SyncOps.DeviceSDK.Models;
using SyncOps.DeviceSDK.Registry;

namespace SyncOps.DeviceSDK.Manager;

public sealed class DeviceManager : IDeviceManager
{
    private readonly List<IDeviceAdapter> _adapters = new();
    private readonly DeviceDiscoveryEngine _discovery;
    private readonly IDeviceRegistry _registry;
    private readonly ILogger<DeviceManager> _logger;
    private readonly Dictionary<string, IDevice> _connected = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, DeviceInfo> _known = new(StringComparer.OrdinalIgnoreCase);
    private readonly object _gate = new();

    public DeviceManager(
        DeviceDiscoveryEngine discovery,
        IDeviceRegistry registry,
        ILogger<DeviceManager> logger)
    {
        _discovery = discovery;
        _registry = registry;
        _logger = logger;
    }

    public void RegisterAdapter(IDeviceAdapter adapter)
    {
        _adapters.Add(adapter);
        _discovery.AddAdapter(adapter);
        _logger.LogInformation("Registered adapter {AdapterId} ({Manufacturer})", adapter.AdapterId, adapter.Manufacturer);
    }

    public async Task<IReadOnlyList<DeviceInfo>> DiscoverAsync(
        DiscoveryRequest? request = null,
        CancellationToken cancellationToken = default)
    {
        request ??= new DiscoveryRequest();
        var found = await _discovery.DiscoverAsync(request, cancellationToken).ConfigureAwait(false);

        lock (_gate)
        {
            foreach (var d in found)
                _known[d.Id] = d;
        }

        foreach (var d in found)
        {
            await _registry.UpsertAsync(new RegisteredDevice
            {
                Id = d.Id,
                Manufacturer = d.Manufacturer,
                Model = d.Model,
                SerialNumber = d.SerialNumber,
                DeviceType = d.Type,
                Host = d.Host,
                Port = d.Port,
                ConnectionType = d.ConnectionType,
                LastSeenUtc = DateTimeOffset.UtcNow,
                Status = d.Status.ToString(),
                AdapterId = d.AdapterId ?? "",
                CapabilitiesJson = SqliteDeviceRegistry.SerializeCapabilities(d.Capabilities)
            }, cancellationToken).ConfigureAwait(false);
        }

        return found;
    }

    public Task<IReadOnlyList<DeviceInfo>> GetDevicesAsync(CancellationToken cancellationToken = default)
    {
        lock (_gate)
        {
            if (_known.Count == 0)
                return Task.FromResult<IReadOnlyList<DeviceInfo>>(Array.Empty<DeviceInfo>());
            return Task.FromResult<IReadOnlyList<DeviceInfo>>(_known.Values.ToList());
        }
    }

    public Task<DeviceInfo?> GetDeviceAsync(string deviceId, CancellationToken cancellationToken = default)
    {
        lock (_gate)
            return Task.FromResult(_known.TryGetValue(deviceId, out var d) ? d : null);
    }

    public async Task ConnectAsync(
        string deviceId,
        DeviceConnection? connection = null,
        CancellationToken cancellationToken = default)
    {
        await DeviceLogger.MeasureAsync(_logger, "Connect", deviceId, null, async ct =>
        {
            var info = await ResolveInfoAsync(deviceId, ct).ConfigureAwait(false);
            var adapter = ResolveAdapter(info);
            var conn = connection ?? BuildConnection(info);
            var device = await adapter.CreateDeviceAsync(info, conn, ct).ConfigureAwait(false);
            await device.ConnectAsync(conn, ct).ConfigureAwait(false);

            lock (_gate)
            {
                _connected[deviceId] = device;
                _known[deviceId] = CloneWithState(info, DeviceConnectionState.Connected, DeviceOnlineStatus.Online);
            }
        }, cancellationToken).ConfigureAwait(false);
    }

    public async Task DisconnectAsync(string deviceId, CancellationToken cancellationToken = default)
    {
        await DeviceLogger.MeasureAsync(_logger, "Disconnect", deviceId, null, async ct =>
        {
            IDevice? device;
            lock (_gate)
            {
                _connected.TryGetValue(deviceId, out device);
                _connected.Remove(deviceId);
            }

            if (device is not null)
                await device.DisconnectAsync(ct).ConfigureAwait(false);

            lock (_gate)
            {
                if (_known.TryGetValue(deviceId, out var info))
                    _known[deviceId] = CloneWithState(info, DeviceConnectionState.Disconnected, info.Status);
            }
        }, cancellationToken).ConfigureAwait(false);
    }

    public async Task<DeviceInfo> GetDeviceInfoAsync(string deviceId, CancellationToken cancellationToken = default)
    {
        var device = await GetConnectedOrThrowAsync(deviceId, cancellationToken).ConfigureAwait(false);
        return await device.GetInfoAsync(cancellationToken).ConfigureAwait(false);
    }

    public async Task<DeviceStatus> GetStatusAsync(string deviceId, CancellationToken cancellationToken = default)
    {
        if (TryGetConnectedDevice(deviceId, out var device) && device is not null)
            return await device.GetStatusAsync(cancellationToken).ConfigureAwait(false);

        var info = await GetDeviceAsync(deviceId, cancellationToken).ConfigureAwait(false)
                   ?? throw new DeviceException(DeviceErrorCode.DeviceNotFound, $"Device not found: {deviceId}", deviceId);

        return new DeviceStatus
        {
            DeviceId = deviceId,
            OnlineStatus = info.Status,
            ConnectionState = info.ConnectionState,
            State = info.ConnectionState.ToString().ToLowerInvariant()
        };
    }

    public async Task<IReadOnlyList<DeviceCapability>> GetCapabilitiesAsync(
        string deviceId,
        CancellationToken cancellationToken = default)
    {
        if (TryGetConnectedDevice(deviceId, out var device) && device is not null)
            return await device.GetCapabilitiesAsync(cancellationToken).ConfigureAwait(false);

        var info = await GetDeviceAsync(deviceId, cancellationToken).ConfigureAwait(false)
                   ?? throw new DeviceException(DeviceErrorCode.DeviceNotFound, $"Device not found: {deviceId}", deviceId);
        return info.Capabilities;
    }

    public async Task<T> GetRequiredCapabilityAsync<T>(string deviceId, CancellationToken cancellationToken = default)
        where T : class, IDevice
    {
        var device = await GetConnectedOrThrowAsync(deviceId, cancellationToken).ConfigureAwait(false);
        if (device is T typed)
            return typed;

        throw new DeviceException(
            DeviceErrorCode.UnsupportedOperation,
            $"Device {deviceId} does not support capability {typeof(T).Name}",
            deviceId);
    }

    public bool TryGetConnectedDevice(string deviceId, out IDevice? device)
    {
        lock (_gate)
            return _connected.TryGetValue(deviceId, out device);
    }

    private async Task<IDevice> GetConnectedOrThrowAsync(string deviceId, CancellationToken cancellationToken)
    {
        if (TryGetConnectedDevice(deviceId, out var device) && device is not null)
            return device;

        // Auto-connect if known
        await ConnectAsync(deviceId, cancellationToken: cancellationToken).ConfigureAwait(false);
        if (TryGetConnectedDevice(deviceId, out device) && device is not null)
            return device;

        throw new DeviceException(DeviceErrorCode.ConnectionFailed, $"Unable to connect device {deviceId}", deviceId);
    }

    private async Task<DeviceInfo> ResolveInfoAsync(string deviceId, CancellationToken cancellationToken)
    {
        var info = await GetDeviceAsync(deviceId, cancellationToken).ConfigureAwait(false);
        if (info is not null)
            return info;

        var registered = await _registry.GetAsync(deviceId, cancellationToken).ConfigureAwait(false);
        if (registered is null)
            throw new DeviceException(DeviceErrorCode.DeviceNotFound, $"Device not found: {deviceId}", deviceId);

        info = new DeviceInfo
        {
            Id = registered.Id,
            Type = registered.DeviceType,
            Name = $"{registered.Manufacturer} {registered.Model}".Trim(),
            Manufacturer = registered.Manufacturer,
            Model = registered.Model,
            SerialNumber = registered.SerialNumber,
            Host = registered.Host,
            Port = registered.Port,
            ConnectionType = registered.ConnectionType,
            AdapterId = registered.AdapterId,
            Status = DeviceOnlineStatus.Unknown
        };

        lock (_gate) _known[deviceId] = info;
        return info;
    }

    private IDeviceAdapter ResolveAdapter(DeviceInfo info)
    {
        if (!string.IsNullOrWhiteSpace(info.AdapterId))
        {
            var byId = _adapters.FirstOrDefault(a =>
                string.Equals(a.AdapterId, info.AdapterId, StringComparison.OrdinalIgnoreCase));
            if (byId is not null) return byId;
        }

        var match = _adapters.FirstOrDefault(a => a.CanHandle(info));
        if (match is not null) return match;

        throw new DeviceException(
            DeviceErrorCode.UnsupportedOperation,
            $"No adapter can handle device {info.Id} ({info.Manufacturer}/{info.Type})",
            info.Id);
    }

    private static DeviceConnection BuildConnection(DeviceInfo info) => new()
    {
        ConnectionType = info.ConnectionType,
        Host = info.Host,
        Port = info.Port,
        PathOrName = info.Detail
    };

    private static DeviceInfo CloneWithState(DeviceInfo info, DeviceConnectionState state, DeviceOnlineStatus status) =>
        new()
        {
            Id = info.Id,
            Type = info.Type,
            Name = info.Name,
            Manufacturer = info.Manufacturer,
            Model = info.Model,
            SerialNumber = info.SerialNumber,
            FirmwareVersion = info.FirmwareVersion,
            Status = status,
            ConnectionState = state,
            ConnectionType = info.ConnectionType,
            Host = info.Host,
            Port = info.Port,
            AdapterId = info.AdapterId,
            Detail = info.Detail,
            Capabilities = info.Capabilities,
            LastSeenUtc = DateTimeOffset.UtcNow
        };
}
