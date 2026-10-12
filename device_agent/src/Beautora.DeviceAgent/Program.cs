using Beautora.DeviceAgent.Api;
using Beautora.DeviceAgent.Configuration;
using Beautora.DeviceAgent.Devices.DeviceDiscovery;
using Beautora.DeviceAgent.Devices.DeviceManager;
using Beautora.DeviceAgent.Hosting;
using Beautora.DeviceAgent.Security;
using Beautora.DeviceAgent.Services.Attendance;
using Beautora.DeviceAgent.Services.Drawer;
using Beautora.DeviceAgent.Services.Fingerprint;
using Beautora.DeviceAgent.Services.Printer;
using Microsoft.Extensions.Logging;
using SyncOps.DeviceAdapters.CashDrawers;
using SyncOps.DeviceAdapters.Fingerprint;
using SyncOps.DeviceAdapters.Printers;
using SyncOps.DeviceAdapters.ZKTeco;
using SyncOps.DeviceSDK.Cloud;
using SyncOps.DeviceSDK.Core;
using SyncOps.DeviceSDK.Discovery;
using SyncOps.DeviceSDK.Manager;
using SyncOps.DeviceSDK.Registry;
using CompatDeviceManager = Beautora.DeviceAgent.Devices.DeviceManager.DeviceManager;
using SdkDeviceManager = SyncOps.DeviceSDK.Manager.DeviceManager;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseWindowsService(options =>
{
    options.ServiceName = "SyncOps Device Agent";
});

// Single-file Windows Service: EventLog provider can crash startup (missing AccessControl).
// Keep console + debug; service lifetime still comes from UseWindowsService.
builder.Logging.ClearProviders();
builder.Logging.AddSimpleConsole(o =>
{
    o.SingleLine = true;
    o.TimestampFormat = "HH:mm:ss ";
});
builder.Logging.AddDebug();

builder.Services.Configure<DeviceAgentOptions>(builder.Configuration.GetSection(DeviceAgentOptions.SectionName));
builder.Services.Configure<CloudDeviceOptions>(builder.Configuration.GetSection(CloudDeviceOptions.SectionName));

// Always resolve cloud URL (production default https://www.beautora.app; env BEAUTORA_APP_URL wins).
builder.Services.PostConfigure<DeviceAgentOptions>(opts =>
{
    opts.Beautora.AppUrl = BeautoraCloudUrls.Resolve(opts.Beautora.AppUrl);
    if (opts.LeanMode)
    {
        opts.EnableTray = false;
        if (opts.DiscoveryIntervalMinutes < 10)
            opts.DiscoveryIntervalMinutes = 15;
    }
});
builder.Services.PostConfigure<CloudDeviceOptions>(opts =>
{
    if (string.IsNullOrWhiteSpace(opts.BaseUrl))
        opts.BaseUrl = BeautoraCloudUrls.Production;
    else
        opts.BaseUrl = BeautoraCloudUrls.Normalize(opts.BaseUrl);
});

var agentOptions = builder.Configuration.GetSection(DeviceAgentOptions.SectionName).Get<DeviceAgentOptions>()
                   ?? new DeviceAgentOptions();
agentOptions.Beautora.AppUrl = BeautoraCloudUrls.Resolve(agentOptions.Beautora.AppUrl);
var cloudOptions = builder.Configuration.GetSection(CloudDeviceOptions.SectionName).Get<CloudDeviceOptions>()
                   ?? new CloudDeviceOptions();
if (string.IsNullOrWhiteSpace(cloudOptions.BaseUrl))
    cloudOptions.BaseUrl = BeautoraCloudUrls.Production;

builder.WebHost.UseUrls(agentOptions.ListenUrl);

