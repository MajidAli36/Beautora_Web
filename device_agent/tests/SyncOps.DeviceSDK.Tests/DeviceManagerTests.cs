using Microsoft.Extensions.Logging.Abstractions;
using SyncOps.DeviceSDK.Core;
using SyncOps.DeviceSDK.Discovery;
using SyncOps.DeviceSDK.Exceptions;
using SyncOps.DeviceSDK.Manager;
using SyncOps.DeviceSDK.Models;
using SyncOps.DeviceSDK.Registry;

namespace SyncOps.DeviceSDK.Tests;

public class DeviceManagerTests
{
    private static DeviceManager CreateManager(params IDeviceAdapter[] adapters)
    {
        var discovery = new DeviceDiscoveryEngine(NullLogger<DeviceDiscoveryEngine>.Instance);
        var manager = new DeviceManager(discovery, new InMemoryDeviceRegistry(), NullLogger<DeviceManager>.Instance);
        foreach (var a in adapters)
            manager.RegisterAdapter(a);
        return manager;
    }

    [Fact]
    public async Task Discover_RegistersDevices()
    {
        var fp = new SyncOps.DeviceAdapters.Fingerprint.FingerprintAdapter(
            new SyncOps.DeviceAdapters.Fingerprint.FingerprintAdapterOptions { MockMode = true },
            NullLoggerFactory.Instance);

        var manager = CreateManager(fp);
        var devices = await manager.DiscoverAsync(new DiscoveryRequest { IncludeMocks = true });
        Assert.Contains(devices, d => d.Id == "fingerprint-mock");
    }

    [Fact]
    public async Task UnsupportedCapability_Throws()
    {
        var fp = new SyncOps.DeviceAdapters.Fingerprint.FingerprintAdapter(
            new SyncOps.DeviceAdapters.Fingerprint.FingerprintAdapterOptions { MockMode = true },
            NullLoggerFactory.Instance);
        var manager = CreateManager(fp);
        await manager.DiscoverAsync(new DiscoveryRequest { IncludeMocks = true });
        await manager.ConnectAsync("fingerprint-mock");

        await Assert.ThrowsAsync<DeviceException>(async () =>
            await manager.GetRequiredCapabilityAsync<IPrintableDevice>("fingerprint-mock"));
    }

    [Fact]
    public async Task ConnectUnknown_ThrowsDeviceNotFound()
    {
        var manager = CreateManager();
        var ex = await Assert.ThrowsAsync<DeviceException>(() => manager.ConnectAsync("missing-device"));
        Assert.Equal(DeviceErrorCode.DeviceNotFound, ex.ErrorCode);
    }
}

public class RegistryTests
{
    [Fact]
    public async Task InMemory_UpsertAndGet()
    {
        var reg = new InMemoryDeviceRegistry();
        await reg.UpsertAsync(new RegisteredDevice
        {
            Id = "d1",
            Manufacturer = "Test",
            Model = "M",
            DeviceType = DeviceType.Printer,
            AdapterId = "a"
        });
        var got = await reg.GetAsync("d1");
        Assert.NotNull(got);
        Assert.Equal("Test", got!.Manufacturer);
    }

    [Fact]
    public async Task Sqlite_UpsertAndGet()
    {
        var path = Path.Combine(Path.GetTempPath(), "syncops-test-" + Guid.NewGuid().ToString("N") + ".db");
        try
        {
            var reg = new SqliteDeviceRegistry(path);
            await reg.UpsertAsync(new RegisteredDevice
            {
                Id = "zk-1",
                Manufacturer = "ZKTeco",
                Model = "Standalone",
                DeviceType = DeviceType.AttendanceTerminal,
                Host = "192.168.1.201",
                Port = 4370,
                AdapterId = "zkteco-standalone"
            });
            var all = await reg.GetAllAsync();
            Assert.Single(all);
            Assert.Equal(4370, all[0].Port);
        }
        finally
        {
            try { File.Delete(path); } catch { /* ignore */ }
        }
    }
}

public class ErrorModelTests
{
    [Fact]
    public void DeviceException_CarriesCode()
    {
        var ex = new DeviceConnectionException("fail", "dev-1");
        Assert.Equal(DeviceErrorCode.ConnectionFailed, ex.ErrorCode);
        Assert.Equal("dev-1", ex.DeviceId);
    }
}
