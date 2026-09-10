using Beautora.DeviceAgent.Configuration;
using Beautora.DeviceAgent.Models.Fingerprint;
using Microsoft.Extensions.Options;

namespace Beautora.DeviceAgent.Services.Fingerprint;

/// <summary>
/// Development/mock fingerprint service. Not production biometric capture.
/// </summary>
public sealed class MockFingerprintService : IFingerprintService
{
    private readonly DeviceAgentOptions _options;
    private readonly ILogger<MockFingerprintService> _logger;

    public MockFingerprintService(IOptions<DeviceAgentOptions> options, ILogger<MockFingerprintService> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public Task<IEnumerable<FingerprintDeviceInfo>> GetDevicesAsync(CancellationToken cancellationToken = default)
    {
        IEnumerable<FingerprintDeviceInfo> devices = _options.MockMode
            ?
            [
                new FingerprintDeviceInfo
                {
                    Id = "fingerprint-mock",
                    Name = "Mock Fingerprint Reader",
                    Vendor = "mock",
                    IsConnected = true,
                    IsMock = true
                }
            ]
            : [];

        return Task.FromResult(devices);
    }

    public async Task<FingerprintScanResult> ScanAsync(string deviceId, CancellationToken cancellationToken = default)
    {
        var devices = (await GetDevicesAsync(cancellationToken)).ToList();
        var device = devices.FirstOrDefault(d =>
            string.Equals(d.Id, deviceId, StringComparison.OrdinalIgnoreCase));

        if (device is null)
        {
            return new FingerprintScanResult
            {
                Success = false,
                Message = $"Fingerprint device not found: {deviceId}"
            };
        }

        if (!device.IsMock && !_options.MockMode)
        {
            return new FingerprintScanResult
            {
                Success = false,
                Message = "Real fingerprint SDK not configured. Enable MockMode or supply a vendor adapter."
            };
        }

        var templateId = "mock-" + Guid.NewGuid().ToString("N")[..8];
        // Do not log template bytes.
        _logger.LogInformation("Mock fingerprint scan completed on {DeviceId} templateId={TemplateId}", deviceId, templateId);

        return new FingerprintScanResult
        {
            Success = true,
            Message = "Mock scan completed",
            TemplateId = templateId,
            Template = System.Text.Encoding.UTF8.GetBytes(templateId)
        };
    }

    public Task<FingerprintVerificationResult> VerifyAsync(
        string deviceId,
        byte[] template,
        CancellationToken cancellationToken = default)
    {
        if (template is null || template.Length == 0)
        {
            return Task.FromResult(new FingerprintVerificationResult
            {
                Success = false,
                Matched = false,
                Message = "Template is required."
            });
        }

        _logger.LogInformation("Mock fingerprint verify on {DeviceId} (template length omitted from logs)", deviceId);
        return Task.FromResult(new FingerprintVerificationResult
        {
            Success = true,
            Matched = true,
            Message = "Mock verification matched"
        });
    }
}

/// <summary>
/// ZKTeco adapter placeholder. Wire vendor SDK here — do not invent APIs.
/// </summary>
public sealed class ZktecoFingerprintService : IFingerprintService
{
    private readonly MockFingerprintService _fallback;
    private readonly ILogger<ZktecoFingerprintService> _logger;

    public ZktecoFingerprintService(IOptions<DeviceAgentOptions> options, ILoggerFactory loggerFactory)
    {
        _fallback = new MockFingerprintService(options, loggerFactory.CreateLogger<MockFingerprintService>());
        _logger = loggerFactory.CreateLogger<ZktecoFingerprintService>();
    }

    public Task<IEnumerable<FingerprintDeviceInfo>> GetDevicesAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogWarning("ZKTeco SDK not linked — returning empty/mock devices only.");
        return _fallback.GetDevicesAsync(cancellationToken);
    }

