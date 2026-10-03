import ZKLib from "zkteco-js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { COMMANDS } = require("zkteco-js/src/helper/command.js");

const zk = new ZKLib("192.168.1.201", 4370, 15000, 5000);
await zk.createSocket();
console.log("connected");

async function write(kv) {
  try {
    const data = await zk.ztcp.executeCmd(COMMANDS.CMD_OPTIONS_WRQ, kv);
    console.log(JSON.stringify({ ok: true, kv, len: data?.length }));
  } catch (e) {
    console.log(JSON.stringify({ ok: false, kv, err: String(e?.message || e) }));
  }
}
async function read(key) {
  try {
    const data = await zk.ztcp.executeCmd(COMMANDS.CMD_OPTIONS_RRQ, key);
    const text = Buffer.from(data || []).toString("ascii").replace(/\u0000/g, "");
    console.log(JSON.stringify({ ok: true, key, text: text.slice(0, 120) }));
  } catch (e) {
    console.log(JSON.stringify({ ok: false, key, err: String(e?.message || e) }));
  }
}

const ip = "192.168.1.100";
const port = "17890";
const url = `http://${ip}:${port}`;

// Common ZK ADMS / push option keys across firmwares
const keys = [
  `CloudServerURL=${url}`,
  `~ZKFPV10URL=${url}`,
  `ICLOCKSVRURL=${url}`,
  `WebServerURL=${url}`,
  `ServerURL=${url}`,
  `ADMSServer=${ip}`,
  `ADMSPort=${port}`,
  `CloudServer=${ip}`,
  `CloudServerPort=${port}`,
  `~CloudUrl=${url}`,
  `ICLOCK_SERVER_URL=${url}`,
  `PushVersion=2.4.1`,
];

for (const kv of keys) await write(kv);
for (const k of ["CloudServerURL","~ZKFPV10URL","ICLOCKSVRURL","CloudServer","CloudServerPort","ADMSServer","ADMSPort"]) await read(k);

try { await zk.disconnect(); } catch {}
