using SyncOps.DeviceSDK.Exceptions;
using SyncOps.DeviceSDK.Models;
using SyncOps.DeviceSDK.Transports;

namespace SyncOps.DeviceAdapters.ZKTeco.Protocol;

/// <summary>
/// Development/mock ZKTeco protocol — no hardware required.
/// </summary>
public sealed class MockZktecoProtocol : IZktecoProtocol
{
    private bool _connected;
    private readonly List<DeviceUser> _users =
    [
        new DeviceUser { UserId = "1", Name = "Mock User", Enabled = true, Privilege = 0 },
        new DeviceUser { UserId = "2", Name = "Mock Admin", Enabled = true, Privilege = 14 }
    ];

    private readonly List<AttendanceLog> _logs =
    [
        new AttendanceLog { UserId = "1", Timestamp = DateTimeOffset.UtcNow.AddHours(-2), VerifyMode = 1, InOutMode = 0 },
        new AttendanceLog { UserId = "2", Timestamp = DateTimeOffset.UtcNow.AddHours(-1), VerifyMode = 1, InOutMode = 1 }
    ];

    public bool IsConnected => _connected;

    public Task ConnectAsync(string host, int port, int timeoutMs, CancellationToken cancellationToken = default)
    {
        _connected = true;
        return Task.CompletedTask;
    }

    public Task DisconnectAsync(CancellationToken cancellationToken = default)
    {
        _connected = false;
        return Task.CompletedTask;
    }

    public Task<bool> TestConnectionAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(_connected);

    public Task<ZktecoDeviceInfo> GetDeviceInfoAsync(CancellationToken cancellationToken = default)
    {
        EnsureConnected();
        return Task.FromResult(new ZktecoDeviceInfo
        {
            SerialNumber = "MOCK-ZK-0001",
            Model = "MockZKTeco",
            FirmwareVersion = "1.0.0-mock",
            Platform = "mock",
            DeviceName = "Mock ZKTeco Terminal"
        });
    }

    public Task<DateTimeOffset> GetDeviceTimeAsync(CancellationToken cancellationToken = default)
    {
        EnsureConnected();
        return Task.FromResult(DateTimeOffset.Now);
    }

    public Task<IReadOnlyList<DeviceUser>> GetUsersAsync(CancellationToken cancellationToken = default)
    {
        EnsureConnected();
        return Task.FromResult<IReadOnlyList<DeviceUser>>(_users.ToList());
    }

    public Task<IReadOnlyList<AttendanceLog>> GetAttendanceLogsAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken = default)
    {
        EnsureConnected();
        IEnumerable<AttendanceLog> q = _logs.Concat(ZktecoAttendancePunchStore.Get());
        if (from is not null) q = q.Where(l => l.Timestamp >= from);
        if (to is not null) q = q.Where(l => l.Timestamp <= to);
        return Task.FromResult<IReadOnlyList<AttendanceLog>>(
            q.GroupBy(l => $"{l.UserId}@{l.Timestamp.ToUnixTimeMilliseconds()}")
                .Select(g => g.First())
                .OrderBy(l => l.Timestamp)
                .ToList());
    }

    public Task AddUserAsync(DeviceUser user, CancellationToken cancellationToken = default)
    {
        EnsureConnected();
        _users.RemoveAll(u => u.UserId == user.UserId);
        _users.Add(user);
        return Task.CompletedTask;
    }

    public Task UpdateUserAsync(DeviceUser user, CancellationToken cancellationToken = default) =>
        AddUserAsync(user, cancellationToken);

    public Task DeleteUserAsync(string userId, CancellationToken cancellationToken = default)
    {
        EnsureConnected();
        _users.RemoveAll(u => u.UserId == userId);
        return Task.CompletedTask;
    }

    public Task ClearAttendanceLogsAsync(CancellationToken cancellationToken = default)
    {
        EnsureConnected();
        _logs.Clear();
        return Task.CompletedTask;
    }

    public Task SetDeviceTimeAsync(DateTimeOffset utcTime, CancellationToken cancellationToken = default)
    {
        EnsureConnected();
        // Mock accepts but does not change OS clock.
        return Task.CompletedTask;
    }

    public Task RestartAsync(CancellationToken cancellationToken = default)
    {
        EnsureConnected();
        return Task.CompletedTask;
    }

    /// <summary>Dev-only: append a live punch so Sync → Beautora can be tested without hardware.</summary>
    public AttendanceLog AppendPunch(string userId, int? inOutMode = null, DateTimeOffset? at = null)
    {
        EnsureConnected();
        var log = new AttendanceLog
        {
            UserId = userId,
            Timestamp = at ?? DateTimeOffset.UtcNow,
            VerifyMode = 1,
            InOutMode = inOutMode,
            DeviceId = "zkteco-mock"
        };
        _logs.Add(log);
        ZktecoAttendancePunchStore.Add(userId, log.Timestamp, inOutMode, 1, "zkteco-mock");
        return log;
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    private void EnsureConnected()
    {
        if (!_connected)
            throw new DeviceConnectionException("Mock ZKTeco protocol is not connected.");
    }
}

