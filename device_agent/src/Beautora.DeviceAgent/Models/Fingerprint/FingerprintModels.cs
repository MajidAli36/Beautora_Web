namespace Beautora.DeviceAgent.Models.Fingerprint;

public sealed class FingerprintDeviceInfo
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required string Vendor { get; init; }
    public bool IsConnected { get; init; }
    public bool IsMock { get; init; }
}

public sealed class FingerprintScanResult
{
    public bool Success { get; init; }
    public string Message { get; init; } = "";
    /// <summary>Opaque template id / mock id — never log the raw template.</summary>
    public string? TemplateId { get; init; }
    public byte[]? Template { get; init; }
}

public sealed class FingerprintVerificationResult
{
    public bool Success { get; init; }
    public bool Matched { get; init; }
    public string Message { get; init; } = "";
}
