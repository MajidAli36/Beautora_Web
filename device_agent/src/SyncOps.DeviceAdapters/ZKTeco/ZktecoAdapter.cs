using Microsoft.Extensions.Logging;
using SyncOps.DeviceAdapters.ZKTeco.Protocol;
using SyncOps.DeviceSDK.Core;
using SyncOps.DeviceSDK.Exceptions;
using SyncOps.DeviceSDK.Logging;
using SyncOps.DeviceSDK.Models;

namespace SyncOps.DeviceAdapters.ZKTeco;

public sealed class ZktecoAdapterOptions
{
    public bool MockMode { get; set; }

    /// <summary>mock | tcp-probe | vendor-sdk | push-buffer</summary>
    public string ProtocolMode { get; set; } = "push-buffer";

    public string Host { get; set; } = "192.168.1.201";
    public int Port { get; set; } = 4370;
    public int TimeoutMs { get; set; } = 5000;
    public bool EnableKnownEndpointDiscovery { get; set; } = true;
}

public sealed class ZktecoAdapter : IDeviceAdapter
{
    private readonly ZktecoAdapterOptions _options;
    private readonly ILoggerFactory _loggerFactory;

    public ZktecoAdapter(ZktecoAdapterOptions options, ILoggerFactory loggerFactory)
    {
        _options = options;
        _loggerFactory = loggerFactory;
    }

    public string AdapterId => "zkteco-standalone";
    public string Manufacturer => "ZKTeco";
    public IReadOnlyList<DeviceType> SupportedDeviceTypes { get; } =
        [DeviceType.AttendanceTerminal, DeviceType.Fingerprint];

    public bool CanHandle(DeviceInfo candidate)
    {
        if (string.Equals(candidate.AdapterId, AdapterId, StringComparison.OrdinalIgnoreCase))
            return true;
        if (string.Equals(candidate.Manufacturer, "ZKTeco", StringComparison.OrdinalIgnoreCase))
            return true;
        if (candidate.Id.StartsWith("zkteco-", StringComparison.OrdinalIgnoreCase))
            return true;
        if (candidate.Host == _options.Host && candidate.Port == _options.Port)
            return true;
        return false;
    }

    public Task<IReadOnlyList<DeviceInfo>> DiscoverAsync(
        DiscoveryRequest request,
        CancellationToken cancellationToken = default)
    {
        var list = new List<DeviceInfo>();

        if (_options.MockMode || string.Equals(_options.ProtocolMode, "mock", StringComparison.OrdinalIgnoreCase))
        {
            list.Add(CreateInfo(
                id: "zkteco-mock",
                name: "Mock ZKTeco Terminal",
                host: "127.0.0.1",
                port: _options.Port,
                mock: true));
        }

        if (_options.EnableKnownEndpointDiscovery &&
            !string.IsNullOrWhiteSpace(_options.Host) &&
            _options.Port > 0)
        {
            list.Add(CreateInfo(
                id: $"zkteco-{_options.Host}-{_options.Port}",
                name: $"ZKTeco {_options.Host}:{_options.Port}",
                host: _options.Host,
                port: _options.Port,
                mock: false));
        }

        foreach (var ep in request.KnownEndpoints)
        {
            if (ep.Port is null || string.IsNullOrWhiteSpace(ep.Host)) continue;
            var id = $"zkteco-{ep.Host}-{ep.Port}";
            if (list.Any(d => d.Id == id)) continue;
            list.Add(CreateInfo(id, $"ZKTeco {ep.Host}:{ep.Port}", ep.Host, ep.Port.Value, mock: false));
        }

        return Task.FromResult<IReadOnlyList<DeviceInfo>>(list);
    }

    public Task<IDevice> CreateDeviceAsync(
        DeviceInfo info,
        DeviceConnection? connection = null,
        CancellationToken cancellationToken = default)
    {
        var protocol = CreateProtocol(info);
        IDevice device = new ZktecoDevice(
            info,
            protocol,
            _options,
            _loggerFactory.CreateLogger<ZktecoDevice>());
        return Task.FromResult(device);
    }

