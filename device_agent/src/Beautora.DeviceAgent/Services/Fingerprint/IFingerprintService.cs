using Beautora.DeviceAgent.Models.Fingerprint;

namespace Beautora.DeviceAgent.Services.Fingerprint;

public interface IFingerprintService
{
    Task<IEnumerable<FingerprintDeviceInfo>> GetDevicesAsync(CancellationToken cancellationToken = default);
    Task<FingerprintScanResult> ScanAsync(string deviceId, CancellationToken cancellationToken = default);
    Task<FingerprintVerificationResult> VerifyAsync(
        string deviceId,
        byte[] template,
        CancellationToken cancellationToken = default);
}
