using SyncOps.DeviceSDK.Models;

namespace SyncOps.DeviceAdapters.ZKTeco.Protocol;

/// <summary>
/// Vendor-isolated ZKTeco protocol seam.
/// Implementations may use the official Standalone SDK or a future native protocol.
/// SyncOps.DeviceSDK never references vendor DLLs.
/// </summary>
public interface IZktecoProtocol : IAsyncDisposable
{
    bool IsConnected { get; }

    Task ConnectAsync(string host, int port, int timeoutMs, CancellationToken cancellationToken = default);
    Task DisconnectAsync(CancellationToken cancellationToken = default);
    Task<bool> TestConnectionAsync(CancellationToken cancellationToken = default);

    Task<ZktecoDeviceInfo> GetDeviceInfoAsync(CancellationToken cancellationToken = default);
    Task<DateTimeOffset> GetDeviceTimeAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DeviceUser>> GetUsersAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<AttendanceLog>> GetAttendanceLogsAsync(
        DateTimeOffset? from,
        DateTimeOffset? to,
        CancellationToken cancellationToken = default);

    // Prepared — throw UnsupportedOperation until wired to real SDK/protocol.
    Task AddUserAsync(DeviceUser user, CancellationToken cancellationToken = default);
    Task UpdateUserAsync(DeviceUser user, CancellationToken cancellationToken = default);
    Task DeleteUserAsync(string userId, CancellationToken cancellationToken = default);
    Task ClearAttendanceLogsAsync(CancellationToken cancellationToken = default);
    Task SetDeviceTimeAsync(DateTimeOffset utcTime, CancellationToken cancellationToken = default);
    Task RestartAsync(CancellationToken cancellationToken = default);
}

public sealed class ZktecoDeviceInfo
{
    public string? SerialNumber { get; init; }
    public string? Model { get; init; }
    public string? FirmwareVersion { get; init; }
    public string? Platform { get; init; }
    public string? DeviceName { get; init; }
}