    public Task<FingerprintScanResult> ScanAsync(string deviceId, CancellationToken cancellationToken = default) =>
        _fallback.ScanAsync(deviceId, cancellationToken);

    public Task<FingerprintVerificationResult> VerifyAsync(
        string deviceId,
        byte[] template,
        CancellationToken cancellationToken = default) =>
        _fallback.VerifyAsync(deviceId, template, cancellationToken);
}

/// <summary>
/// DigitalPersona / HID adapter placeholder. Wire vendor SDK here.
/// </summary>
public sealed class DigitalPersonaService : IFingerprintService
{
    private readonly MockFingerprintService _fallback;
    private readonly ILogger<DigitalPersonaService> _logger;

    public DigitalPersonaService(IOptions<DeviceAgentOptions> options, ILoggerFactory loggerFactory)
    {
        _fallback = new MockFingerprintService(options, loggerFactory.CreateLogger<MockFingerprintService>());
        _logger = loggerFactory.CreateLogger<DigitalPersonaService>();
    }

    public Task<IEnumerable<FingerprintDeviceInfo>> GetDevicesAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogWarning("DigitalPersona SDK not linked — returning empty/mock devices only.");
        return _fallback.GetDevicesAsync(cancellationToken);
    }

    public Task<FingerprintScanResult> ScanAsync(string deviceId, CancellationToken cancellationToken = default) =>
        _fallback.ScanAsync(deviceId, cancellationToken);

    public Task<FingerprintVerificationResult> VerifyAsync(
        string deviceId,
        byte[] template,
        CancellationToken cancellationToken = default) =>
        _fallback.VerifyAsync(deviceId, template, cancellationToken);
}

/// <summary>Aggregates mock + vendor adapters for discovery.</summary>
public sealed class CompositeFingerprintService : IFingerprintService
{
    private readonly MockFingerprintService _mock;
    private readonly ZktecoFingerprintService _zkteco;
    private readonly DigitalPersonaService _digitalPersona;
    private readonly DeviceAgentOptions _options;

    public CompositeFingerprintService(
        MockFingerprintService mock,
        ZktecoFingerprintService zkteco,
        DigitalPersonaService digitalPersona,
        IOptions<DeviceAgentOptions> options)
    {
        _mock = mock;
        _zkteco = zkteco;
        _digitalPersona = digitalPersona;
        _options = options.Value;
    }

    public async Task<IEnumerable<FingerprintDeviceInfo>> GetDevicesAsync(CancellationToken cancellationToken = default)
    {
        var all = new List<FingerprintDeviceInfo>();
        if (_options.MockMode)
            all.AddRange(await _mock.GetDevicesAsync(cancellationToken));
        all.AddRange(await _zkteco.GetDevicesAsync(cancellationToken));
        all.AddRange(await _digitalPersona.GetDevicesAsync(cancellationToken));
        return all.DistinctBy(d => d.Id);
    }

    public async Task<FingerprintScanResult> ScanAsync(string deviceId, CancellationToken cancellationToken = default)
    {
        if (deviceId.Contains("mock", StringComparison.OrdinalIgnoreCase) || _options.MockMode)
            return await _mock.ScanAsync(deviceId, cancellationToken);
        if (deviceId.Contains("zk", StringComparison.OrdinalIgnoreCase))
            return await _zkteco.ScanAsync(deviceId, cancellationToken);
        if (deviceId.Contains("dp", StringComparison.OrdinalIgnoreCase) ||
            deviceId.Contains("digital", StringComparison.OrdinalIgnoreCase))
            return await _digitalPersona.ScanAsync(deviceId, cancellationToken);
        return await _mock.ScanAsync(deviceId, cancellationToken);
    }

    public Task<FingerprintVerificationResult> VerifyAsync(
        string deviceId,
        byte[] template,
        CancellationToken cancellationToken = default) =>
        _mock.VerifyAsync(deviceId, template, cancellationToken);
}
