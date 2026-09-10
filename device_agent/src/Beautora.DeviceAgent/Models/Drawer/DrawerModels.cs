namespace Beautora.DeviceAgent.Models.Drawer;

public sealed class DrawerInfo
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required string PrinterId { get; init; }
    public bool IsReady { get; init; }
    public string Connection { get; init; } = "printer-kick";
}

public sealed class DrawerResult
{
    public bool Success { get; init; }
    public string Message { get; init; } = "";

    public static DrawerResult Ok(string message) => new() { Success = true, Message = message };
    public static DrawerResult Fail(string message) => new() { Success = false, Message = message };
}

public sealed class DrawerStatus
{
    public required string DrawerId { get; init; }
    public required string Name { get; init; }
    public bool IsReady { get; init; }
    public string State { get; init; } = "unknown";
}
