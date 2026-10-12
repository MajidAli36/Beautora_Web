using SyncOps.DeviceSDK.Models;

namespace SyncOps.DeviceAdapters.ZKTeco.Protocol;

/// <summary>
/// In-memory attendance punches received from ADMS/iClock push, realtime watchers, or simulate.
/// Shared across protocol instances so live sync can poll / long-wait for real punches.
/// </summary>
public static class ZktecoAttendancePunchStore
{
    private static readonly object Gate = new();
    private static readonly List<AttendanceLog> Logs = new();
    private static long _version;
    private static TaskCompletionSource _signal =
        new(TaskCreationOptions.RunContinuationsAsynchronously);

    /// <summary>Monotonic counter bumped whenever a new punch is stored.</summary>
    public static long Version
    {
        get { lock (Gate) return _version; }
    }

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

        TaskCompletionSource? toRelease = null;
        lock (Gate)
        {
            // Dedup identical punches within 2s
            var exists = Logs.Any(l =>
                l.UserId == log.UserId &&
                Math.Abs((l.Timestamp - log.Timestamp).TotalSeconds) < 2);
            if (!exists)
            {
                Logs.Add(log);
                _version++;
                toRelease = _signal;
                _signal = new(TaskCreationOptions.RunContinuationsAsynchronously);
            }

            if (Logs.Count > 5000)
                Logs.RemoveRange(0, Logs.Count - 4000);
        }

        toRelease?.TrySetResult();
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

    /// <summary>
    /// Long-poll helper: returns when Version &gt; sinceVersion, or when timeout/cancel elapses.
    /// </summary>
    public static async Task<long> WaitAsync(
        long sinceVersion,
        TimeSpan timeout,
        CancellationToken cancellationToken = default)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(timeout);

        while (!cts.IsCancellationRequested)
        {
            Task waitTask;
            long current;
            lock (Gate)
            {
                current = _version;
                if (current > sinceVersion)
                    return current;
                waitTask = _signal.Task;
            }

            try
            {
                await waitTask.WaitAsync(cts.Token).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        lock (Gate) return _version;
    }

    public static void Clear()
    {
        lock (Gate) Logs.Clear();
    }
}
