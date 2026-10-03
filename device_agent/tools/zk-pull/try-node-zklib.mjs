import ZKLib from 'node-zklib';
const zk = new ZKLib('192.168.1.201', 4370, 10000, 4000);
try {
  await zk.createSocket();
  const info = await zk.getInfo();
  const logs = await zk.getAttendances();
  console.log(JSON.stringify({ ok: true, info, count: logs?.data?.length ?? logs?.length, sample: (logs?.data ?? logs ?? []).slice(-5) }, null, 2));
  await zk.disconnect();
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: String(e?.message || e) }));
  try { await zk.disconnect(); } catch {}
  process.exitCode = 1;
}
