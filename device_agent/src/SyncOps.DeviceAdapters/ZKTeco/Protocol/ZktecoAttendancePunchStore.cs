using SyncOps.DeviceSDK.Models;

namespace SyncOps.DeviceAdapters.ZKTeco.Protocol;

/// <summary>
/// In-memory attendance punches received from ADMS/iClock push, realtime watchers, or simulate.
/// Shared across protocol instances so live sync can poll real device IDs.
/// </summary>
public static class ZktecoAttendancePunchStore
{
    private static readonly object Gate = new();
    private static readonly List<AttendanceLog> Logs = new();

    public static AttendanceLog Add(
        string userId,
        DateTimeOffset timestamp,
        int? inOutMode = null,
        int verifyMode = 1,
        string? deviceId = null)
    {
        var log = new AttendanceLog
        {
            UserId = userId.Trim(),
            Timestamp = timestamp,
            InOutMode = inOutMode,
            VerifyMode = verifyMode,
            DeviceId = deviceId
        };

        lock (Gate)
        {
            // Dedup identical punches within 2s
            var exists = Logs.Any(l =>
                l.UserId == log.UserId &&
                Math.Abs((l.Timestamp - log.Timestamp).TotalSeconds) < 2);
            if (!exists)
                Logs.Add(log);

            if (Logs.Count > 5000)
                Logs.RemoveRange(0, Logs.Count - 4000);
        }

        return log;
    }

    public static IReadOnlyList<AttendanceLog> Get(DateTimeOffset? from = null, DateTimeOffset? to = null)
    {
        lock (Gate)
        {
            IEnumerable<AttendanceLog> q = Logs;
            if (from is not null) q = q.Where(l => l.Timestamp >= from);
            if (to is not null) q = q.Where(l => l.Timestamp <= to);
            return q.OrderBy(l => l.Timestamp).ToList();
        }
    }

    public static void Clear()
    {
        lock (Gate) Logs.Clear();
    }
}
