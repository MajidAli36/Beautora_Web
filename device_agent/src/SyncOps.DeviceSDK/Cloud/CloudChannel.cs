using SyncOps.DeviceSDK.Exceptions;

namespace SyncOps.DeviceSDK.Cloud;

/// <summary>
/// Phase 12 scaffolding — cloud channel for remote device registry/sync.
/// No business/POS logic. HTTPS/WebSocket only.
/// </summary>
public interface ICloudDeviceChannel
{
    bool IsEnabled { get; }
    Task ConnectAsync(CancellationToken cancellationToken = default);
    Task DisconnectAsync(CancellationToken cancellationToken = default);
    Task ReportHeartbeatAsync(CancellationToken cancellationToken = default);
    Task ReportDeviceInventoryAsync(CancellationToken cancellationToken = default);
}

public sealed class CloudDeviceOptions
{
    public const string SectionName = "SyncOpsCloud";

    public bool Enabled { get; set; }
    public string BaseUrl { get; set; } = "";
    public string AgentId { get; set; } = "";
    public string AgentToken { get; set; } = "";
    public int HeartbeatIntervalSeconds { get; set; } = 60;
}

/// <summary>No-op cloud channel used when cloud is disabled.</summary>
public sealed class NullCloudDeviceChannel : ICloudDeviceChannel
{
    public bool IsEnabled => false;
    public Task ConnectAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task DisconnectAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task ReportHeartbeatAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
    public Task ReportDeviceInventoryAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
}

/// <summary>
/// Stub HTTPS cloud client. Does not invent APIs — methods throw UnsupportedOperation
/// until SyncOps Cloud contract is finalized.
/// </summary>
public sealed class HttpCloudDeviceChannel : ICloudDeviceChannel
{
    private readonly CloudDeviceOptions _options;

    public HttpCloudDeviceChannel(CloudDeviceOptions options)
    {
        _options = options;
    }

    public bool IsEnabled => _options.Enabled && !string.IsNullOrWhiteSpace(_options.BaseUrl);

    public Task ConnectAsync(CancellationToken cancellationToken = default)
    {
        if (!IsEnabled)
            return Task.CompletedTask;

        // TODO: establish HTTPS session / WebSocket once SyncOps Cloud contract exists.
        throw new DeviceException(
            DeviceErrorCode.UnsupportedOperation,
            "SyncOps Cloud channel is enabled but the remote contract is not implemented yet.");
    }

    public Task DisconnectAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;

    public Task ReportHeartbeatAsync(CancellationToken cancellationToken = default)
    {
        if (!IsEnabled) return Task.CompletedTask;
        throw new DeviceException(
            DeviceErrorCode.UnsupportedOperation,
            "Cloud heartbeat not implemented yet.");
    }

    public Task ReportDeviceInventoryAsync(CancellationToken cancellationToken = default)
    {
        if (!IsEnabled) return Task.CompletedTask;
        throw new DeviceException(
            DeviceErrorCode.UnsupportedOperation,
            "Cloud inventory sync not implemented yet.");
    }
}
