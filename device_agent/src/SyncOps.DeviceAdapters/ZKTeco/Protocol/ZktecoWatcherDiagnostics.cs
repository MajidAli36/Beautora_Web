namespace SyncOps.DeviceAdapters.ZKTeco.Protocol;

/// <summary>
/// Live mirror of the Node ZK SDK watcher — proves whether thumbs hit the PC/SDK.
/// </summary>
public static class ZktecoWatcherDiagnostics
{
    private static readonly object Gate = new();

    public static bool ProcessRunning { get; private set; }
    public static string Message { get; private set; } = "not started";
    public static int PacketCount { get; private set; }
    public static int EventCount { get; private set; }
    public static int PunchCount { get; private set; }
    public static string? LastPunchUserId { get; private set; }
    public static DateTimeOffset? LastPunchAt { get; private set; }
    public static DateTimeOffset UpdatedAt { get; private set; } = DateTimeOffset.UtcNow;

    // Cloud / ADMS HTTP path (device → http://PC:17890/iclock/…)
    public static int AdmsRequestCount { get; private set; }
    public static int AdmsPunchCount { get; private set; }
    public static DateTimeOffset? LastAdmsAt { get; private set; }
    public static string? LastAdmsDetail { get; private set; }

    public static void NoteAdmsRequest(string detail)
    {
        lock (Gate)
        {
            AdmsRequestCount += 1;
            LastAdmsAt = DateTimeOffset.UtcNow;
            LastAdmsDetail = detail;
            UpdatedAt = DateTimeOffset.UtcNow;
        }
    }

    public static void NoteAdmsPunch(string userId)
    {
        lock (Gate)
        {
            AdmsPunchCount += 1;
            LastPunchUserId = userId;
            LastPunchAt = DateTimeOffset.UtcNow;
            LastAdmsDetail = $"ATTLOG user={userId}";
            UpdatedAt = DateTimeOffset.UtcNow;
            Message = $"Cloud ADMS punch user={userId}";
        }
    }

    public static void Set(bool running, string message)
    {
        lock (Gate)
        {
            ProcessRunning = running;
            Message = message;
            UpdatedAt = DateTimeOffset.UtcNow;
        }
    }

    public static void NoteHeartbeat(int packets, int events, int punches)
    {
        lock (Gate)
        {
            ProcessRunning = true;
            PacketCount = packets;
            EventCount = events;
            PunchCount = punches;
            UpdatedAt = DateTimeOffset.UtcNow;
            Message = punches > 0
                ? $"SDK ok — {punches} punch(es) reached C#"
                : events > 0
                    ? $"SDK events={events} but no decoded punch yet"
                    : "SDK listening — machine thumb has NOT hit C# yet";
        }
    }

    public static void NotePunch(string userId, DateTimeOffset at)
    {
        lock (Gate)
        {
            ProcessRunning = true;
            PunchCount += 1;
            LastPunchUserId = userId;
            LastPunchAt = at;
            UpdatedAt = DateTimeOffset.UtcNow;
            Message = $"thumb HIT C# user={userId}";
        }
    }

    public static object Snapshot()
    {
        lock (Gate)
        {
            return new
            {
                processRunning = ProcessRunning,
                message = Message,
                packetCount = PacketCount,
                eventCount = EventCount,
                punchCount = PunchCount,
                lastPunchUserId = LastPunchUserId,
                lastPunchAt = LastPunchAt,
                updatedAt = UpdatedAt,
                hitsCsharp = PunchCount > 0 || AdmsPunchCount > 0,
                bufferCount = ZktecoAttendancePunchStore.Get().Count,
                cloudAdms = new
                {
                    requestCount = AdmsRequestCount,
                    punchCount = AdmsPunchCount,
                    lastAt = LastAdmsAt,
                    lastDetail = LastAdmsDetail,
                    connected = AdmsRequestCount > 0,
                    hint = AdmsRequestCount == 0
                        ? "Device has not contacted Cloud yet — set Server=192.168.1.100 Port=17890, Enable ON, save, reboot ZK"
                        : AdmsPunchCount == 0
                            ? "Cloud connected but no ATTLOG yet — press thumb again"
                            : "Cloud punches OK"
                }
            };
        }
    }
}
