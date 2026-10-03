using Microsoft.Extensions.Logging;
using SyncOps.DeviceAdapters.Printers;
using SyncOps.DeviceSDK.Core;
using SyncOps.DeviceSDK.Models;

namespace SyncOps.DeviceAdapters.CashDrawers;

public sealed class CashDrawerAdapterOptions
{
    public bool MockMode { get; set; }
    public string DefaultDrawerPrinterId { get; set; } = "";
}

public sealed class CashDrawerAdapter : IDeviceAdapter
{
    private readonly CashDrawerAdapterOptions _options;
    private readonly PrinterAdapter _printers;
    private readonly ILoggerFactory _loggerFactory;

    public CashDrawerAdapter(
        CashDrawerAdapterOptions options,
        PrinterAdapter printers,
        ILoggerFactory loggerFactory)
    {
        _options = options;
        _printers = printers;
        _loggerFactory = loggerFactory;
    }

    public string AdapterId => "cashdrawers-printer-kick";
    public string Manufacturer => "Generic";
    public IReadOnlyList<DeviceType> SupportedDeviceTypes { get; } = [DeviceType.CashDrawer];

    public bool CanHandle(DeviceInfo candidate) =>
        candidate.Type == DeviceType.CashDrawer ||
        string.Equals(candidate.AdapterId, AdapterId, StringComparison.OrdinalIgnoreCase) ||
        (candidate.Id?.StartsWith("drawer-", StringComparison.OrdinalIgnoreCase) ?? false);

    public async Task<IReadOnlyList<DeviceInfo>> DiscoverAsync(
        DiscoveryRequest request,
        CancellationToken cancellationToken = default)
    {
        var printers = await _printers.DiscoverAsync(request, cancellationToken).ConfigureAwait(false);
        var drawers = printers.Select(p => new DeviceInfo
        {
            Id = "drawer-" + p.Id.Replace("printer-", "", StringComparison.OrdinalIgnoreCase),
            Type = DeviceType.CashDrawer,
            Name = $"Cash drawer via {p.Name}",
            Manufacturer = "Generic",
            Model = "PrinterKick",
            Status = p.Status,
            ConnectionType = p.ConnectionType,
            AdapterId = AdapterId,
            Detail = p.Id,
            Capabilities =
            [
                new DeviceCapability { Kind = DeviceCapabilityKind.CashDrawer, Name = "open", IsSupported = true }
            ]
        }).ToList();

        if (_options.MockMode && drawers.Count == 0)
        {
            drawers.Add(new DeviceInfo
            {
                Id = "drawer-mock",
                Type = DeviceType.CashDrawer,
                Name = "Mock Cash Drawer",
                Manufacturer = "mock",
                Model = "Mock",
                Status = DeviceOnlineStatus.Mock,
                ConnectionState = DeviceConnectionState.Mock,
                ConnectionType = ConnectionType.Mock,
                AdapterId = AdapterId,
                Detail = "printer-mock",
                Capabilities =
                [
                    new DeviceCapability { Kind = DeviceCapabilityKind.CashDrawer, Name = "open", IsSupported = true }
                ]
            });
        }

        return drawers;
    }

    public Task<IDevice> CreateDeviceAsync(
        DeviceInfo info,
        DeviceConnection? connection = null,
        CancellationToken cancellationToken = default)
    {
        IDevice device = new PrinterKickCashDrawerDevice(
            info, _options, _loggerFactory.CreateLogger<PrinterKickCashDrawerDevice>());
        return Task.FromResult(device);
    }
}

public sealed class PrinterKickCashDrawerDevice : ICashDrawerDevice
{
    private readonly DeviceInfo _info;
    private readonly CashDrawerAdapterOptions _options;
    private readonly ILogger _logger;

    public PrinterKickCashDrawerDevice(DeviceInfo info, CashDrawerAdapterOptions options, ILogger logger)
    {
        _info = info;
        _options = options;
        _logger = logger;
    }

    public string DeviceId => _info.Id;
    public string Manufacturer => _info.Manufacturer;
    public string Model => _info.Model;
    public DeviceType DeviceType => DeviceType.CashDrawer;
    public DeviceConnectionState ConnectionState { get; private set; } = DeviceConnectionState.Disconnected;
    public string AdapterId => "cashdrawers-printer-kick";

    public Task ConnectAsync(DeviceConnection connection, CancellationToken cancellationToken = default)
    {
        ConnectionState = _options.MockMode || _info.ConnectionType == ConnectionType.Mock
            ? DeviceConnectionState.Mock
            : DeviceConnectionState.Connected;
        return Task.CompletedTask;
    }

    public Task DisconnectAsync(CancellationToken cancellationToken = default)
    {
        ConnectionState = DeviceConnectionState.Disconnected;
        return Task.CompletedTask;
    }

    public Task<bool> TestConnectionAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(ConnectionState is DeviceConnectionState.Connected or DeviceConnectionState.Mock);

    public Task<DeviceInfo> GetInfoAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(_info);

    public Task<DeviceStatus> GetStatusAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(new DeviceStatus
        {
            DeviceId = DeviceId,
            OnlineStatus = ConnectionState == DeviceConnectionState.Mock ? DeviceOnlineStatus.Mock :
                ConnectionState == DeviceConnectionState.Connected ? DeviceOnlineStatus.Online : DeviceOnlineStatus.Offline,
            ConnectionState = ConnectionState,
            State = ConnectionState == DeviceConnectionState.Disconnected ? "offline" : "ready"
        });

    public Task<IReadOnlyList<DeviceCapability>> GetCapabilitiesAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(_info.Capabilities);

    public Task<DrawerOpenResult> OpenDrawerAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            if (_options.MockMode || _info.ConnectionType == ConnectionType.Mock || _info.Detail == "printer-mock")
            {
                _logger.LogInformation("Mock drawer opened: {DrawerId}", DeviceId);
                return Task.FromResult(DrawerOpenResult.Ok("Drawer opened (mock)"));
            }

            // Detail holds linked printer id; resolve name from installed printers via id slug is imperfect.
            // Prefer Detail as printer name if it doesn't start with printer-, else strip prefix heuristic.
            var printerName = ResolvePrinterName(_info.Detail) ?? ExtractPrinterNameFromLabel(_info.Name);
            if (string.IsNullOrWhiteSpace(printerName))
                return Task.FromResult(DrawerOpenResult.Fail("Linked printer not found for drawer."));

            RawPrinterHelper.SendBytes(printerName, RawPrinterHelper.CashDrawerKick);
            _logger.LogInformation("Drawer open command sent via {Printer}", printerName);
            return Task.FromResult(DrawerOpenResult.Ok("Drawer open signal sent"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Drawer open failed for {DrawerId}", DeviceId);
            return Task.FromResult(DrawerOpenResult.Fail($"Drawer open failed: {ex.Message}"));
        }
    }

    private static string? ExtractPrinterNameFromLabel(string? name)
    {
        const string prefix = "Cash drawer via ";
        if (string.IsNullOrWhiteSpace(name) || !name.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            return null;
        return name[prefix.Length..].Trim();
    }

    private static string? ResolvePrinterName(string? printerIdOrName)
    {
        if (string.IsNullOrWhiteSpace(printerIdOrName))
            return null;

        foreach (string name in System.Drawing.Printing.PrinterSettings.InstalledPrinters)
        {
            var id = PrinterAdapter.ToId(name);
            if (string.Equals(id, printerIdOrName, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(name, printerIdOrName, StringComparison.OrdinalIgnoreCase))
                return name;
        }

        return null;
    }
}
