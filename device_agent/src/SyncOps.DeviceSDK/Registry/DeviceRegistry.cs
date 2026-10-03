using System.Text.Json;
using Microsoft.Data.Sqlite;
using SyncOps.DeviceSDK.Core;
using SyncOps.DeviceSDK.Models;

namespace SyncOps.DeviceSDK.Registry;

public sealed class SqliteDeviceRegistry : IDeviceRegistry
{
    private readonly string _connectionString;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private bool _initialized;

    public SqliteDeviceRegistry(string databasePath)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(databasePath))!);
        _connectionString = new SqliteConnectionStringBuilder { DataSource = databasePath }.ToString();
    }

    public async Task UpsertAsync(RegisteredDevice device, CancellationToken cancellationToken = default)
    {
        await EnsureInitializedAsync(cancellationToken).ConfigureAwait(false);
        await _gate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            await using var conn = new SqliteConnection(_connectionString);
            await conn.OpenAsync(cancellationToken).ConfigureAwait(false);
            await using var cmd = conn.CreateCommand();
            cmd.CommandText =
                """
                INSERT INTO devices (Id, Manufacturer, Model, SerialNumber, DeviceType, Host, Port, ConnectionType,
                                     LastSeenUtc, Status, AdapterId, ConfigurationJson, CapabilitiesJson)
                VALUES ($id, $mfr, $model, $serial, $type, $host, $port, $ctype, $seen, $status, $adapter, $cfg, $caps)
                ON CONFLICT(Id) DO UPDATE SET
                  Manufacturer=excluded.Manufacturer,
                  Model=excluded.Model,
                  SerialNumber=excluded.SerialNumber,
                  DeviceType=excluded.DeviceType,
                  Host=excluded.Host,
                  Port=excluded.Port,
                  ConnectionType=excluded.ConnectionType,
                  LastSeenUtc=excluded.LastSeenUtc,
                  Status=excluded.Status,
                  AdapterId=excluded.AdapterId,
                  ConfigurationJson=excluded.ConfigurationJson,
                  CapabilitiesJson=excluded.CapabilitiesJson;
                """;
            cmd.Parameters.AddWithValue("$id", device.Id);
            cmd.Parameters.AddWithValue("$mfr", device.Manufacturer);
            cmd.Parameters.AddWithValue("$model", device.Model);
            cmd.Parameters.AddWithValue("$serial", (object?)device.SerialNumber ?? DBNull.Value);
            cmd.Parameters.AddWithValue("$type", (int)device.DeviceType);
            cmd.Parameters.AddWithValue("$host", (object?)device.Host ?? DBNull.Value);
            cmd.Parameters.AddWithValue("$port", (object?)device.Port ?? DBNull.Value);
            cmd.Parameters.AddWithValue("$ctype", (int)device.ConnectionType);
            cmd.Parameters.AddWithValue("$seen", device.LastSeenUtc?.ToString("O") ?? (object)DBNull.Value);
            cmd.Parameters.AddWithValue("$status", device.Status);
            cmd.Parameters.AddWithValue("$adapter", device.AdapterId);
            cmd.Parameters.AddWithValue("$cfg", device.ConfigurationJson);
            cmd.Parameters.AddWithValue("$caps", device.CapabilitiesJson);
            await cmd.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task<RegisteredDevice?> GetAsync(string deviceId, CancellationToken cancellationToken = default)
    {
        var all = await GetAllAsync(cancellationToken).ConfigureAwait(false);
        return all.FirstOrDefault(d => string.Equals(d.Id, deviceId, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<IReadOnlyList<RegisteredDevice>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        await EnsureInitializedAsync(cancellationToken).ConfigureAwait(false);
        await _gate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            await using var conn = new SqliteConnection(_connectionString);
            await conn.OpenAsync(cancellationToken).ConfigureAwait(false);
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT * FROM devices ORDER BY Id;";
            var list = new List<RegisteredDevice>();
            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken).ConfigureAwait(false);
            while (await reader.ReadAsync(cancellationToken).ConfigureAwait(false))
            {
                list.Add(new RegisteredDevice
                {
                    Id = reader.GetString(reader.GetOrdinal("Id")),
                    Manufacturer = reader.GetString(reader.GetOrdinal("Manufacturer")),
                    Model = reader.GetString(reader.GetOrdinal("Model")),
                    SerialNumber = reader.IsDBNull(reader.GetOrdinal("SerialNumber")) ? null : reader.GetString(reader.GetOrdinal("SerialNumber")),
                    DeviceType = (DeviceType)reader.GetInt32(reader.GetOrdinal("DeviceType")),
                    Host = reader.IsDBNull(reader.GetOrdinal("Host")) ? null : reader.GetString(reader.GetOrdinal("Host")),
                    Port = reader.IsDBNull(reader.GetOrdinal("Port")) ? null : reader.GetInt32(reader.GetOrdinal("Port")),
                    ConnectionType = (ConnectionType)reader.GetInt32(reader.GetOrdinal("ConnectionType")),
                    LastSeenUtc = reader.IsDBNull(reader.GetOrdinal("LastSeenUtc"))
                        ? null
                        : DateTimeOffset.Parse(reader.GetString(reader.GetOrdinal("LastSeenUtc"))),
                    Status = reader.GetString(reader.GetOrdinal("Status")),
                    AdapterId = reader.GetString(reader.GetOrdinal("AdapterId")),
                    ConfigurationJson = reader.GetString(reader.GetOrdinal("ConfigurationJson")),
                    CapabilitiesJson = reader.GetString(reader.GetOrdinal("CapabilitiesJson"))
                });
            }

            return list;
        }
        finally
        {
            _gate.Release();
        }
    }

    public async Task DeleteAsync(string deviceId, CancellationToken cancellationToken = default)
    {
        await EnsureInitializedAsync(cancellationToken).ConfigureAwait(false);
        await _gate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            await using var conn = new SqliteConnection(_connectionString);
            await conn.OpenAsync(cancellationToken).ConfigureAwait(false);
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = "DELETE FROM devices WHERE Id = $id;";
            cmd.Parameters.AddWithValue("$id", deviceId);
            await cmd.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
        }
        finally
        {
            _gate.Release();
        }
    }

    public static string SerializeCapabilities(IEnumerable<DeviceCapability> caps) =>
        JsonSerializer.Serialize(caps);

    private async Task EnsureInitializedAsync(CancellationToken cancellationToken)
    {
        if (_initialized) return;
        await _gate.WaitAsync(cancellationToken).ConfigureAwait(false);
        try
        {
            if (_initialized) return;
            await using var conn = new SqliteConnection(_connectionString);
            await conn.OpenAsync(cancellationToken).ConfigureAwait(false);
            await using var cmd = conn.CreateCommand();
            cmd.CommandText =
                """
                CREATE TABLE IF NOT EXISTS devices (
                  Id TEXT PRIMARY KEY,
                  Manufacturer TEXT NOT NULL,
                  Model TEXT NOT NULL,
                  SerialNumber TEXT NULL,
                  DeviceType INTEGER NOT NULL,
                  Host TEXT NULL,
                  Port INTEGER NULL,
                  ConnectionType INTEGER NOT NULL,
                  LastSeenUtc TEXT NULL,
                  Status TEXT NOT NULL,
                  AdapterId TEXT NOT NULL,
                  ConfigurationJson TEXT NOT NULL,
                  CapabilitiesJson TEXT NOT NULL
                );
                """;
            await cmd.ExecuteNonQueryAsync(cancellationToken).ConfigureAwait(false);
            _initialized = true;
        }
        finally
        {
            _gate.Release();
        }
    }
}

public sealed class InMemoryDeviceRegistry : IDeviceRegistry
{
    private readonly Dictionary<string, RegisteredDevice> _store = new(StringComparer.OrdinalIgnoreCase);
    private readonly object _gate = new();

    public Task UpsertAsync(RegisteredDevice device, CancellationToken cancellationToken = default)
    {
        lock (_gate) _store[device.Id] = device;
        return Task.CompletedTask;
    }

    public Task<RegisteredDevice?> GetAsync(string deviceId, CancellationToken cancellationToken = default)
    {
        lock (_gate)
            return Task.FromResult(_store.TryGetValue(deviceId, out var d) ? d : null);
    }

    public Task<IReadOnlyList<RegisteredDevice>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        lock (_gate)
            return Task.FromResult<IReadOnlyList<RegisteredDevice>>(_store.Values.ToList());
    }

    public Task DeleteAsync(string deviceId, CancellationToken cancellationToken = default)
    {
        lock (_gate) _store.Remove(deviceId);
        return Task.CompletedTask;
    }
}
