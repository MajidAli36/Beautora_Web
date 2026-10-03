import ZKLib from 'zkteco-js';
const device = new ZKLib('192.168.1.201', 4370, 10000, 4000);
try {
  await device.createSocket();
  console.error('socket ok');
  const info = await device.getInfo();
  console.error('info', info);
  const logs = await device.getAttendances();
  const rows = logs?.data ?? logs ?? [];
  console.log(JSON.stringify({ ok: true, info, count: rows.length, sample: rows.slice(-8).map(r => ({ userId: r.deviceUserId ?? r.userId ?? r.uid, time: r.recordTime ?? r.timestamp })) }));
  await device.disconnect();
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e?.message || String(e), stack: e?.stack?.split('\n').slice(0,4) }));
  try { await device.disconnect(); } catch {}
  process.exitCode = 1;
}
