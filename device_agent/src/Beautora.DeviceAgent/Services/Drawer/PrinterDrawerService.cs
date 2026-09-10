using Beautora.DeviceAgent.Configuration;
using Beautora.DeviceAgent.Infrastructure;
using Beautora.DeviceAgent.Models.Drawer;
using Beautora.DeviceAgent.Services.Printer;
using Microsoft.Extensions.Options;

namespace Beautora.DeviceAgent.Services.Drawer;

/// <summary>
/// Opens a cash drawer via the receipt printer kick port (ESC/POS pulse).
/// Must ONLY run when explicitly requested — never as a side effect of printing.
/// </summary>
public sealed class PrinterDrawerService : IDrawerService
{
    private readonly IPrinterService _printers;
    private readonly DeviceAgentOptions _options;
    private readonly ILogger<PrinterDrawerService> _logger;

    public PrinterDrawerService(
        IPrinterService printers,
        IOptions<DeviceAgentOptions> options,
        ILogger<PrinterDrawerService> logger)
    {
        _printers = printers;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<IEnumerable<DrawerInfo>> GetDrawersAsync(CancellationToken cancellationToken = default)
    {
        var printers = (await _printers.GetPrintersAsync(cancellationToken)).ToList();
        var drawers = printers.Select(p => new DrawerInfo
        {
            Id = "drawer-" + p.Id.Replace("printer-", "", StringComparison.OrdinalIgnoreCase),
            Name = $"Cash drawer via {p.Name}",
            PrinterId = p.Id,
            IsReady = p.IsOnline,
            Connection = "printer-kick"
        }).ToList();

        if (_options.MockMode && drawers.Count == 0)
        {
            drawers.Add(new DrawerInfo
            {
                Id = "drawer-mock",
                Name = "Mock Cash Drawer",
                PrinterId = "printer-mock",
                IsReady = true,
                Connection = "mock"
            });
        }

        return drawers;
    }

    public async Task<DrawerResult> OpenAsync(string drawerId, CancellationToken cancellationToken = default)
    {
        var drawers = (await GetDrawersAsync(cancellationToken)).ToList();
        var drawer = drawers.FirstOrDefault(d =>
            string.Equals(d.Id, drawerId, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(d.PrinterId, drawerId, StringComparison.OrdinalIgnoreCase));

        if (drawer is null && !string.IsNullOrWhiteSpace(_options.DefaultDrawerPrinterId))
        {
            drawer = drawers.FirstOrDefault(d =>
                string.Equals(d.PrinterId, _options.DefaultDrawerPrinterId, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(d.Id, _options.DefaultDrawerPrinterId, StringComparison.OrdinalIgnoreCase));
        }

        if (drawer is null)
            return DrawerResult.Fail($"Drawer not found: {drawerId}");

        try
        {
            if (_options.MockMode || drawer.Connection == "mock")
            {
                _logger.LogInformation("Mock drawer opened: {DrawerId}", drawer.Id);
                return DrawerResult.Ok("Drawer opened (mock)");
            }

            var printers = (await _printers.GetPrintersAsync(cancellationToken)).ToList();
            var printer = printers.FirstOrDefault(p =>
                string.Equals(p.Id, drawer.PrinterId, StringComparison.OrdinalIgnoreCase));
            if (printer is null)
                return DrawerResult.Fail("Linked printer not found for drawer.");

            RawPrinterHelper.SendBytes(printer.Name, RawPrinterHelper.CashDrawerKick);
            _logger.LogInformation("Drawer open command sent via {Printer}", printer.Name);
            return DrawerResult.Ok("Drawer open signal sent");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Drawer open failed for {DrawerId}", drawer.Id);
            return DrawerResult.Fail($"Drawer open failed: {ex.Message}");
        }
    }

    public async Task<DrawerStatus> GetStatusAsync(string drawerId, CancellationToken cancellationToken = default)
    {
        var drawers = (await GetDrawersAsync(cancellationToken)).ToList();
        var drawer = drawers.FirstOrDefault(d =>
            string.Equals(d.Id, drawerId, StringComparison.OrdinalIgnoreCase));

        if (drawer is null)
        {
            return new DrawerStatus
            {
                DrawerId = drawerId,
                Name = drawerId,
                IsReady = false,
                State = "not_found"
            };
        }

        return new DrawerStatus
        {
            DrawerId = drawer.Id,
            Name = drawer.Name,
            IsReady = drawer.IsReady,
            State = drawer.IsReady ? "ready" : "offline"
        };
    }
}
