using System.Runtime.InteropServices;
using System.Text;

namespace Beautora.DeviceAgent.Infrastructure;

/// <summary>
/// Sends raw bytes to a Windows printer via the spooler (ESC/POS / drawer kick).
/// </summary>
public static class RawPrinterHelper
{
    public static void SendBytes(string printerName, byte[] data)
    {
        if (string.IsNullOrWhiteSpace(printerName))
            throw new ArgumentException("Printer name is required.", nameof(printerName));
        if (data is null || data.Length == 0)
            throw new ArgumentException("Print data is empty.", nameof(data));

        if (!OpenPrinter(printerName.Normalize(), out var hPrinter, IntPtr.Zero))
            throw new InvalidOperationException($"Unable to open printer '{printerName}'.");

        try
        {
            var di = new DOCINFOA
            {
                pDocName = "Beautora Device Agent",
                pDataType = "RAW"
            };

            if (!StartDocPrinter(hPrinter, 1, di))
                throw new InvalidOperationException("StartDocPrinter failed.");

            try
            {
                if (!StartPagePrinter(hPrinter))
                    throw new InvalidOperationException("StartPagePrinter failed.");

                try
                {
                    var unmanaged = Marshal.AllocCoTaskMem(data.Length);
                    try
                    {
                        Marshal.Copy(data, 0, unmanaged, data.Length);
                        if (!WritePrinter(hPrinter, unmanaged, data.Length, out _))
                            throw new InvalidOperationException("WritePrinter failed.");
                    }
                    finally
                    {
                        Marshal.FreeCoTaskMem(unmanaged);
                    }
                }
                finally
                {
                    EndPagePrinter(hPrinter);
                }
            }
            finally
            {
                EndDocPrinter(hPrinter);
            }
        }
        finally
        {
            ClosePrinter(hPrinter);
        }
    }

    public static void SendText(string printerName, string text, Encoding? encoding = null)
    {
        encoding ??= Encoding.UTF8;
        SendBytes(printerName, encoding.GetBytes(text.Replace("\n", "\r\n")));
    }

    /// <summary>Standard Epson-compatible drawer pulse: ESC p 0 25 250</summary>
    public static readonly byte[] CashDrawerKick = [0x1B, 0x70, 0x00, 0x19, 0xFA];

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    private class DOCINFOA
    {
        [MarshalAs(UnmanagedType.LPStr)]
        public string pDocName = "";
        [MarshalAs(UnmanagedType.LPStr)]
        public string? pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)]
        public string pDataType = "RAW";
    }

    [DllImport("winspool.drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
    private static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.drv", EntryPoint = "ClosePrinter", SetLastError = true)]
    private static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi)]
    private static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In] DOCINFOA di);

    [DllImport("winspool.drv", EntryPoint = "EndDocPrinter", SetLastError = true)]
    private static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "StartPagePrinter", SetLastError = true)]
    private static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "EndPagePrinter", SetLastError = true)]
    private static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.drv", EntryPoint = "WritePrinter", SetLastError = true)]
    private static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);
}
