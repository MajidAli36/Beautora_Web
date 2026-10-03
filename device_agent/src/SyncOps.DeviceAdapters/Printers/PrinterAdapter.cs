using System.Drawing.Printing;
using System.Text;
using Microsoft.Extensions.Logging;
using SyncOps.DeviceSDK.Core;
using SyncOps.DeviceSDK.Exceptions;
using SyncOps.DeviceSDK.Models;

namespace SyncOps.DeviceAdapters.Printers;

public sealed class PrinterAdapterOptions
{
    public bool MockMode { get; set; }
    public string DefaultPrinterId { get; set; } = "";
}

public class PrinterAdapter : IDeviceAdapter
{
    private readonly PrinterAdapterOptions _options;
    private readonly ILoggerFactory _loggerFactory;

    public PrinterAdapter(PrinterAdapterOptions options, ILoggerFactory loggerFactory)
    {
        _options = options;
        _loggerFactory = loggerFactory;
    }

    public string AdapterId => "printers-windows";
    public string Manufacturer => "Windows";
    public IReadOnlyList<DeviceType> SupportedDeviceTypes { get; } = [DeviceType.Printer];

    public bool CanHandle(DeviceInfo candidate) =>
        candidate.Type == DeviceType.Printer ||
        string.Equals(candidate.AdapterId, AdapterId, StringComparison.OrdinalIgnoreCase) ||
        (candidate.Id?.StartsWith("printer-", StringComparison.OrdinalIgnoreCase) ?? false);

    public Task<IReadOnlyList<DeviceInfo>> DiscoverAsync(
        DiscoveryRequest request,
        CancellationToken cancellationToken = default)
    {
        var list = new List<DeviceInfo>();
        foreach (string name in PrinterSettings.InstalledPrinters)
        {
            list.Add(CreateInfo(name, isMock: false));
        }

        if (_options.MockMode && list.Count == 0)
            list.Add(CreateInfo("Mock Receipt Printer", isMock: true));

        return Task.FromResult<IReadOnlyList<DeviceInfo>>(list);
    }

    public Task<IDevice> CreateDeviceAsync(
        DeviceInfo info,
        DeviceConnection? connection = null,
        CancellationToken cancellationToken = default)
    {
        IDevice device = new WindowsPrinterDevice(info, _options, _loggerFactory.CreateLogger<WindowsPrinterDevice>());
        return Task.FromResult(device);
    }

    public static string ToId(string name)
    {
        var slug = new string(name.ToLowerInvariant()
            .Select(ch => char.IsLetterOrDigit(ch) ? ch : '-')
            .ToArray());
        while (slug.Contains("--", StringComparison.Ordinal))
            slug = slug.Replace("--", "-", StringComparison.Ordinal);
        return "printer-" + slug.Trim('-');
    }

    private DeviceInfo CreateInfo(string name, bool isMock) => new()
    {
        Id = isMock ? "printer-mock" : ToId(name),
        Type = DeviceType.Printer,
        Name = name,
        Manufacturer = isMock ? "mock" : "Windows",
        Model = isMock ? "Mock" : "Spooler",
        Status = isMock ? DeviceOnlineStatus.Mock : DeviceOnlineStatus.Online,
        ConnectionState = isMock ? DeviceConnectionState.Mock : DeviceConnectionState.Disconnected,
        ConnectionType = isMock ? ConnectionType.Mock : ConnectionType.WindowsSpooler,
        AdapterId = AdapterId,
        Detail = isMock ? "mock" : "windows",
        Capabilities =
        [
            new DeviceCapability { Kind = DeviceCapabilityKind.Print, Name = "print", IsSupported = true }
        ]
    };
}

public sealed class WindowsPrinterDevice : IPrintableDevice
{
    private readonly DeviceInfo _info;
    private readonly PrinterAdapterOptions _options;
    private readonly ILogger _logger;

