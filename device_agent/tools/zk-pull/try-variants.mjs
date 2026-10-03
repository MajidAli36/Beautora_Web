import { ZkDevice } from 'zkteco-protocol';

async function tryOne(label, opts) {
  const dev = new ZkDevice({ host: '192.168.1.201', port: 4370, timeoutMs: 8000, ...opts });
  try {
    await dev.connect();
    console.error(label, 'connected');
    try {
      const info = await dev.getInfo();
      console.error(label, 'info', info);
    } catch (e) { console.error(label, 'info fail', e.message); }
    try {
      const logs = await dev.getAttendanceLogs();
      console.log(JSON.stringify({ label, ok: true, count: logs.length, sample: logs.slice(-3) }));
    } catch (e) {
      console.log(JSON.stringify({ label, ok: false, stage: 'logs', error: e.message }));
    }
    await dev.disconnect();
  } catch (e) {
    console.log(JSON.stringify({ label, ok: false, stage: 'connect', error: e.message }));
  }
}

await tryOne('tcp', { transport: 'tcp' });
await tryOne('udp', { transport: 'udp' });
await tryOne('tcp-key', { transport: 'tcp', commKey: 0 });
