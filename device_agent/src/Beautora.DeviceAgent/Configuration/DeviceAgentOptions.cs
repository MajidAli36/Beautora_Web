namespace Beautora.DeviceAgent.Configuration;

public sealed class DeviceAgentOptions
{
    public const string SectionName = "DeviceAgent";

    /// <summary>Loopback bind address. Must stay localhost for security.</summary>
    public string Host { get; set; } = "127.0.0.1";

    public int Port { get; set; } = 17890;

    /// <summary>Shared secret required on every device command.</summary>
    public string ApiKey { get; set; } = "SyncOps@12345";

    /// <summary>When true, hardware calls are simulated (safe for development).</summary>
    public bool MockMode { get; set; }

    public string[] AllowedOrigins { get; set; } =
    [
        BeautoraCloudUrls.Production,
        "https://beautora.app",
        "http://localhost:3000",
        "https://localhost:3000"
    ];

    public string DefaultPrinterId { get; set; } = "";

    /// <summary>Windows printer used for ESC/POS drawer kick when drawer is printer-attached.</summary>
    public string DefaultDrawerPrinterId { get; set; } = "";

    /// <summary>System tray UI. Keep false for Windows Service (saves RAM).</summary>
    public bool EnableTray { get; set; }

    /// <summary>
    /// Low-resource mode for always-on Windows Service: quieter logs, slower rediscovery,
    /// no tray, no Node TCP watcher unless explicitly enabled.
    /// </summary>
    public bool LeanMode { get; set; } = true;

    /// <summary>
    /// When true: no API-key auth, no localhost-only lock, LAN devices can hit all routes.
    /// Keep true while bringing up ZK thumb → SDK. Set false for production lockdown.
    /// </summary>
    public bool DisableSecurity { get; set; } = true;

    public string AgentName { get; set; } = "SyncOps Device Agent";

    public string ListenUrl => $"http://{Host}:{Port}";

    /// <summary>Local SQLite path for device registry (relative to content root if not rooted).</summary>
    public string RegistryDatabasePath { get; set; } = "data/devices.db";

    /// <summary>How often to rediscover printers/devices in the background (minutes).</summary>
    public int DiscoveryIntervalMinutes { get; set; } = 15;

    public ZktecoOptions Zkteco { get; set; } = new();

    public DiscoveryOptions Discovery { get; set; } = new();

    /// <summary>Push ZKTeco / fingerprint punches into Beautora /attendance.</summary>
    public BeautoraBridgeOptions Beautora { get; set; } = new();
}

public sealed class ZktecoOptions
{
    public bool Enabled { get; set; } = true;
    /// <summary>mock | tcp-probe | vendor-sdk | push-buffer</summary>
    public string ProtocolMode { get; set; } = "push-buffer";
    public string Host { get; set; } = "192.168.1.201";
    public int Port { get; set; } = 4370;
    public int TimeoutMs { get; set; } = 5000;

    /// <summary>
    /// Spawn Node.js TCP watcher (high RAM). Leave false for ADMS Cloud push (recommended).
    /// </summary>
    public bool EnableTcpWatcher { get; set; }
}

public sealed class DiscoveryOptions
{
    /// <summary>Optional CIDR for TCP probing. Empty = no network scan.</summary>
    public string? IpRangeCidr { get; set; }
    public int MaxConcurrency { get; set; } = 8;
    public int TimeoutMs { get; set; } = 1000;
}

/// <summary>
/// Salon web app bridge — Device Agent owns hardware on the local PC;
/// Beautora SaaS (<see cref="BeautoraCloudUrls.Production"/>) owns attendance DB / cloud APIs.
/// Register an Attendance terminal under Devices and paste its API key here when using
/// <c>/api/devices/attendance</c>; ADMS thumb-punch uses <c>DeviceAgent:ApiKey</c> →
/// <c>/api/agent/thumb-punch</c>.
/// </summary>
public sealed class BeautoraBridgeOptions
{
    /// <summary>
    /// Cloud web app base URL. Production default: https://www.beautora.app
    /// Override with env BEAUTORA_APP_URL or appsettings.Development.json for local Next.js.
    /// </summary>
    public string AppUrl { get; set; } = BeautoraCloudUrls.Production;

    /// <summary>Devices → Attendance terminal → API key (X-Device-Key).</summary>
    public string AttendanceApiKey { get; set; } = "";

    /// <summary>Optional SyncOps device id (e.g. zkteco-mock). Empty = auto-pick attendance terminal.</summary>
    public string AttendanceDeviceId { get; set; } = "";

    /// <summary>When true and AttendanceApiKey is set, poll ZK logs and POST to Beautora cloud.</summary>
    public bool AttendanceSyncEnabled { get; set; } = true;

    public int AttendanceSyncIntervalSeconds { get; set; } = 15;

    /// <summary>How far back to look on first sync (hours).</summary>
    public int AttendanceLookbackHours { get; set; } = 24;
}