/// <summary>
/// Proves TCP reachability to a ZKTeco device (port 4370).
/// Does NOT speak the proprietary protocol — use VendorSdkProtocol for real ops.
/// GetUsers/GetAttendance/etc. throw UnsupportedOperation until vendor SDK is linked.
/// </summary>
public sealed class ZktecoTcpProbeProtocol : IZktecoProtocol
{
    private readonly TcpTransport _tcp = new();
    private string? _host;
    private int _port;

    public bool IsConnected => _tcp.IsConnected;

    public async Task ConnectAsync(string host, int port, int timeoutMs, CancellationToken cancellationToken = default)
    {
        _host = host;
        _port = port;
        await _tcp.ConnectAsync(new DeviceConnection
        {
            ConnectionType = ConnectionType.Tcp,
            Host = host,
            Port = port,
            TimeoutMs = timeoutMs
        }, cancellationToken).ConfigureAwait(false);
    }

    public Task DisconnectAsync(CancellationToken cancellationToken = default) =>
        _tcp.DisconnectAsync(cancellationToken);

    public async Task<bool> TestConnectionAsync(CancellationToken cancellationToken = default)
    {
        if (IsConnected) return true;
        if (_host is null) return false;
        try
        {
            await ConnectAsync(_host, _port, 3000, cancellationToken).ConfigureAwait(false);
            return true;
        }
        catch
        {
            return false;
        }
    }

    public Task<ZktecoDeviceInfo> GetDeviceInfoAsync(CancellationToken cancellationToken = default)
    {
        EnsureTcp();
        // TCP is up, but device identity requires vendor SDK / native protocol.
        return Task.FromResult(new ZktecoDeviceInfo
        {
            Model = "ZKTeco (TCP reachable)",
            DeviceName = $"{_host}:{_port}",
            Platform = "tcp-probe"
        });
    }

    public Task<DateTimeOffset> GetDeviceTimeAsync(CancellationToken cancellationToken = default) =>
        Task.FromException<DateTimeOffset>(Unsupported("GetDeviceTime"));

    public Task<IReadOnlyList<DeviceUser>> GetUsersAsync(CancellationToken cancellationToken = default) =>
        Task.FromException<IReadOnlyList<DeviceUser>>(Unsupported("GetUsers"));

    public Task<IReadOnlyList<AttendanceLog>> GetAttendanceLogsAsync(
        DateTimeOffset? from, DateTimeOffset? to, CancellationToken cancellationToken = default) =>
        Task.FromException<IReadOnlyList<AttendanceLog>>(Unsupported("GetAttendanceLogs"));

    public Task AddUserAsync(DeviceUser user, CancellationToken cancellationToken = default) =>
        Task.FromException(Unsupported("AddUser"));

    public Task UpdateUserAsync(DeviceUser user, CancellationToken cancellationToken = default) =>
        Task.FromException(Unsupported("UpdateUser"));

