import ZKLib from 'zkteco-js';
const device = new ZKLib('192.168.1.201', 4370, 15000, 4000);
try {
  await device.createSocket();
  console.error('socket ok');
  const logs = await device.getAttendances(console.log);
  const rows = logs?.data ?? logs ?? [];
  console.log(JSON.stringify({ ok: true, count: rows.length, sample: rows.slice(-10) }));
  await device.disconnect();
} catch (e) {
  console.log(JSON.stringify({ ok: false, name: e?.name, message: e?.message || String(e), keys: e && typeof e==='object' ? Object.keys(e) : [] }));
  try { await device.disconnect(); } catch {}
  process.exitCode = 1;
}
