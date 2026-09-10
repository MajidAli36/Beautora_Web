namespace Beautora.DeviceAgent.Configuration;

public sealed class DeviceAgentOptions
{
    public const string SectionName = "DeviceAgent";

    /// <summary>Loopback bind address. Must stay localhost for security.</summary>
    public string Host { get; set; } = "127.0.0.1";

    public int Port { get; set; } = 17890;

    /// <summary>Shared secret required on every device command (header X-Beautora-Agent-Key).</summary>
    public string ApiKey { get; set; } = "change-me-local-dev-key";

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

    public string AgentName { get; set; } = "Beautora Device Agent";

    public string ListenUrl => $"http://{Host}:{Port}";
}
