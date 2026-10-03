import ZKLib from "zkteco-js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { createTCPHeader, removeTcpHeader } = require("zkteco-js/src/helper/utils.js");
const { COMMANDS } = require("zkteco-js/src/helper/command.js");

const host = "192.168.1.201";
const zk = new ZKLib(host, 4370, 12000, 4000);
await zk.createSocket();
console.log("connected");

async function tryOpt(name, fn) {
  try {
    const v = await fn();
    console.log(JSON.stringify({ ok:true, name, v: String(v) }));
  } catch (e) {
    console.log(JSON.stringify({ ok:false, name, err: String(e?.message||e) }));
  }
}

await tryOpt("serial", () => zk.getSerialNumber());
await tryOpt("platform", () => zk.getPlatform());
await tryOpt("deviceVersion", () => zk.getDeviceVersion());
await tryOpt("firmware", () => zk.getFirmware());
await tryOpt("info", () => zk.getInfo());

// try write cloud options (common ADMS keys)
async function writeOption(kv) {
  try {
    const data = await zk.ztcp.executeCmd(COMMANDS.CMD_OPTIONS_WRQ, kv);
    console.log(JSON.stringify({ ok:true, write: kv, replyLen: data?.length }));
  } catch (e) {
    console.log(JSON.stringify({ ok:false, write: kv, err: String(e?.message||e) }));
  }
}

const cloud = "http://192.168.1.100:17890";
await writeOption(`CloudServerURL=${cloud}`);
await writeOption(`~ZKFPV10URL=${cloud}`);
await writeOption(`ICLOCKSVRURL=${cloud}`);
await writeOption(`WebServerURL=${cloud}`);

try { await zk.disconnect(); } catch {}
