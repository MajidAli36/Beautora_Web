using SyncOps.DeviceSDK.Exceptions;
using SyncOps.DeviceSDK.Models;

namespace SyncOps.DeviceAdapters.ZKTeco.Protocol;

/// <summary>
/// Real ZK device protocol when vendor SDK is unavailable.
/// Serves attendance from <see cref="ZktecoAttendancePunchStore"/> (ADMS push / watchers).
/// Connect verifies TCP reachability only.
/// </summary>
public sealed class ZktecoPushBufferProtocol : IZktecoProtocol
{
    private readonly string _deviceKey;
    private string? _host;
    private int _port;
    private bool _connected;

    public ZktecoPushBufferProtocol(string deviceKey)
    {
        _deviceKey = deviceKey;
    }

    public bool IsConnected => _connected;

    public Task ConnectAsync(string host, int port, int timeoutMs, CancellationToken cancellationToken = default)
    {
        _host = host;
        _port = port;
        // Do NOT open a TCP session here. ZKTeco devices typically allow only one
        // concurrent connection — the realtime watcher (watch.mjs) owns that socket.
        // Opening TCP from live-sync polls was kicking the watcher offline, so
        // "thank you" on the machine never produced attendance rows.
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
        Ensure();
        return Task.FromResult(new ZktecoDeviceInfo
        {
            DeviceName = _host is null ? _deviceKey : $"{_host}:{_port}",
            Model = "ZKTeco (push-buffer)",
            Platform = "push-buffer",
            SerialNumber = _deviceKey
        });
    }

    public Task<DateTimeOffset> GetDeviceTimeAsync(CancellationToken cancellationToken = default)
    {
        Ensure();
        return Task.FromResult(DateTimeOffset.Now);
    }

    public Task<IReadOnlyList<DeviceUser>> GetUsersAsync(CancellationToken cancellationToken = default)
    {
        Ensure();
        // Users come from punches seen so far.
        var users = ZktecoAttendancePunchStore.Get()
            .Select(l => l.UserId)
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Select(id => new DeviceUser { UserId = id!, Name = id, Enabled = true })
            .ToList();
        return Task.FromResult<IReadOnlyList<DeviceUser>>(users);
    }

    public Task<IReadOnlyList<AttendanceLog>> GetAttendanceLogsAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken = default)
    {
        Ensure();
        return Task.FromResult(ZktecoAttendancePunchStore.Get(from, to));
    }

    public Task AddUserAsync(DeviceUser user, CancellationToken cancellationToken = default) =>
        Task.FromException(Unsupported("AddUser"));

    public Task UpdateUserAsync(DeviceUser user, CancellationToken cancellationToken = default) =>
        Task.FromException(Unsupported("UpdateUser"));

    public Task DeleteUserAsync(string userId, CancellationToken cancellationToken = default) =>
        Task.FromException(Unsupported("DeleteUser"));

    public Task ClearAttendanceLogsAsync(CancellationToken cancellationToken = default)
    {
        Ensure();
        ZktecoAttendancePunchStore.Clear();
        return Task.CompletedTask;
    }

    public Task SetDeviceTimeAsync(DateTimeOffset utcTime, CancellationToken cancellationToken = default) =>
        Task.CompletedTask;

    public Task RestartAsync(CancellationToken cancellationToken = default) =>
        Task.FromException(Unsupported("Restart"));

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    private void Ensure()
    {
        if (!_connected)
            throw new DeviceConnectionException("ZKTeco push-buffer protocol is not connected.");
    }

    private static DeviceException Unsupported(string op) =>
        new(DeviceErrorCode.UnsupportedOperation,
            $"ZKTeco '{op}' needs vendor SDK. Attendance works via ADMS push (/iclock) into the punch buffer.");
}
