using System.Diagnostics;
using Microsoft.Extensions.Logging;
using SyncOps.DeviceSDK.Exceptions;

namespace SyncOps.DeviceSDK.Logging;

public static class DeviceLogger
{
    public static async Task<T> MeasureAsync<T>(
        ILogger logger,
        string operation,
        string? deviceId,
        string? manufacturer,
        Func<CancellationToken, Task<T>> action,
        CancellationToken cancellationToken = default)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            var result = await action(cancellationToken).ConfigureAwait(false);
            sw.Stop();
            logger.LogInformation(
                "DeviceOp success Op={Operation} DeviceId={DeviceId} Manufacturer={Manufacturer} DurationMs={DurationMs}",
                operation, deviceId ?? "", manufacturer ?? "", sw.ElapsedMilliseconds);
            return result;
        }
        catch (Exception ex)
        {
            sw.Stop();
            var category = ex is DeviceException de ? de.ErrorCode.ToString() : "Unhandled";
            logger.LogError(
                ex,
                "DeviceOp failure Op={Operation} DeviceId={DeviceId} Manufacturer={Manufacturer} DurationMs={DurationMs} ErrorCategory={ErrorCategory}",
                operation, deviceId ?? "", manufacturer ?? "", sw.ElapsedMilliseconds, category);
            throw;
        }
    }

    public static Task MeasureAsync(
        ILogger logger,
        string operation,
        string? deviceId,
        string? manufacturer,
        Func<CancellationToken, Task> action,
        CancellationToken cancellationToken = default) =>
        MeasureAsync(logger, operation, deviceId, manufacturer, async ct =>
        {
            await action(ct).ConfigureAwait(false);
            return true;
        }, cancellationToken);
}
