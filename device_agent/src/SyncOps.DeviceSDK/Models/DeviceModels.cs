namespace SyncOps.DeviceSDK.Models;

public sealed class DeviceConnection
{
    public ConnectionType ConnectionType { get; init; } = ConnectionType.Unknown;
    public string? Host { get; init; }
    public int? Port { get; init; }
    public string? PathOrName { get; init; }
    public string? SerialPort { get; init; }
    public int BaudRate { get; init; } = 115200;
    public string? Username { get; init; }
    public string? Password { get; init; }
    public int TimeoutMs { get; init; } = 5000;
    public IReadOnlyDictionary<string, string>? Properties { get; init; }
}

public sealed class DeviceCapability
{
    public required DeviceCapabilityKind Kind { get; init; }
    public string Name { get; init; } = "";
    public bool IsSupported { get; init; } = true;
    public string? Notes { get; init; }
}

public sealed class DeviceInfo
{
    public required string Id { get; init; }
    public required DeviceType Type { get; init; }
    public required string Name { get; init; }
    public string Manufacturer { get; init; } = "";
    public string Model { get; init; } = "";
    public string? SerialNumber { get; init; }
    public string? FirmwareVersion { get; init; }
    public DeviceOnlineStatus Status { get; init; } = DeviceOnlineStatus.Unknown;
    public DeviceConnectionState ConnectionState { get; init; } = DeviceConnectionState.Disconnected;
    public ConnectionType ConnectionType { get; init; } = ConnectionType.Unknown;
    public string? Host { get; init; }
    public int? Port { get; init; }
    public string? AdapterId { get; init; }
    public string? Detail { get; init; }
    public IReadOnlyList<DeviceCapability> Capabilities { get; init; } = Array.Empty<DeviceCapability>();
    public DateTimeOffset? LastSeenUtc { get; init; }
}

public sealed class DeviceStatus
{
    public required string DeviceId { get; init; }
    public DeviceOnlineStatus OnlineStatus { get; init; } = DeviceOnlineStatus.Unknown;
    public DeviceConnectionState ConnectionState { get; init; } = DeviceConnectionState.Disconnected;
    public string State { get; init; } = "unknown";
    public string? Message { get; init; }
    public DateTimeOffset TimestampUtc { get; init; } = DateTimeOffset.UtcNow;
}

public sealed class PrintJob
{
    public string? PrinterId { get; init; }
    public PrintContentType ContentType { get; init; } = PrintContentType.Text;
    public string Content { get; init; } = "";
    public int Copies { get; init; } = 1;
}

public sealed class PrintJobResult
{
    public bool Success { get; init; }
    public string Message { get; init; } = "";
    public string? JobId { get; init; }

    public static PrintJobResult Ok(string message, string? jobId = null) =>
        new() { Success = true, Message = message, JobId = jobId };

    public static PrintJobResult Fail(string message) =>
        new() { Success = false, Message = message };
}

public sealed class DrawerOpenResult
{
    public bool Success { get; init; }
    public string Message { get; init; } = "";

    public static DrawerOpenResult Ok(string message) => new() { Success = true, Message = message };
    public static DrawerOpenResult Fail(string message) => new() { Success = false, Message = message };
}

public sealed class DeviceUser
{
    public required string UserId { get; init; }
    public string? Name { get; init; }
    public string? CardNumber { get; init; }
    public int Privilege { get; init; }
    public bool Enabled { get; init; } = true;
    public IReadOnlyDictionary<string, string>? Properties { get; init; }
}

public sealed class AttendanceLog
{
    public required string UserId { get; init; }
    public DateTimeOffset Timestamp { get; init; }
    public int? VerifyMode { get; init; }
    public int? InOutMode { get; init; }
    public int? WorkCode { get; init; }
    public string? DeviceId { get; init; }
}

public sealed class FingerprintScanResult
{
    public bool Success { get; init; }
    public string Message { get; init; } = "";
    public string? TemplateId { get; init; }
    /// <summary>Raw template bytes — never log this.</summary>
    public byte[]? Template { get; init; }
}

public sealed class FingerprintVerifyResult
{
    public bool Success { get; init; }
    public bool Matched { get; init; }
    public string Message { get; init; } = "";
}

public sealed class RegisteredDevice
{
    public required string Id { get; init; }
    public string Manufacturer { get; init; } = "";
    public string Model { get; init; } = "";
    public string? SerialNumber { get; init; }
    public DeviceType DeviceType { get; init; }
    public string? Host { get; init; }
    public int? Port { get; init; }
    public ConnectionType ConnectionType { get; init; }
    public DateTimeOffset? LastSeenUtc { get; init; }
    public string Status { get; init; } = "unknown";
    public string AdapterId { get; init; } = "";
    public string ConfigurationJson { get; init; } = "{}";
    public string CapabilitiesJson { get; init; } = "[]";
}
