using System.Drawing.Printing;
using System.Text;
using Beautora.DeviceAgent.Configuration;
using Beautora.DeviceAgent.Infrastructure;
using Beautora.DeviceAgent.Models.Printer;
using Microsoft.Extensions.Options;

namespace Beautora.DeviceAgent.Services.Printer;

/// <summary>
/// Windows spooler-backed printer service. Prints ONLY caller-supplied content.
/// Does not open the cash drawer.
/// </summary>
public sealed class WindowsPrinterService : IPrinterService
{
    private readonly DeviceAgentOptions _options;
    private readonly ILogger<WindowsPrinterService> _logger;

    public WindowsPrinterService(IOptions<DeviceAgentOptions> options, ILogger<WindowsPrinterService> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public Task<IEnumerable<PrinterInfo>> GetPrintersAsync(CancellationToken cancellationToken = default)
    {
        var list = new List<PrinterInfo>();
        foreach (string name in PrinterSettings.InstalledPrinters)
        {
            list.Add(new PrinterInfo
            {
                Id = ToId(name),
                Name = name,
                IsDefault = string.Equals(name, new PrinterSettings().PrinterName, StringComparison.OrdinalIgnoreCase),
                IsOnline = true,
                Driver = "windows"
            });
        }

        if (_options.MockMode && list.Count == 0)
        {
            list.Add(new PrinterInfo
            {
                Id = "printer-mock",
                Name = "Mock Receipt Printer",
                IsDefault = true,
                IsOnline = true,
                Driver = "mock"
            });
        }

        return Task.FromResult<IEnumerable<PrinterInfo>>(list);
    }

    public async Task<PrintResult> PrintAsync(PrintRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Copies < 1 || request.Copies > 10)
            return PrintResult.Fail("Copies must be between 1 and 10.");

        if (string.IsNullOrWhiteSpace(request.Content))
            return PrintResult.Fail("Content is required.");

        var printers = (await GetPrintersAsync(cancellationToken)).ToList();
        var printer = ResolvePrinter(printers, request.PrinterId);
        if (printer is null)
            return PrintResult.Fail($"Printer not found: {request.PrinterId ?? "(default)"}");

        var contentType = (request.ContentType ?? "text").Trim().ToLowerInvariant();
        var jobId = Guid.NewGuid().ToString("N")[..12];

        try
        {
            for (var i = 0; i < request.Copies; i++)
            {
                cancellationToken.ThrowIfCancellationRequested();

                if (_options.MockMode || printer.Driver == "mock")
                {
                    _logger.LogInformation(
                        "Mock print job {JobId} → {Printer} type={Type} len={Len}",
                        jobId, printer.Name, contentType, request.Content.Length);
                    continue;
                }

                switch (contentType)
                {
                    case "text":
                        RawPrinterHelper.SendText(printer.Name, request.Content);
                        break;
                    case "escpos":
                    case "escpos-base64":
                    case "escpos_base64":
                    {
                        var bytes = Convert.FromBase64String(request.Content.Trim());
                        RawPrinterHelper.SendBytes(printer.Name, bytes);
                        break;
                    }
                    default:
                        return PrintResult.Fail($"Unsupported contentType '{request.ContentType}'. Use text or escpos-base64.");
                }
            }

            // CRITICAL: do NOT open cash drawer here.
            _logger.LogInformation("Print job completed {JobId} on {Printer}", jobId, printer.Name);
            return PrintResult.Ok("Print job sent successfully", jobId);
        }
        catch (FormatException)
        {
            return PrintResult.Fail("Invalid base64 ESC/POS content.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Print failed on {Printer}", printer.Name);
            return PrintResult.Fail($"Print failed: {ex.Message}");
        }
    }

    public async Task<PrinterStatus> GetStatusAsync(string printerId, CancellationToken cancellationToken = default)
    {
        var printers = (await GetPrintersAsync(cancellationToken)).ToList();
        var printer = ResolvePrinter(printers, printerId);
        if (printer is null)
        {
            return new PrinterStatus
            {
                PrinterId = printerId,
                Name = printerId,
                IsOnline = false,
                State = "not_found"
            };
        }

        return new PrinterStatus
        {
            PrinterId = printer.Id,
            Name = printer.Name,
            IsOnline = printer.IsOnline,
            State = printer.IsOnline ? "ready" : "offline"
        };
    }

    public async Task<bool> TestPrintAsync(string printerId, CancellationToken cancellationToken = default)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Beautora Device Agent");
        sb.AppendLine("TEST PRINT");
        sb.AppendLine(DateTimeOffset.Now.ToString("u"));
        sb.AppendLine("----------------");
        sb.AppendLine("OK");
        sb.AppendLine();
        sb.AppendLine();

        var result = await PrintAsync(new PrintRequest
        {
            PrinterId = printerId,
            ContentType = "text",
            Content = sb.ToString(),
            Copies = 1
        }, cancellationToken);

        return result.Success;
    }

    private PrinterInfo? ResolvePrinter(IReadOnlyList<PrinterInfo> printers, string? printerId)
    {
        if (!string.IsNullOrWhiteSpace(printerId))
        {
            return printers.FirstOrDefault(p =>
                string.Equals(p.Id, printerId, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(p.Name, printerId, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(_options.DefaultPrinterId))
        {
            var configured = printers.FirstOrDefault(p =>
                string.Equals(p.Id, _options.DefaultPrinterId, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(p.Name, _options.DefaultPrinterId, StringComparison.OrdinalIgnoreCase));
            if (configured is not null) return configured;
        }

        return printers.FirstOrDefault(p => p.IsDefault) ?? printers.FirstOrDefault();
    }

    internal static string ToId(string name)
    {
        var slug = new string(name.ToLowerInvariant()
            .Select(ch => char.IsLetterOrDigit(ch) ? ch : '-')
            .ToArray());
        while (slug.Contains("--", StringComparison.Ordinal))
            slug = slug.Replace("--", "-", StringComparison.Ordinal);
        return "printer-" + slug.Trim('-');
    }
}
