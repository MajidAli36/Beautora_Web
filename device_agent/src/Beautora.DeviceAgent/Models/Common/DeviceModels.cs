namespace Beautora.DeviceAgent.Models.Common;

public enum DeviceType
{
    Printer,
    Drawer,
    Fingerprint
}

public enum DeviceOnlineStatus
{
    Online,
    Offline,
    Unknown,
    Mock
}

public sealed class DeviceInfo
{
    public required string Id { get; init; }
    public required DeviceType Type { get; init; }
    public required string Name { get; init; }
    public required DeviceOnlineStatus Status { get; init; }
    public string? Detail { get; init; }
}

public sealed class AgentInfo
{
    public required string Version { get; init; }
    public required string Status { get; init; }
    public bool MockMode { get; init; }
}

public sealed class DevicesResponse
{
    public required AgentInfo Agent { get; init; }
    public required IReadOnlyList<DeviceInfo> Devices { get; init; }
}

public sealed class ApiResult
{
    public bool Success { get; init; }
    public string Message { get; init; } = "";

    public static ApiResult Ok(string message) => new() { Success = true, Message = message };
    public static ApiResult Fail(string message) => new() { Success = false, Message = message };
}
