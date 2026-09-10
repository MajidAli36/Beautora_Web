using Beautora.DeviceAgent.Models.Printer;
using Microsoft.Extensions.Options;
using Beautora.DeviceAgent.Configuration;

namespace Beautora.DeviceAgent.Services.Printer;

/// <summary>
/// Thin alias for Epson-oriented deployments. Uses the same Windows raw path;
/// vendor SDK integration can replace this later without changing the API.
/// </summary>
public sealed class EpsonPrinterService : IPrinterService
{
    private readonly WindowsPrinterService _inner;

    public EpsonPrinterService(IOptions<DeviceAgentOptions> options, ILogger<WindowsPrinterService> logger)
    {
        _inner = new WindowsPrinterService(options, logger);
    }

    public Task<IEnumerable<PrinterInfo>> GetPrintersAsync(CancellationToken cancellationToken = default) =>
        _inner.GetPrintersAsync(cancellationToken);

    public Task<PrintResult> PrintAsync(PrintRequest request, CancellationToken cancellationToken = default) =>
        _inner.PrintAsync(request, cancellationToken);

    public Task<PrinterStatus> GetStatusAsync(string printerId, CancellationToken cancellationToken = default) =>
        _inner.GetStatusAsync(printerId, cancellationToken);

    public Task<bool> TestPrintAsync(string printerId, CancellationToken cancellationToken = default) =>
        _inner.TestPrintAsync(printerId, cancellationToken);
}

/// <summary>ESC/POS-focused facade over Windows raw printing.</summary>
public sealed class EscPosPrinterService : IPrinterService
{
    private readonly WindowsPrinterService _inner;

    public EscPosPrinterService(IOptions<DeviceAgentOptions> options, ILogger<WindowsPrinterService> logger)
    {
        _inner = new WindowsPrinterService(options, logger);
    }

    public Task<IEnumerable<PrinterInfo>> GetPrintersAsync(CancellationToken cancellationToken = default) =>
        _inner.GetPrintersAsync(cancellationToken);

    public Task<PrintResult> PrintAsync(PrintRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.ContentType) ||
            request.ContentType.Equals("text", StringComparison.OrdinalIgnoreCase))
        {
            // Keep text supported; callers may still send escpos-base64.
        }
        return _inner.PrintAsync(request, cancellationToken);
    }

    public Task<PrinterStatus> GetStatusAsync(string printerId, CancellationToken cancellationToken = default) =>
        _inner.GetStatusAsync(printerId, cancellationToken);

    public Task<bool> TestPrintAsync(string printerId, CancellationToken cancellationToken = default) =>
        _inner.TestPrintAsync(printerId, cancellationToken);
}
