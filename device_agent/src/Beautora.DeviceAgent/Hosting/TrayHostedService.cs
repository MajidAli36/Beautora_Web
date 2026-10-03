using System.Windows.Forms;
using Beautora.DeviceAgent.Configuration;
using Beautora.DeviceAgent.Devices.DeviceManager;
using Microsoft.Extensions.Options;

namespace Beautora.DeviceAgent.Hosting;

/// <summary>
/// Optional system tray status UI when running interactively (not as a Windows Service session 0).
/// </summary>
public sealed class TrayHostedService : IHostedService
{
    private readonly IServiceProvider _services;
    private readonly DeviceAgentOptions _options;
    private readonly ILogger<TrayHostedService> _logger;
    private Thread? _uiThread;
    private NotifyIcon? _icon;
    private ContextMenuStrip? _menu;

    public TrayHostedService(
        IServiceProvider services,
        IOptions<DeviceAgentOptions> options,
        ILogger<TrayHostedService> logger)
    {
        _services = services;
        _options = options.Value;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        if (!_options.EnableTray)
            return Task.CompletedTask;

        if (!Environment.UserInteractive)
        {
            _logger.LogInformation("Tray disabled (non-interactive session / Windows Service).");
            return Task.CompletedTask;
        }

        _uiThread = new Thread(RunTray)
        {
            IsBackground = true,
            Name = "SyncOps.DeviceAgent.Tray"
        };
        _uiThread.SetApartmentState(ApartmentState.STA);
        _uiThread.Start();
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        try
        {
            if (_icon is not null)
            {
                _icon.Visible = false;
                _icon.Dispose();
            }
            _menu?.Dispose();
        }
        catch
        {
            /* ignore */
        }
        return Task.CompletedTask;
    }

    private void RunTray()
    {
        Application.SetHighDpiMode(HighDpiMode.SystemAware);
        Application.EnableVisualStyles();

        _menu = new ContextMenuStrip();
        _menu.Items.Add(_options.AgentName, null, (_, _) => { });
        _menu.Items.Add($"Listening: {_options.ListenUrl}", null, (_, _) => { });
        _menu.Items.Add(new ToolStripSeparator());
        // Tray talks to the local HTTP agent rather than owning hardware directly.
        _menu.Items.Add("Refresh devices", null, async (_, _) =>
        {
            try
            {
                using var http = CreateLocalClient();
                await http.PostAsync("/api/devices/discover", new StringContent("{}", System.Text.Encoding.UTF8, "application/json"));
                using var scope = _services.CreateScope();
                await scope.ServiceProvider.GetRequiredService<IDeviceManager>().RefreshAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Tray refresh failed");
            }
        });
        _menu.Items.Add("Open health", null, (_, _) =>
        {
            try
            {
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                {
                    FileName = $"{_options.ListenUrl}/api/health",
                    UseShellExecute = true
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Open health failed");
            }
        });
        _menu.Items.Add(new ToolStripSeparator());
        _menu.Items.Add("Exit", null, (_, _) =>
        {
            var lifetime = _services.GetRequiredService<IHostApplicationLifetime>();
            lifetime.StopApplication();
            Application.Exit();
        });

        _icon = new NotifyIcon
        {
            Text = $"{_options.AgentName}\n{_options.ListenUrl}",
            Visible = true,
            ContextMenuStrip = _menu,
            Icon = SystemIcons.Application
        };

        _icon.DoubleClick += (_, _) =>
        {
            MessageBox.Show(
                $"{_options.AgentName}\n\nStatus: Running\n{_options.ListenUrl}\nMockMode: {_options.MockMode}",
                _options.AgentName,
                MessageBoxButtons.OK,
                MessageBoxIcon.Information);
        };

        Application.Run();
    }

    private HttpClient CreateLocalClient()
    {
        var http = new HttpClient { BaseAddress = new Uri(_options.ListenUrl) };
        http.DefaultRequestHeaders.Add(Security.LocalApiAuthentication.HeaderName, _options.ApiKey);
        return http;
    }
}
