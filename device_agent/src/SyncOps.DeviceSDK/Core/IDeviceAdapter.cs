using SyncOps.DeviceSDK.Models;

namespace SyncOps.DeviceSDK.Core;

/// <summary>
/// Factory/provider for a manufacturer or protocol family.
/// Creates device instances; does not expose vendor SDK types.
/// </summary>
public interface IDeviceAdapter
{
    string AdapterId { get; }
    string Manufacturer { get; }
    IReadOnlyList<DeviceType> SupportedDeviceTypes { get; }

    bool CanHandle(DeviceInfo candidate);

    Task<IReadOnlyList<DeviceInfo>> DiscoverAsync(
        DiscoveryRequest request,
        CancellationToken cancellationToken = default);

    Task<IDevice> CreateDeviceAsync(
        DeviceInfo info,
        DeviceConnection? connection = null,
        CancellationToken cancellationToken = default);
}

public sealed class DiscoveryRequest
{
    /// <summary>Explicit known endpoints (preferred). Never scan arbitrary networks by default.</summary>
    public IReadOnlyList<DeviceConnection> KnownEndpoints { get; init; } = Array.Empty<DeviceConnection>();

    /// <summary>Optional CIDR, e.g. 192.168.1.0/24. Must be explicitly configured.</summary>
    public string? IpRangeCidr { get; init; }

    public int? Port { get; init; }
    public bool IncludeMocks { get; init; }
    public int MaxConcurrency { get; init; } = 16;
    public int TimeoutMs { get; init; } = 1000;
}
