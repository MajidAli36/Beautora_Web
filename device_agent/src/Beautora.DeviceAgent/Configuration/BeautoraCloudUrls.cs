namespace Beautora.DeviceAgent.Configuration;

/// <summary>
/// Single source of truth for where the local Device Agent / SDK posts cloud + DB updates.
/// Local hardware stays on the salon PC; attendance / device state is written to Beautora SaaS.
/// </summary>
public static class BeautoraCloudUrls
{
    /// <summary>Production Beautora web app (default for installed agents / Windows services).</summary>
    public const string Production = "https://www.beautora.app";

    /// <summary>Local Next.js during development only.</summary>
    public const string Development = "http://localhost:3000";

    /// <summary>
    /// Resolve the cloud base URL (no trailing slash).
    /// Priority: BEAUTORA_APP_URL env → configured AppUrl → production.
    /// </summary>
    public static string Resolve(string? configuredAppUrl)
    {
        var fromEnv = Environment.GetEnvironmentVariable("BEAUTORA_APP_URL");
        var raw = !string.IsNullOrWhiteSpace(fromEnv)
            ? fromEnv
            : configuredAppUrl;

        if (string.IsNullOrWhiteSpace(raw))
            raw = Production;

        return Normalize(raw);
    }

    public static string Normalize(string url) =>
        (url ?? "").Trim().TrimEnd('/');

    /// <summary>Absolute URL for a path under the cloud app (e.g. /api/agent/thumb-punch).</summary>
    public static string Api(string? configuredAppUrl, string relativePath)
    {
        var baseUrl = Resolve(configuredAppUrl);
        var path = relativePath.StartsWith('/') ? relativePath : "/" + relativePath;
        return baseUrl + path;
    }
}
