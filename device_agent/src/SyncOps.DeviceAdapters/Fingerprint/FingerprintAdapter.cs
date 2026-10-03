using Microsoft.Extensions.Logging;
using SyncOps.DeviceSDK.Core;
using SyncOps.DeviceSDK.Models;

namespace SyncOps.DeviceAdapters.Fingerprint;

public sealed class FingerprintAdapterOptions
{
    public bool MockMode { get; set; }
}

public sealed class FingerprintAdapter : IDeviceAdapter
{
    private readonly FingerprintAdapterOptions _options;
    private readonly ILoggerFactory _loggerFactory;

    public FingerprintAdapter(FingerprintAdapterOptions options, ILoggerFactory loggerFactory)
    {
        _options = options;
        _loggerFactory = loggerFactory;
    }

    public string AdapterId => "fingerprint-mock";
    public string Manufacturer => "mock";
    public IReadOnlyList<DeviceType> SupportedDeviceTypes { get; } = [DeviceType.Fingerprint];

    public bool CanHandle(DeviceInfo candidate) =>
        candidate.Type == DeviceType.Fingerprint ||
        (candidate.Id?.Contains("fingerprint", StringComparison.OrdinalIgnoreCase) ?? false);

    public Task<IReadOnlyList<DeviceInfo>> DiscoverAsync(
        DiscoveryRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!_options.MockMode && !request.IncludeMocks)
            return Task.FromResult<IReadOnlyList<DeviceInfo>>(Array.Empty<DeviceInfo>());

        DeviceInfo[] devices =
        [
            new DeviceInfo
            {
                Id = "fingerprint-mock",
                Type = DeviceType.Fingerprint,
                Name = "Mock Fingerprint Reader",
                Manufacturer = "mock",
                Model = "Mock",
                Status = DeviceOnlineStatus.Mock,
                ConnectionState = DeviceConnectionState.Mock,
                ConnectionType = ConnectionType.Mock,
                AdapterId = AdapterId,
                Capabilities =
                [
                    new DeviceCapability { Kind = DeviceCapabilityKind.FingerprintScan, Name = "scan" },
                    new DeviceCapability { Kind = DeviceCapabilityKind.FingerprintVerify, Name = "verify" }
                ]
            }
        ];
        return Task.FromResult<IReadOnlyList<DeviceInfo>>(devices);
    }

    public Task<IDevice> CreateDeviceAsync(
        DeviceInfo info,
        DeviceConnection? connection = null,
        CancellationToken cancellationToken = default)
    {
        IDevice device = new MockFingerprintDevice(info, _loggerFactory.CreateLogger<MockFingerprintDevice>());
        return Task.FromResult(device);
    }
}

public sealed class MockFingerprintDevice : IFingerprintDevice
{
    private readonly DeviceInfo _info;
    private readonly ILogger _logger;

    public MockFingerprintDevice(DeviceInfo info, ILogger logger)
    {
        _info = info;
        _logger = logger;
    }

    public string DeviceId => _info.Id;
    public string Manufacturer => _info.Manufacturer;
    public string Model => _info.Model;
    public DeviceType DeviceType => DeviceType.Fingerprint;
    public DeviceConnectionState ConnectionState { get; private set; } = DeviceConnectionState.Mock;
    public string AdapterId => "fingerprint-mock";

    public Task ConnectAsync(DeviceConnection connection, CancellationToken cancellationToken = default)
    {
        ConnectionState = DeviceConnectionState.Mock;
        return Task.CompletedTask;
    }

    public Task DisconnectAsync(CancellationToken cancellationToken = default)
    {
        ConnectionState = DeviceConnectionState.Disconnected;
        return Task.CompletedTask;
    }

    public Task<bool> TestConnectionAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(ConnectionState == DeviceConnectionState.Mock);

    public Task<DeviceInfo> GetInfoAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(_info);

    public Task<DeviceStatus> GetStatusAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(new DeviceStatus
        {
            DeviceId = DeviceId,
            OnlineStatus = DeviceOnlineStatus.Mock,
            ConnectionState = ConnectionState,
            State = "ready"
        });

    public Task<IReadOnlyList<DeviceCapability>> GetCapabilitiesAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(_info.Capabilities);

    public Task<FingerprintScanResult> ScanAsync(CancellationToken cancellationToken = default)
    {
        var templateId = "mock-" + Guid.NewGuid().ToString("N")[..8];
        _logger.LogInformation("Mock fingerprint scan completed on {DeviceId} templateId={TemplateId}", DeviceId, templateId);
        return Task.FromResult(new FingerprintScanResult
        {
            Success = true,
            Message = "Mock scan completed",
            TemplateId = templateId,
            Template = System.Text.Encoding.UTF8.GetBytes(templateId)
        });
    }

    public Task<FingerprintVerifyResult> VerifyAsync(byte[] template, CancellationToken cancellationToken = default)
    {
        if (template is null || template.Length == 0)
        {
            return Task.FromResult(new FingerprintVerifyResult
            {
                Success = false,
                Matched = false,
                Message = "Template is required."
            });
        }

        _logger.LogInformation("Mock fingerprint verify on {DeviceId} (template length omitted from logs)", DeviceId);
        return Task.FromResult(new FingerprintVerifyResult
        {
            Success = true,
            Matched = true,
            Message = "Mock verification matched"
        });
    }
}