builder.Services.AddCors(options =>
{
    options.AddPolicy("BeautoraOrigins", policy =>
    {
        // Open mode: any browser / LAN origin can call the agent.
        if (agentOptions.DisableSecurity)
        {
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
            return;
        }

        policy.WithOrigins(agentOptions.AllowedOrigins.Length > 0
                ? agentOptions.AllowedOrigins
                : [BeautoraCloudUrls.Production, "https://beautora.app", "http://localhost:3000"])
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// --- Legacy Beautora services (backward compatible HTTP API) ---
builder.Services.AddSingleton<WindowsPrinterService>();
builder.Services.AddSingleton<IPrinterService>(sp => sp.GetRequiredService<WindowsPrinterService>());
builder.Services.AddSingleton<IDrawerService, PrinterDrawerService>();
builder.Services.AddSingleton<MockFingerprintService>();
builder.Services.AddSingleton<ZktecoFingerprintService>();
builder.Services.AddSingleton<DigitalPersonaService>();
builder.Services.AddSingleton<IFingerprintService, CompositeFingerprintService>();
builder.Services.AddSingleton<IDeviceDiscoveryService, WindowsDeviceDiscoveryService>();
builder.Services.AddSingleton<Beautora.DeviceAgent.Devices.DeviceManager.IDeviceManager, CompatDeviceManager>();

// --- SyncOps Device SDK platform ---
builder.Services.AddSingleton<DeviceDiscoveryEngine>();
builder.Services.AddSingleton<IDeviceRegistry>(sp =>
{
    var opts = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<DeviceAgentOptions>>().Value;
    var path = opts.RegistryDatabasePath;
    if (!Path.IsPathRooted(path))
        path = Path.Combine(builder.Environment.ContentRootPath, path);
    return new SqliteDeviceRegistry(path);
});

builder.Services.AddSingleton(sp =>
{
    var opts = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<DeviceAgentOptions>>().Value;
    return new PrinterAdapterOptions { MockMode = opts.MockMode, DefaultPrinterId = opts.DefaultPrinterId };
});
builder.Services.AddSingleton(sp =>
{
    var opts = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<DeviceAgentOptions>>().Value;
    return new CashDrawerAdapterOptions { MockMode = opts.MockMode, DefaultDrawerPrinterId = opts.DefaultDrawerPrinterId };
});
builder.Services.AddSingleton(sp =>
{
    var opts = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<DeviceAgentOptions>>().Value;
    return new FingerprintAdapterOptions { MockMode = opts.MockMode };
});
builder.Services.AddSingleton(sp =>
{
    var opts = sp.GetRequiredService<Microsoft.Extensions.Options.IOptions<DeviceAgentOptions>>().Value;
    return new ZktecoAdapterOptions
    {
        // Printers/fingerprint can stay mock; ZK real IPs use push-buffer regardless.
        MockMode = opts.MockMode,
        ProtocolMode = string.IsNullOrWhiteSpace(opts.Zkteco.ProtocolMode)
            ? "push-buffer"
            : opts.Zkteco.ProtocolMode,
        Host = opts.Zkteco.Host,
        Port = opts.Zkteco.Port,
        TimeoutMs = opts.Zkteco.TimeoutMs,
        EnableKnownEndpointDiscovery = opts.Zkteco.Enabled
    };
});

builder.Services.AddSingleton<PrinterAdapter>();
builder.Services.AddSingleton<CashDrawerAdapter>();
builder.Services.AddSingleton<FingerprintAdapter>();
builder.Services.AddSingleton<ZktecoAdapter>();

builder.Services.AddSingleton<SyncOps.DeviceSDK.Core.IDeviceManager>(sp =>
{
    var discovery = sp.GetRequiredService<DeviceDiscoveryEngine>();
    discovery.AddProvider(new KnownEndpointDiscoveryProvider());

    var manager = new SdkDeviceManager(
        discovery,
        sp.GetRequiredService<IDeviceRegistry>(),
        sp.GetRequiredService<ILogger<SdkDeviceManager>>());

    manager.RegisterAdapter(sp.GetRequiredService<PrinterAdapter>());
    manager.RegisterAdapter(sp.GetRequiredService<CashDrawerAdapter>());
    manager.RegisterAdapter(sp.GetRequiredService<FingerprintAdapter>());

    var zkOpts = sp.GetRequiredService<ZktecoAdapterOptions>();
    if (zkOpts.EnableKnownEndpointDiscovery || zkOpts.MockMode)
        manager.RegisterAdapter(sp.GetRequiredService<ZktecoAdapter>());

    return manager;
});

builder.Services.AddSingleton<ICloudDeviceChannel>(sp =>
{
    if (!cloudOptions.Enabled)
        return new NullCloudDeviceChannel();
    return new HttpCloudDeviceChannel(cloudOptions);
});

builder.Services.AddHttpClient("BeautoraAttendance", client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
});
builder.Services.AddSingleton<IBeautoraAttendanceBridge, BeautoraAttendanceBridge>();

builder.Services.AddHostedService<DeviceAgentHostedService>();
builder.Services.AddHostedService<TrayHostedService>();
builder.Services.AddHostedService<SyncOpsPlatformHostedService>();
builder.Services.AddHostedService<BeautoraAttendanceSyncHostedService>();
builder.Services.AddHostedService<ZktecoRealtimeWatchHostedService>();

var app = builder.Build();

app.UseCors("BeautoraOrigins");
app.UseMiddleware<AdmsRequestProbeMiddleware>();
app.UseMiddleware<AgentAuthMiddleware>();
app.MapAgentEndpoints();
app.MapSyncOpsDeviceEndpoints();
app.MapBeautoraAttendanceEndpoints();
app.MapZktecoAdmsEndpoints();

var lanIp = Beautora.DeviceAgent.Security.LanAddressHelper.GetPreferredLanIPv4() ?? "192.168.1.100";
var resolvedCloud = BeautoraCloudUrls.Resolve(agentOptions.Beautora.AppUrl);
app.Logger.LogWarning(
    "{Agent} listening on {Url} | Cloud DB/API → {CloudUrl} | DisableSecurity={Open} | ZK Cloud Server → {LanIp}:{Port} Proxy=OFF",
    agentOptions.AgentName,
    agentOptions.ListenUrl,
    resolvedCloud,
    agentOptions.DisableSecurity,
    lanIp,
    agentOptions.Port);
if (agentOptions.DisableSecurity)
    app.Logger.LogWarning("SECURITY OFF — LAN can hit all routes (API key + localhost lock disabled). Set DisableSecurity=false later.");

// Windows Service: slightly lower CPU priority so salon POS stays snappy.
if (!Environment.UserInteractive)
{
    try
    {
        System.Diagnostics.Process.GetCurrentProcess().PriorityClass =
            System.Diagnostics.ProcessPriorityClass.BelowNormal;
    }
    catch
    {
        /* ignore if not allowed */
    }
}

app.Run();

public partial class Program;
