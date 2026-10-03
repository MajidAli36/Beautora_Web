using SyncOps.DeviceSDK.Models;

namespace SyncOps.DeviceSDK.Core;

public interface IDevice
{
    string DeviceId { get; }
    string Manufacturer { get; }
    string Model { get; }
    DeviceType DeviceType { get; }
    DeviceConnectionState ConnectionState { get; }
    string AdapterId { get; }

    Task ConnectAsync(DeviceConnection connection, CancellationToken cancellationToken = default);
    Task DisconnectAsync(CancellationToken cancellationToken = default);
    Task<bool> TestConnectionAsync(CancellationToken cancellationToken = default);
    Task<DeviceInfo> GetInfoAsync(CancellationToken cancellationToken = default);
    Task<DeviceStatus> GetStatusAsync(CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DeviceCapability>> GetCapabilitiesAsync(CancellationToken cancellationToken = default);
}

public interface IPrintableDevice : IDevice
{
    Task<PrintJobResult> PrintAsync(PrintJob job, CancellationToken cancellationToken = default);
    Task<bool> TestPrintAsync(CancellationToken cancellationToken = default);
}

public interface ICashDrawerDevice : IDevice
{
    Task<DrawerOpenResult> OpenDrawerAsync(CancellationToken cancellationToken = default);
}

public interface IFingerprintDevice : IDevice
{
    Task<FingerprintScanResult> ScanAsync(CancellationToken cancellationToken = default);
    Task<FingerprintVerifyResult> VerifyAsync(byte[] template, CancellationToken cancellationToken = default);
}

public interface IAttendanceDevice : IDevice
{
    Task<IReadOnlyList<AttendanceLog>> GetAttendanceLogsAsync(
        DateTimeOffset? from = null,
        DateTimeOffset? to = null,
        CancellationToken cancellationToken = default);

    Task<DateTimeOffset> GetDeviceTimeAsync(CancellationToken cancellationToken = default);

    // Prepared for later — throw UnsupportedOperation until implemented.
    Task ClearAttendanceLogsAsync(CancellationToken cancellationToken = default);
    Task SetDeviceTimeAsync(DateTimeOffset utcTime, CancellationToken cancellationToken = default);
    Task RestartAsync(CancellationToken cancellationToken = default);
}

public interface IUserDirectoryDevice : IDevice
{
    Task<IReadOnlyList<DeviceUser>> GetUsersAsync(CancellationToken cancellationToken = default);
    Task AddUserAsync(DeviceUser user, CancellationToken cancellationToken = default);
    Task UpdateUserAsync(DeviceUser user, CancellationToken cancellationToken = default);
    Task DeleteUserAsync(string userId, CancellationToken cancellationToken = default);
}

public interface IRfidDevice : IDevice
{
    Task<string?> ReadCardAsync(CancellationToken cancellationToken = default);
}

public interface IBarcodeScanner : IDevice
{
    Task<string?> ReadBarcodeAsync(CancellationToken cancellationToken = default);
}

public interface IWeightScale : IDevice
{
    Task<decimal> ReadWeightAsync(CancellationToken cancellationToken = default);
}