    public Task DeleteUserAsync(string userId, CancellationToken cancellationToken = default) =>
        Task.FromException(Unsupported("DeleteUser"));

    public Task ClearAttendanceLogsAsync(CancellationToken cancellationToken = default) =>
        Task.FromException(Unsupported("ClearAttendanceLogs"));

    public Task SetDeviceTimeAsync(DateTimeOffset utcTime, CancellationToken cancellationToken = default) =>
        Task.FromException(Unsupported("SetDeviceTime"));

    public Task RestartAsync(CancellationToken cancellationToken = default) =>
        Task.FromException(Unsupported("Restart"));

    public ValueTask DisposeAsync() => _tcp.DisposeAsync();

    private void EnsureTcp()
    {
        if (!IsConnected)
            throw new DeviceConnectionException("ZKTeco TCP probe is not connected.");
    }

    private static DeviceException Unsupported(string op) =>
        new(DeviceErrorCode.UnsupportedOperation,
            $"ZKTeco operation '{op}' requires the official Standalone SDK (or native protocol). " +
            "TCP probe only verifies network reachability. Link vendor SDK into ZktecoVendorSdkProtocol.");
}

/// <summary>
/// Placeholder for official ZKTeco Standalone SDK.
/// Do not invent COM/DLL calls — wire real SDK methods here when DLLs are available.
/// </summary>
public sealed class ZktecoVendorSdkProtocol : IZktecoProtocol
{
    public bool IsConnected => false;

    public Task ConnectAsync(string host, int port, int timeoutMs, CancellationToken cancellationToken = default) =>
        Task.FromException(NotLinked("Connect"));

    public Task DisconnectAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;

    public Task<bool> TestConnectionAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(false);

    public Task<ZktecoDeviceInfo> GetDeviceInfoAsync(CancellationToken cancellationToken = default) =>
        Task.FromException<ZktecoDeviceInfo>(NotLinked("GetDeviceInfo"));

    public Task<DateTimeOffset> GetDeviceTimeAsync(CancellationToken cancellationToken = default) =>
        Task.FromException<DateTimeOffset>(NotLinked("GetDeviceTime"));

    public Task<IReadOnlyList<DeviceUser>> GetUsersAsync(CancellationToken cancellationToken = default) =>
        Task.FromException<IReadOnlyList<DeviceUser>>(NotLinked("GetUsers"));

    public Task<IReadOnlyList<AttendanceLog>> GetAttendanceLogsAsync(
        DateTimeOffset? from, DateTimeOffset? to, CancellationToken cancellationToken = default) =>
        Task.FromException<IReadOnlyList<AttendanceLog>>(NotLinked("GetAttendanceLogs"));

    public Task AddUserAsync(DeviceUser user, CancellationToken cancellationToken = default) =>
        Task.FromException(NotLinked("AddUser"));

    public Task UpdateUserAsync(DeviceUser user, CancellationToken cancellationToken = default) =>
        Task.FromException(NotLinked("UpdateUser"));

    public Task DeleteUserAsync(string userId, CancellationToken cancellationToken = default) =>
        Task.FromException(NotLinked("DeleteUser"));

    public Task ClearAttendanceLogsAsync(CancellationToken cancellationToken = default) =>
        Task.FromException(NotLinked("ClearAttendanceLogs"));

    public Task SetDeviceTimeAsync(DateTimeOffset utcTime, CancellationToken cancellationToken = default) =>
        Task.FromException(NotLinked("SetDeviceTime"));

    public Task RestartAsync(CancellationToken cancellationToken = default) =>
        Task.FromException(NotLinked("Restart"));

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    private static DeviceException NotLinked(string op) =>
        new(DeviceErrorCode.UnsupportedOperation,
            $"ZKTeco vendor SDK not linked. Operation '{op}' is unavailable. " +
            "Place Standalone SDK binaries under adapters/ZKTeco/lib and implement ZktecoVendorSdkProtocol.");
}
