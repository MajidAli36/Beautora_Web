using Microsoft.Extensions.Logging.Abstractions;
using SyncOps.DeviceAdapters.ZKTeco;
using SyncOps.DeviceAdapters.ZKTeco.Protocol;
using SyncOps.DeviceSDK.Core;
using SyncOps.DeviceSDK.Exceptions;
using SyncOps.DeviceSDK.Models;

namespace SyncOps.DeviceAdapters.ZKTeco.Tests;

public class MockZktecoProtocolTests
{
    [Fact]
    public async Task Connect_GetInfo_Users_Attendance_Time()
    {
        await using var protocol = new MockZktecoProtocol();
        await protocol.ConnectAsync("127.0.0.1", 4370, 1000);
        Assert.True(await protocol.TestConnectionAsync());

        var info = await protocol.GetDeviceInfoAsync();
        Assert.Equal("MOCK-ZK-0001", info.SerialNumber);

        var users = await protocol.GetUsersAsync();
        Assert.NotEmpty(users);

        var logs = await protocol.GetAttendanceLogsAsync(null, null);
        Assert.NotEmpty(logs);

        var time = await protocol.GetDeviceTimeAsync();
        Assert.True(time > DateTimeOffset.UtcNow.AddDays(-1));
    }

    [Fact]
    public async Task Operations_RequireConnect()
    {
        await using var protocol = new MockZktecoProtocol();
        await Assert.ThrowsAsync<DeviceConnectionException>(() => protocol.GetUsersAsync());
    }
}

public class ZktecoAdapterTests
{
    [Fact]
    public async Task Discover_IncludesMockAndKnownEndpoint()
    {
        var adapter = new ZktecoAdapter(new ZktecoAdapterOptions
        {
            MockMode = true,
            ProtocolMode = "mock",
            Host = "192.168.1.201",
            Port = 4370,
            EnableKnownEndpointDiscovery = true
        }, NullLoggerFactory.Instance);

        var devices = await adapter.DiscoverAsync(new DiscoveryRequest());
        Assert.Contains(devices, d => d.Id == "zkteco-mock");
        Assert.Contains(devices, d => d.Id.Contains("192.168.1.201"));
    }

    [Fact]
    public async Task MockDevice_FullHappyPath()
    {
        var adapter = new ZktecoAdapter(new ZktecoAdapterOptions
        {
            MockMode = true,
            ProtocolMode = "mock"
        }, NullLoggerFactory.Instance);

        var devices = await adapter.DiscoverAsync(new DiscoveryRequest());
        var mock = devices.First(d => d.Id == "zkteco-mock");
        var device = (ZktecoDevice)await adapter.CreateDeviceAsync(mock);
        await device.ConnectAsync(new DeviceConnection { Host = "127.0.0.1", Port = 4370 });

        Assert.True(await device.TestConnectionAsync());
        var info = await device.GetInfoAsync();
        Assert.Equal("ZKTeco", info.Manufacturer);

        var users = await device.GetUsersAsync();
        Assert.NotEmpty(users);

        var logs = await device.GetAttendanceLogsAsync();
        Assert.NotEmpty(logs);

        _ = await device.GetDeviceTimeAsync();
        await device.DisconnectAsync();
    }

    [Fact]
    public async Task VendorSdkProtocol_ReportsUnsupported()
    {
        await using var protocol = new ZktecoVendorSdkProtocol();
        var ex = await Assert.ThrowsAsync<DeviceException>(() => protocol.ConnectAsync("192.168.1.201", 4370, 1000));
        Assert.Equal(DeviceErrorCode.UnsupportedOperation, ex.ErrorCode);
    }
}

/// <summary>
/// Opt-in hardware integration test. Set SYNCOPS_ZKTECO_INTEGRATION=1 to enable.
/// Requires reachable device at 192.168.1.201:4370.
/// </summary>
public class ZktecoHardwareIntegrationTests
{
    private static bool Enabled =>
        string.Equals(Environment.GetEnvironmentVariable("SYNCOPS_ZKTECO_INTEGRATION"), "1", StringComparison.Ordinal);

    [Fact]
    public async Task TcpProbe_Connects_WhenEnabled()
    {
        if (!Enabled)
        {
            // Skip without failing CI.
            return;
        }

        await using var protocol = new ZktecoTcpProbeProtocol();
        await protocol.ConnectAsync("192.168.1.201", 4370, 5000);
        Assert.True(await protocol.TestConnectionAsync());
        var info = await protocol.GetDeviceInfoAsync();
        Assert.Contains("TCP", info.Model ?? "", StringComparison.OrdinalIgnoreCase);
    }
}
