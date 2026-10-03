import ZKLib from "zkteco-js";
const zk = new ZKLib("192.168.1.201", 4370, 25000, 8000);
await zk.createSocket();
console.log("connected");
try {
  const logs = await zk.getAttendances((p) => console.log("progress", p));
  const rows = logs?.data ?? [];
  console.log(JSON.stringify({ ok:true, count: rows.length, sample: rows.slice(-5) }));
} catch (e) {
  console.log(JSON.stringify({ ok:false, err: String(e?.message||e), name: e?.name }));
}
try { await zk.disconnect(); } catch {}
