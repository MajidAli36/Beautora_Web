import { ZkDevice } from "zkteco-protocol";

const host = process.argv[2] || "192.168.1.201";
const port = Number(process.argv[3] || 4370);

const dev = new ZkDevice({ host, port, transport: "tcp", timeoutMs: 8000 });
try {
  await dev.connect();
  const info = await dev.getInfo();
  const logs = await dev.getAttendanceLogs();
  const users = await dev.getUsers().catch(() => []);
  console.log(
    JSON.stringify({
      ok: true,
      info,
      userCount: users?.length ?? 0,
      logs: logs.slice(-20).map((l) => ({
        userId: l.userId,
        uid: l.uid,
        local: l.timestamp.local,
        status: l.status,
        verifyMode: l.verifyMode,
      })),
      logCount: logs.length,
    })
  );
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exitCode = 1;
} finally {
  try {
    await dev.disconnect();
  } catch {
    /* ignore */
  }
}
