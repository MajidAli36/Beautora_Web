namespace SyncOps.DeviceSDK.Exceptions;

public enum DeviceErrorCode
{
    DeviceNotFound = 1,
    ConnectionFailed = 2,
    AuthenticationFailed = 3,
    Timeout = 4,
    UnsupportedOperation = 5,
    ProtocolError = 6,
    HardwareError = 7,
    PermissionDenied = 8,
    DeviceBusy = 9,
    InvalidArgument = 10,
    Cancelled = 11,
    Unknown = 99
}

public class DeviceException : Exception
{
    public DeviceErrorCode ErrorCode { get; }
    public string? DeviceId { get; }

    public DeviceException(DeviceErrorCode errorCode, string message, string? deviceId = null, Exception? inner = null)
        : base(message, inner)
    {
        ErrorCode = errorCode;
        DeviceId = deviceId;
    }
}

public sealed class DeviceConnectionException : DeviceException
{
    public DeviceConnectionException(string message, string? deviceId = null, Exception? inner = null)
        : base(DeviceErrorCode.ConnectionFailed, message, deviceId, inner)
    {
    }
}

public sealed class DeviceProtocolException : DeviceException
{
    public DeviceProtocolException(string message, string? deviceId = null, Exception? inner = null)
        : base(DeviceErrorCode.ProtocolError, message, deviceId, inner)
    {
    }

    public DeviceProtocolException(DeviceErrorCode code, string message, string? deviceId = null, Exception? inner = null)
        : base(code, message, deviceId, inner)
    {
    }
}