    public WindowsPrinterDevice(DeviceInfo info, PrinterAdapterOptions options, ILogger logger)
    {
        _info = info;
        _options = options;
        _logger = logger;
    }

    public string DeviceId => _info.Id;
    public string Manufacturer => _info.Manufacturer;
    public string Model => _info.Model;
    public DeviceType DeviceType => DeviceType.Printer;
    public DeviceConnectionState ConnectionState { get; private set; } = DeviceConnectionState.Disconnected;
    public string AdapterId => "printers-windows";

    public Task ConnectAsync(DeviceConnection connection, CancellationToken cancellationToken = default)
    {
        ConnectionState = _options.MockMode || _info.Detail == "mock"
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
            OnlineStatus = ConnectionState == DeviceConnectionState.Disconnected
                ? DeviceOnlineStatus.Offline
                : ConnectionState == DeviceConnectionState.Mock ? DeviceOnlineStatus.Mock : DeviceOnlineStatus.Online,
            ConnectionState = ConnectionState,
            State = ConnectionState == DeviceConnectionState.Disconnected ? "offline" : "ready"
        });

    public Task<IReadOnlyList<DeviceCapability>> GetCapabilitiesAsync(CancellationToken cancellationToken = default) =>
        Task.FromResult(_info.Capabilities);

    public Task<PrintJobResult> PrintAsync(PrintJob job, CancellationToken cancellationToken = default)
    {
        if (job.Copies < 1 || job.Copies > 10)
            return Task.FromResult(PrintJobResult.Fail("Copies must be between 1 and 10."));
        if (string.IsNullOrWhiteSpace(job.Content))
            return Task.FromResult(PrintJobResult.Fail("Content is required."));

        var jobId = Guid.NewGuid().ToString("N")[..12];
        var contentType = job.ContentType;

        try
        {
            for (var i = 0; i < job.Copies; i++)
            {
                cancellationToken.ThrowIfCancellationRequested();
                if (_options.MockMode || _info.Detail == "mock")
                {
                    _logger.LogInformation("Mock print job {JobId} → {Printer}", jobId, _info.Name);
                    continue;
                }

                switch (contentType)
                {
                    case PrintContentType.Text:
                        RawPrinterHelper.SendText(_info.Name, job.Content);
                        break;
                    case PrintContentType.EscPos:
                    case PrintContentType.EscPosBase64:
                        RawPrinterHelper.SendBytes(_info.Name, Convert.FromBase64String(job.Content.Trim()));
                        break;
                    default:
                        return Task.FromResult(PrintJobResult.Fail("Unsupported contentType."));
                }
            }

            // CRITICAL: do NOT open cash drawer here.
            return Task.FromResult(PrintJobResult.Ok("Print job sent successfully", jobId));
        }
        catch (FormatException)
        {
            return Task.FromResult(PrintJobResult.Fail("Invalid base64 ESC/POS content."));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Print failed on {Printer}", _info.Name);
            return Task.FromResult(PrintJobResult.Fail($"Print failed: {ex.Message}"));
        }
    }

    public async Task<bool> TestPrintAsync(CancellationToken cancellationToken = default)
    {
        var sb = new StringBuilder();
        sb.AppendLine("SyncOps Device Agent");
        sb.AppendLine("TEST PRINT");
        sb.AppendLine(DateTimeOffset.Now.ToString("u"));
        sb.AppendLine("----------------");
        sb.AppendLine("OK");
        sb.AppendLine();
        sb.AppendLine();

        var result = await PrintAsync(new PrintJob
        {
            ContentType = PrintContentType.Text,
            Content = sb.ToString(),
            Copies = 1
        }, cancellationToken).ConfigureAwait(false);
        return result.Success;
    }
}

/// <summary>ESC/POS-oriented alias over Windows raw printing.</summary>
public sealed class EscPosAdapter : PrinterAdapter
{
    public EscPosAdapter(PrinterAdapterOptions options, ILoggerFactory loggerFactory)
        : base(options, loggerFactory)
    {
    }
}
