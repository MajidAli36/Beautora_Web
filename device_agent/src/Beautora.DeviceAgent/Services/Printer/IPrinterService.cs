using Beautora.DeviceAgent.Models.Printer;

namespace Beautora.DeviceAgent.Services.Printer;

public interface IPrinterService
{
    Task<IEnumerable<PrinterInfo>> GetPrintersAsync(CancellationToken cancellationToken = default);
    Task<PrintResult> PrintAsync(PrintRequest request, CancellationToken cancellationToken = default);
    Task<PrinterStatus> GetStatusAsync(string printerId, CancellationToken cancellationToken = default);
    Task<bool> TestPrintAsync(string printerId, CancellationToken cancellationToken = default);
}
