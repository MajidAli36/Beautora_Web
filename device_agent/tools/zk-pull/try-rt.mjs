import ZKLib from 'zkteco-js';
const device = new ZKLib('192.168.1.201', 4370, 10000, 4000);
try {
  await device.createSocket();
  console.error('connected, enabling realtime for 25s — press thumb now');
  // some versions: getRealTimeLogs(cb)
  if (typeof device.getRealTimeLogs === 'function') {
    await device.getRealTimeLogs((data) => {
      console.log(JSON.stringify({ event: 'realtime', data }));
    });
  } else {
    console.error('no getRealTimeLogs', Object.getOwnPropertyNames(Object.getPrototypeOf(device)));
  }
  await new Promise(r => setTimeout(r, 25000));
  await device.disconnect();
  console.log(JSON.stringify({ ok: true, done: true }));
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: e?.message || JSON.stringify(e) }));
  try { await device.disconnect(); } catch {}
  process.exitCode = 1;
}
