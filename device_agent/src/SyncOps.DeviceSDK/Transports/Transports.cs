using System.Net.Sockets;
using SyncOps.DeviceSDK.Core;
using SyncOps.DeviceSDK.Exceptions;
using SyncOps.DeviceSDK.Models;

namespace SyncOps.DeviceSDK.Transports;

public sealed class TcpTransport : IDeviceTransport
{
    private TcpClient? _client;
    private NetworkStream? _stream;

    public ConnectionType ConnectionType => Models.ConnectionType.Tcp;
    public bool IsConnected => _client?.Connected == true;

    public async Task ConnectAsync(DeviceConnection connection, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(connection.Host) || connection.Port is null or <= 0)
            throw new DeviceException(DeviceErrorCode.InvalidArgument, "TCP host and port are required.");

        await DisconnectAsync(cancellationToken).ConfigureAwait(false);

        _client = new TcpClient();
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(connection.TimeoutMs <= 0 ? 5000 : connection.TimeoutMs);

        try
        {
            await _client.ConnectAsync(connection.Host, connection.Port.Value, cts.Token).ConfigureAwait(false);
            _stream = _client.GetStream();
        }
        catch (Exception ex) when (ex is SocketException or OperationCanceledException or IOException)
        {
            await DisconnectAsync(CancellationToken.None).ConfigureAwait(false);
            throw new DeviceConnectionException(
                $"TCP connect failed to {connection.Host}:{connection.Port}: {ex.Message}",
                inner: ex);
        }
    }

    public Task DisconnectAsync(CancellationToken cancellationToken = default)
    {
        try { _stream?.Dispose(); } catch { /* ignore */ }
        try { _client?.Dispose(); } catch { /* ignore */ }
        _stream = null;
        _client = null;
        return Task.CompletedTask;
    }

    public async Task<int> SendAsync(ReadOnlyMemory<byte> data, CancellationToken cancellationToken = default)
    {
        EnsureConnected();
        await _stream!.WriteAsync(data, cancellationToken).ConfigureAwait(false);
        return data.Length;
    }

    public async Task<int> ReceiveAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
    {
        EnsureConnected();
        return await _stream!.ReadAsync(buffer, cancellationToken).ConfigureAwait(false);
    }

    public async ValueTask DisposeAsync() => await DisconnectAsync().ConfigureAwait(false);

    private void EnsureConnected()
    {
        if (!IsConnected || _stream is null)
            throw new DeviceConnectionException("TCP transport is not connected.");
    }
}

/// <summary>Placeholder — implement when serial devices are added.</summary>
public sealed class SerialTransport : IDeviceTransport
{
    public ConnectionType ConnectionType => Models.ConnectionType.Serial;
    public bool IsConnected { get; private set; }

    public Task ConnectAsync(DeviceConnection connection, CancellationToken cancellationToken = default) =>
        throw new DeviceException(DeviceErrorCode.UnsupportedOperation, "SerialTransport not implemented yet.");

    public Task DisconnectAsync(CancellationToken cancellationToken = default)
    {
        IsConnected = false;
        return Task.CompletedTask;
    }

    public Task<int> SendAsync(ReadOnlyMemory<byte> data, CancellationToken cancellationToken = default) =>
        throw new DeviceException(DeviceErrorCode.UnsupportedOperation, "SerialTransport not implemented yet.");

    public Task<int> ReceiveAsync(Memory<byte> buffer, CancellationToken cancellationToken = default) =>
        throw new DeviceException(DeviceErrorCode.UnsupportedOperation, "SerialTransport not implemented yet.");

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;
}

/// <summary>Placeholder — implement when HID devices are added.</summary>
public sealed class HidTransport : IDeviceTransport
{
    public ConnectionType ConnectionType => Models.ConnectionType.Hid;
    public bool IsConnected => false;

    public Task ConnectAsync(DeviceConnection connection, CancellationToken cancellationToken = default) =>
        throw new DeviceException(DeviceErrorCode.UnsupportedOperation, "HidTransport not implemented yet.");

    public Task DisconnectAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;

    public Task<int> SendAsync(ReadOnlyMemory<byte> data, CancellationToken cancellationToken = default) =>
        throw new DeviceException(DeviceErrorCode.UnsupportedOperation, "HidTransport not implemented yet.");

    public Task<int> ReceiveAsync(Memory<byte> buffer, CancellationToken cancellationToken = default) =>
        throw new DeviceException(DeviceErrorCode.UnsupportedOperation, "HidTransport not implemented yet.");

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;
}

/// <summary>Placeholder — implement when raw USB devices are added.</summary>
public sealed class UsbTransport : IDeviceTransport
{
    public ConnectionType ConnectionType => Models.ConnectionType.Usb;
    public bool IsConnected => false;

    public Task ConnectAsync(DeviceConnection connection, CancellationToken cancellationToken = default) =>
        throw new DeviceException(DeviceErrorCode.UnsupportedOperation, "UsbTransport not implemented yet.");

    public Task DisconnectAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;

    public Task<int> SendAsync(ReadOnlyMemory<byte> data, CancellationToken cancellationToken = default) =>
        throw new DeviceException(DeviceErrorCode.UnsupportedOperation, "UsbTransport not implemented yet.");

    public Task<int> ReceiveAsync(Memory<byte> buffer, CancellationToken cancellationToken = default) =>
        throw new DeviceException(DeviceErrorCode.UnsupportedOperation, "UsbTransport not implemented yet.");

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;
}
