import ZKLib from 'zkteco-js';
const device = new ZKLib('192.168.1.201', 4370, 20000, 5000);
function dump(e){ return e && typeof e==='object' ? JSON.stringify(e, Object.getOwnPropertyNames(e)) : String(e); }
try {
  await device.createSocket();
  console.error('connected');
  try { await device.disableDevice(); console.error('disabled'); } catch(e){ console.error('disable fail', dump(e)); }
  try {
    const users = await device.getUsers();
    console.error('users', users?.data?.length ?? users?.length ?? users);
  } catch(e){ console.error('users fail', dump(e)); }
  try {
    const logs = await device.getAttendances();
    const rows = logs?.data ?? [];
    console.log(JSON.stringify({ ok:true, count: rows.length, sample: rows.slice(-5) }));
  } catch(e){ console.log(JSON.stringify({ ok:false, error: dump(e) })); }
  try { await device.enableDevice(); } catch {}
  await device.disconnect();
} catch(e) {
  console.log(JSON.stringify({ ok:false, connect: dump(e) }));
  process.exitCode=1;
}
