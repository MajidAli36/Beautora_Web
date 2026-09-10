using Beautora.DeviceAgent.Api;
using Beautora.DeviceAgent.Configuration;
using Beautora.DeviceAgent.Devices.DeviceDiscovery;
using Beautora.DeviceAgent.Devices.DeviceManager;
using Beautora.DeviceAgent.Hosting;
using Beautora.DeviceAgent.Security;
using Beautora.DeviceAgent.Services.Drawer;
using Beautora.DeviceAgent.Services.Fingerprint;
using Beautora.DeviceAgent.Services.Printer;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseWindowsService(options =>
{
    options.ServiceName = "Beautora Device Agent";
});

builder.Services.Configure<DeviceAgentOptions>(builder.Configuration.GetSection(DeviceAgentOptions.SectionName));
var agentOptions = builder.Configuration.GetSection(DeviceAgentOptions.SectionName).Get<DeviceAgentOptions>()
                   ?? new DeviceAgentOptions();

builder.WebHost.UseUrls(agentOptions.ListenUrl);

builder.Services.AddCors(options =>
{
    options.AddPolicy("BeautoraOrigins", policy =>
    {
        policy.WithOrigins(agentOptions.AllowedOrigins.Length > 0
                ? agentOptions.AllowedOrigins
                : ["http://localhost:3000"])
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddSingleton<WindowsPrinterService>();
builder.Services.AddSingleton<IPrinterService>(sp => sp.GetRequiredService<WindowsPrinterService>());
builder.Services.AddSingleton<IDrawerService, PrinterDrawerService>();
builder.Services.AddSingleton<MockFingerprintService>();
builder.Services.AddSingleton<ZktecoFingerprintService>();
builder.Services.AddSingleton<DigitalPersonaService>();
builder.Services.AddSingleton<IFingerprintService, CompositeFingerprintService>();
builder.Services.AddSingleton<IDeviceDiscoveryService, WindowsDeviceDiscoveryService>();
builder.Services.AddSingleton<IDeviceManager, DeviceManager>();
builder.Services.AddHostedService<DeviceAgentHostedService>();
builder.Services.AddHostedService<TrayHostedService>();

var app = builder.Build();

app.UseCors("BeautoraOrigins");
app.UseMiddleware<AgentAuthMiddleware>();
app.MapAgentEndpoints();

app.Logger.LogInformation("Beautora Device Agent listening on {Url}", agentOptions.ListenUrl);
app.Run();

public partial class Program;
