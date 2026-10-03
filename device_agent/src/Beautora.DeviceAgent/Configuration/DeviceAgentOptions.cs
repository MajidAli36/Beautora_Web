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
        "http://localhost:3000",
        "https://www.beautora.app",
        "https://beautora.app"
    ];

    public string DefaultPrinterId { get; set; } = "";

    /// <summary>Windows printer used for ESC/POS drawer kick when drawer is printer-attached.</summary>
    public string DefaultDrawerPrinterId { get; set; } = "";

    public bool EnableTray { get; set; } = true;

    /// <summary>
    /// When true: no API-key auth, no localhost-only lock, LAN devices can hit all routes.
    /// Keep true while bringing up ZK thumb → SDK. Set false for production lockdown.
    /// </summary>
    public bool DisableSecurity { get; set; } = true;

    public string AgentName { get; set; } = "SyncOps Device Agent";

    public string ListenUrl => $"http://{Host}:{Port}";

    /// <summary>Local SQLite path for device registry (relative to content root if not rooted).</summary>
    public string RegistryDatabasePath { get; set; } = "data/devices.db";

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
}

public sealed class DiscoveryOptions
{
    /// <summary>Optional CIDR for TCP probing. Empty = no network scan.</summary>
    public string? IpRangeCidr { get; set; }
    public int MaxConcurrency { get; set; } = 16;
    public int TimeoutMs { get; set; } = 1000;
}

/// <summary>
/// Salon web app bridge — Device Agent owns hardware; Beautora owns attendance records.
/// Register an Attendance terminal under Devices and paste its API key here.
/// </summary>
public sealed class BeautoraBridgeOptions
{
    /// <summary>e.g. http://localhost:3000</summary>
    public string AppUrl { get; set; } = "http://localhost:3000";

    /// <summary>Devices → Attendance terminal → API key (X-Device-Key).</summary>
    public string AttendanceApiKey { get; set; } = "";

    /// <summary>Optional SyncOps device id (e.g. zkteco-mock). Empty = auto-pick attendance terminal.</summary>
    public string AttendanceDeviceId { get; set; } = "";

    /// <summary>When true and AttendanceApiKey is set, poll ZK logs and POST to Beautora.</summary>
    public bool AttendanceSyncEnabled { get; set; }

    public int AttendanceSyncIntervalSeconds { get; set; } = 15;

    /// <summary>How far back to look on first sync (hours).</summary>
    public int AttendanceLookbackHours { get; set; } = 24;
}
