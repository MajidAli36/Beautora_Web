namespace Beautora.DeviceAgent.Models.Printer;

public enum PrintContentType
{
    Text,
    EscPosBase64,
    EscPos
}

public sealed class PrinterInfo
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public bool IsDefault { get; init; }
    public bool IsOnline { get; init; }
    public string Driver { get; init; } = "windows";
}

public sealed class PrintRequest
{
    public string? PrinterId { get; set; }

    /// <summary>text | escpos | escpos-base64</summary>
    public string ContentType { get; set; } = "text";

    /// <summary>Plain text or base64 ESC/POS bytes depending on ContentType.</summary>
    public string Content { get; set; } = "";

    public int Copies { get; set; } = 1;
}

public sealed class PrintResult
{
    public bool Success { get; init; }
    public string Message { get; init; } = "";
    public string? JobId { get; init; }

    public static PrintResult Ok(string message, string? jobId = null) =>
        new() { Success = true, Message = message, JobId = jobId };

    public static PrintResult Fail(string message) =>
        new() { Success = false, Message = message };
}

public sealed class PrinterStatus
{
    public required string PrinterId { get; init; }
    public required string Name { get; init; }
    public bool IsOnline { get; init; }
    public string State { get; init; } = "unknown";
}