    private IZktecoProtocol CreateProtocol(DeviceInfo info)
    {
        var isMockDevice =
            info.Id.Contains("mock", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(info.Model, "Mock", StringComparison.OrdinalIgnoreCase);

        // Only the mock device uses the in-memory mock protocol.
        // Real LAN terminals use the push-buffer (ADMS / realtime) so physical
        // thumb presses can land even when global MockMode is on for printers.
        if (isMockDevice ||
            (string.Equals(_options.ProtocolMode, "mock", StringComparison.OrdinalIgnoreCase) &&
             string.IsNullOrWhiteSpace(info.Host)))
            return new MockZktecoProtocol();

        if (string.Equals(_options.ProtocolMode, "vendor-sdk", StringComparison.OrdinalIgnoreCase))
            return new ZktecoVendorSdkProtocol();

        if (string.Equals(_options.ProtocolMode, "tcp-probe", StringComparison.OrdinalIgnoreCase))
            return new ZktecoTcpProbeProtocol();

        // Default for real configured IP: serve ADMS/realtime punches from the shared buffer.
        return new ZktecoPushBufferProtocol(info.Id);
    }

    private DeviceInfo CreateInfo(string id, string name, string host, int port, bool mock) => new()
    {
        Id = id,
        Type = DeviceType.AttendanceTerminal,
        Name = name,
        Manufacturer = "ZKTeco",
        Model = mock ? "Mock" : "Standalone",
        Status = mock ? DeviceOnlineStatus.Mock : DeviceOnlineStatus.Unknown,
        ConnectionState = mock ? DeviceConnectionState.Mock : DeviceConnectionState.Disconnected,
        ConnectionType = mock ? ConnectionType.Mock : ConnectionType.Tcp,
        Host = host,
        Port = port,
        AdapterId = AdapterId,
        Capabilities =
        [
            new DeviceCapability { Kind = DeviceCapabilityKind.Attendance, Name = "attendance" },
            new DeviceCapability { Kind = DeviceCapabilityKind.UserDirectory, Name = "users" },
            new DeviceCapability { Kind = DeviceCapabilityKind.DeviceTime, Name = "device-time" },
            new DeviceCapability { Kind = DeviceCapabilityKind.FingerprintScan, Name = "fingerprint", IsSupported = false, Notes = "TODO: upload/get/delete template via SDK" }
        ]
    };
}

public sealed class ZktecoDevice : IAttendanceDevice, IUserDirectoryDevice, IFingerprintDevice
{
    private readonly DeviceInfo _info;
    private readonly IZktecoProtocol _protocol;
    private readonly ZktecoAdapterOptions _options;
    private readonly ILogger _logger;

    public ZktecoDevice(
        DeviceInfo info,
        IZktecoProtocol protocol,
        ZktecoAdapterOptions options,
        ILogger logger)
    {
        _info = info;
        _protocol = protocol;
        _options = options;
        _logger = logger;
    }

    public string DeviceId => _info.Id;
    public string Manufacturer => "ZKTeco";
    public string Model => _info.Model;
    public DeviceType DeviceType => DeviceType.AttendanceTerminal;
    public DeviceConnectionState ConnectionState { get; private set; } = DeviceConnectionState.Disconnected;
    public string AdapterId => "zkteco-standalone";

    public async Task ConnectAsync(DeviceConnection connection, CancellationToken cancellationToken = default)
    {
        await DeviceLogger.MeasureAsync(_logger, "Zkteco.Connect", DeviceId, Manufacturer, async ct =>
        {
            ConnectionState = DeviceConnectionState.Connecting;
            var host = connection.Host ?? _info.Host ?? _options.Host;
            var port = connection.Port ?? _info.Port ?? _options.Port;
            var timeout = connection.TimeoutMs > 0 ? connection.TimeoutMs : _options.TimeoutMs;
            await _protocol.ConnectAsync(host, port, timeout, ct).ConfigureAwait(false);
            ConnectionState = _info.ConnectionType == ConnectionType.Mock
                ? DeviceConnectionState.Mock
                : DeviceConnectionState.Connected;
        }, cancellationToken).ConfigureAwait(false);
    }

    public async Task DisconnectAsync(CancellationToken cancellationToken = default)
    {
        await _protocol.DisconnectAsync(cancellationToken).ConfigureAwait(false);
        ConnectionState = DeviceConnectionState.Disconnected;
    }

    public Task<bool> TestConnectionAsync(CancellationToken cancellationToken = default) =>
        _protocol.TestConnectionAsync(cancellationToken);

    public async Task<DeviceInfo> GetInfoAsync(CancellationToken cancellationToken = default)
    {
        var zk = await _protocol.GetDeviceInfoAsync(cancellationToken).ConfigureAwait(false);
        return new DeviceInfo
        {
            Id = DeviceId,
            Type = DeviceType.AttendanceTerminal,
            Name = zk.DeviceName ?? _info.Name,
            Manufacturer = Manufacturer,
            Model = zk.Model ?? _info.Model,
            SerialNumber = zk.SerialNumber,
            FirmwareVersion = zk.FirmwareVersion,
            Status = ConnectionState == DeviceConnectionState.Mock ? DeviceOnlineStatus.Mock : DeviceOnlineStatus.Online,
            ConnectionState = ConnectionState,
            ConnectionType = _info.ConnectionType,
            Host = _info.Host,
            Port = _info.Port,
            AdapterId = AdapterId,
            Capabilities = _info.Capabilities,
            LastSeenUtc = DateTimeOffset.UtcNow,
            Detail = zk.Platform
        };
    }

