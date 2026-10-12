# SyncOps Device Agent — customer package

## For you (developer)

Build the customer folder/zip (needs .NET SDK on **your** PC only):

```powershell
cd device_agent\installer
.\build-customer-package.ps1
```

Output:

- `device_agent\dist\SyncOps-DeviceAgent\` — folder to give / test  
- `device_agent\dist\SyncOps-DeviceAgent.zip` — send this to the salon  

Inside the folder the customer sees:

| File | Purpose |
|------|---------|
| **Install.bat** | Install + start background service |
| **Uninstall.bat** | Remove service + files |

The `app` folder is **hidden** (pre-built agent — no source, no .NET SDK).

## For the customer (salon)

1. Unzip `SyncOps-DeviceAgent.zip`
2. Right‑click **Install.bat** → **Run as administrator**
3. On ZK Cloud Server: this PC’s LAN IP, port **17890**
4. Open https://www.beautora.app/attendance and test

To remove later: **Uninstall.bat** (Run as administrator).

No Visual Studio. No .NET install. No project files.
