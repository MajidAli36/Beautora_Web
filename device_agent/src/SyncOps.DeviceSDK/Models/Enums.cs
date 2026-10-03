namespace SyncOps.DeviceSDK.Models;

public enum DeviceType
{
    Unknown = 0,
    Printer = 1,
    CashDrawer = 2,
    Fingerprint = 3,
    AttendanceTerminal = 4,
    RfidReader = 5,
    BarcodeScanner = 6,
    WeightScale = 7,
    Other = 99
}

public enum DeviceConnectionState
{
    Disconnected = 0,
    Connecting = 1,
    Connected = 2,
    Faulted = 3,
    Mock = 4
}

public enum DeviceOnlineStatus
{
    Online = 0,
    Offline = 1,
    Unknown = 2,
    Mock = 3
}

public enum ConnectionType
{
    Unknown = 0,
    Tcp = 1,
    Serial = 2,
    Usb = 3,
    Hid = 4,
    WindowsSpooler = 5,
    Mock = 6
}

public enum DeviceCapabilityKind
{
    Print = 1,
    CashDrawer = 2,
    FingerprintScan = 3,
    FingerprintVerify = 4,
    Attendance = 5,
    UserDirectory = 6,
    DeviceTime = 7,
    Rfid = 8,
    Barcode = 9,
    Weigh = 10
}

public enum PrintContentType
{
    Text = 0,
    EscPosBase64 = 1,
    EscPos = 2
}
