using Beautora.DeviceAgent.Models.Common;
using Beautora.DeviceAgent.Services.Drawer;
using Beautora.DeviceAgent.Services.Fingerprint;
using Beautora.DeviceAgent.Services.Printer;

namespace Beautora.DeviceAgent.Devices.DeviceDiscovery;

public sealed class WindowsDeviceDiscoveryService : IDeviceDiscoveryService
{
    private readonly IPrinterService _printers;
    private readonly IDrawerService _drawers;
    private readonly IFingerprintService _fingerprints;

    public WindowsDeviceDiscoveryService(
        IPrinterService printers,
        IDrawerService drawers,
        IFingerprintService fingerprints)
    {
        _printers = printers;
        _drawers = drawers;
        _fingerprints = fingerprints;
    }

    public async Task<IReadOnlyList<DeviceInfo>> DiscoverAsync(CancellationToken cancellationToken = default)
    {
        var devices = new List<DeviceInfo>();

        foreach (var p in await _printers.GetPrintersAsync(cancellationToken))
        {
            devices.Add(new DeviceInfo
            {
                Id = p.Id,
                Type = DeviceType.Printer,
                Name = p.Name,
                Status = p.IsOnline ? DeviceOnlineStatus.Online : DeviceOnlineStatus.Offline,
                Detail = p.Driver
            });
        }

        foreach (var d in await _drawers.GetDrawersAsync(cancellationToken))
        {
            devices.Add(new DeviceInfo
            {
                Id = d.Id,
                Type = DeviceType.Drawer,
                Name = d.Name,
                Status = d.IsReady ? DeviceOnlineStatus.Online : DeviceOnlineStatus.Offline,
                Detail = d.Connection
            });
        }

        foreach (var f in await _fingerprints.GetDevicesAsync(cancellationToken))
        {
            devices.Add(new DeviceInfo
            {
                Id = f.Id,
                Type = DeviceType.Fingerprint,
                Name = f.Name,
                Status = f.IsMock
                    ? DeviceOnlineStatus.Mock
                    : f.IsConnected ? DeviceOnlineStatus.Online : DeviceOnlineStatus.Offline,
                Detail = f.Vendor
            });
        }

        return devices;
    }
}