    public Task<DeviceStatus> GetStatusAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(new DeviceStatus
        {
            DeviceId = DeviceId,
            OnlineStatus = ConnectionState switch
            {
                DeviceConnectionState.Mock => DeviceOnlineStatus.Mock,
                DeviceConnectionState.Connected => DeviceOnlineStatus.Online,
                DeviceConnectionState.Faulted => DeviceOnlineStatus.Offline,
                _ => DeviceOnlineStatus.Offline
            },
            ConnectionState = ConnectionState,
            State = ConnectionState.ToString().ToLowerInvariant()
        });

    public Task<IReadOnlyList<DeviceCapability>> GetCapabilitiesAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(_info.Capabilities);

    public Task<IReadOnlyList<AttendanceLog>> GetAttendanceLogsAsync(
        DateTimeOffset? from = null,
        DateTimeOffset? to = null,
        CancellationToken cancellationToken = default) =>
        DeviceLogger.MeasureAsync(_logger, "Zkteco.GetAttendanceLogs", DeviceId, Manufacturer,
            ct => _protocol.GetAttendanceLogsAsync(from, to, ct), cancellationToken);

    public Task<DateTimeOffset> GetDeviceTimeAsync(CancellationToken cancellationToken = default) =>
        DeviceLogger.MeasureAsync(_logger, "Zkteco.GetDeviceTime", DeviceId, Manufacturer,
            ct => _protocol.GetDeviceTimeAsync(ct), cancellationToken);

    public Task ClearAttendanceLogsAsync(CancellationToken cancellationToken = default) =>
        _protocol.ClearAttendanceLogsAsync(cancellationToken);

    public Task SetDeviceTimeAsync(DateTimeOffset utcTime, CancellationToken cancellationToken = default) =>
        _protocol.SetDeviceTimeAsync(utcTime, cancellationToken);

    public Task RestartAsync(CancellationToken cancellationToken = default) =>
        _protocol.RestartAsync(cancellationToken);

    /// <summary>Append a punch (mock protocol or shared push-buffer store).</summary>
    public Task<AttendanceLog> SimulatePunchAsync(
        string userId,
        int? inOutMode = null,
        DateTimeOffset? at = null,
        CancellationToken cancellationToken = default)
    {
        if (_protocol is MockZktecoProtocol mock)
            return Task.FromResult(mock.AppendPunch(userId, inOutMode, at));

        var ts = at ?? DateTimeOffset.UtcNow;
        var log = ZktecoAttendancePunchStore.Add(userId, ts, inOutMode, 1, DeviceId);
        return Task.FromResult(log);
    }

    public Task<IReadOnlyList<DeviceUser>> GetUsersAsync(CancellationToken cancellationToken = default) =>
        DeviceLogger.MeasureAsync(_logger, "Zkteco.GetUsers", DeviceId, Manufacturer,
            ct => _protocol.GetUsersAsync(ct), cancellationToken);

    public Task AddUserAsync(DeviceUser user, CancellationToken cancellationToken = default) =>
        _protocol.AddUserAsync(user, cancellationToken);

    public Task UpdateUserAsync(DeviceUser user, CancellationToken cancellationToken = default) =>
        _protocol.UpdateUserAsync(user, cancellationToken);

    public Task DeleteUserAsync(string userId, CancellationToken cancellationToken = default) =>
        _protocol.DeleteUserAsync(userId, cancellationToken);

    public Task<FingerprintScanResult> ScanAsync(CancellationToken cancellationToken = default) =>
        Task.FromException<FingerprintScanResult>(new DeviceException(
            DeviceErrorCode.UnsupportedOperation,
            "ZKTeco fingerprint capture not implemented yet. TODO: wire vendor SDK template APIs.",
            DeviceId));

    public Task<FingerprintVerifyResult> VerifyAsync(byte[] template, CancellationToken cancellationToken = default) =>
        Task.FromException<FingerprintVerifyResult>(new DeviceException(
            DeviceErrorCode.UnsupportedOperation,
            "ZKTeco fingerprint verify not implemented yet. TODO: wire vendor SDK.",
            DeviceId));
}
