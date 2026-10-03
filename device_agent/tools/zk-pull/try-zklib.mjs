import ZKLIB from 'zklib';
const zk = new ZKLIB({ ip: '192.168.1.201', port: 4370, inport: 5200, timeout: 10000 });
zk.createSocket((err, val) => {
  if (err) { console.log(JSON.stringify({ ok:false, stage:'socket', err: String(err) })); return; }
  console.error('socket', val);
  zk.getAttendance((err2, data) => {
    console.log(JSON.stringify({ ok: !err2, err: err2 && String(err2), count: data?.length, sample: data?.slice?.(-5) }));
    zk.disconnect();
    process.exit(err2 ? 1 : 0);
  });
});
