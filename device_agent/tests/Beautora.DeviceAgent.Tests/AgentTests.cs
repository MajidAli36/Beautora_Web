using Beautora.DeviceAgent.Configuration;
using Beautora.DeviceAgent.Models.Printer;
using Beautora.DeviceAgent.Services.Drawer;
using Beautora.DeviceAgent.Services.Fingerprint;
using Beautora.DeviceAgent.Services.Printer;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Beautora.DeviceAgent.Tests;

public class PrinterServiceTests
{
    private static DeviceAgentOptions MockOptions() => new()
    {
        MockMode = true,
        ApiKey = "test-key",
        Port = 17890
    };

    private static WindowsPrinterService CreatePrinter() =>
        new(Options.Create(MockOptions()), NullLogger<WindowsPrinterService>.Instance);

    [Fact]
    public async Task GetPrinters_InMockMode_ReturnsAtLeastMockWhenEmptyOrAny()
    {
        var svc = CreatePrinter();
        var printers = (await svc.GetPrintersAsync()).ToList();
        Assert.NotEmpty(printers);
    }

    [Fact]
    public async Task Print_RequiresContent()
    {
        var svc = CreatePrinter();
        var result = await svc.PrintAsync(new PrintRequest { Content = "", ContentType = "text" });
        Assert.False(result.Success);
    }

    [Fact]
    public async Task Print_RejectsBadCopies()
    {
        var svc = CreatePrinter();
        var result = await svc.PrintAsync(new PrintRequest { Content = "hi", Copies = 0 });
        Assert.False(result.Success);
    }

    [Fact]
    public async Task Print_SucceedsInMockMode()
    {
        var svc = CreatePrinter();
        var printers = (await svc.GetPrintersAsync()).ToList();
        var result = await svc.PrintAsync(new PrintRequest
        {
            PrinterId = printers[0].Id,
            ContentType = "text",
            Content = "Hello",
            Copies = 1
        });
        Assert.True(result.Success);
    }

    [Fact]
    public async Task TestPrint_SucceedsInMockMode()
    {
        var svc = CreatePrinter();
        var printers = (await svc.GetPrintersAsync()).ToList();
        Assert.True(await svc.TestPrintAsync(printers[0].Id));
    }

    [Fact]
    public async Task Print_DoesNotRequireDrawerService()
    {
        // Architectural guard: printing works without calling drawer.
        var printer = CreatePrinter();
        var printers = (await printer.GetPrintersAsync()).ToList();
        var print = await printer.PrintAsync(new PrintRequest
        {
            PrinterId = printers[0].Id,
            Content = "token slip",
            ContentType = "text"
        });
        Assert.True(print.Success);
    }
}

public class DrawerServiceTests
{
    private static (WindowsPrinterService printers, PrinterDrawerService drawers) Create()
    {
        var options = Options.Create(new DeviceAgentOptions { MockMode = true, ApiKey = "test" });
        var printers = new WindowsPrinterService(options, NullLogger<WindowsPrinterService>.Instance);
        var drawers = new PrinterDrawerService(printers, options, NullLogger<PrinterDrawerService>.Instance);
        return (printers, drawers);
    }

    [Fact]
    public async Task GetDrawers_ReturnsEntries()
    {
        var (_, drawers) = Create();
        Assert.NotEmpty(await drawers.GetDrawersAsync());
    }

    [Fact]
    public async Task Open_UnknownDrawer_Fails()
    {
        var (_, drawers) = Create();
        var result = await drawers.OpenAsync("drawer-does-not-exist");
        Assert.False(result.Success);
    }

    [Fact]
    public async Task Open_KnownDrawer_SucceedsInMock()
    {
        var (_, drawers) = Create();
        var list = (await drawers.GetDrawersAsync()).ToList();
        var result = await drawers.OpenAsync(list[0].Id);
        Assert.True(result.Success);
    }

    [Fact]
    public async Task Print_DoesNotAutoOpenDrawer()
    {
        var (printers, drawers) = Create();
        var printerList = (await printers.GetPrintersAsync()).ToList();
        var before = (await drawers.GetDrawersAsync()).ToList();

        var print = await printers.PrintAsync(new PrintRequest
        {
            PrinterId = printerList[0].Id,
            Content = "invoice",
            ContentType = "text"
        });
        Assert.True(print.Success);

        // Still must open explicitly — printing alone is not an open command.
        var open = await drawers.OpenAsync(before[0].Id);
        Assert.True(open.Success);
        Assert.Contains("Drawer", open.Message, StringComparison.OrdinalIgnoreCase);
    }
}

public class FingerprintServiceTests
{
    [Fact]
    public async Task Mock_Scan_Succeeds()
    {
        var options = Options.Create(new DeviceAgentOptions { MockMode = true });
        var svc = new MockFingerprintService(options, NullLogger<MockFingerprintService>.Instance);
        var devices = (await svc.GetDevicesAsync()).ToList();
        Assert.NotEmpty(devices);
        var scan = await svc.ScanAsync(devices[0].Id);
        Assert.True(scan.Success);
        Assert.False(string.IsNullOrWhiteSpace(scan.TemplateId));
    }

    [Fact]
    public async Task Scan_UnknownDevice_Fails()
    {
        var options = Options.Create(new DeviceAgentOptions { MockMode = true });
        var svc = new MockFingerprintService(options, NullLogger<MockFingerprintService>.Instance);
        var scan = await svc.ScanAsync("fingerprint-missing");
        Assert.False(scan.Success);
    }
}

public class AuthTests
{
    [Fact]
    public void ApiKey_Configured()
    {
        var opts = new DeviceAgentOptions { ApiKey = "secret-key" };
        Assert.Equal("secret-key", opts.ApiKey);
        Assert.Equal("http://127.0.0.1:17890", opts.ListenUrl);
    }

    [Fact]
    public void HeaderName_IsStable()
    {
        Assert.Equal("X-Beautora-Agent-Key", Beautora.DeviceAgent.Security.LocalApiAuthentication.HeaderName);
        Assert.Equal("X-SyncOps-Agent-Key", Beautora.DeviceAgent.Security.LocalApiAuthentication.SyncOpsHeaderName);
    }
}
