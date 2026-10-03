import ZKLib from "zkteco-js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { createTCPHeader } = require("zkteco-js/src/helper/utils.js");
const { COMMANDS } = require("zkteco-js/src/helper/command.js");

const host = "192.168.1.201";
const port = 4370;
const zk = new ZKLib(host, port, 20000, 5000);
const packets = [];

console.log(JSON.stringify({ stage: "connecting", host, port }));
await zk.createSocket();
console.log(JSON.stringify({ stage: "connected", transport: zk.connectionType || zk.ztcp ? "tcp" : "?" }));
try { await zk.enableDevice(); console.log(JSON.stringify({ stage: "enabled" })); } catch (e) {
  console.log(JSON.stringify({ stage: "enable-skip", err: String(e?.message||e) }));
}

const ztcp = zk.ztcp;
if (!ztcp?.socket) throw new Error("no socket");

ztcp.socket.on("data", (data) => {
  const row = { t: new Date().toISOString(), len: data.length, hex: Buffer.from(data).subarray(0, Math.min(80, data.length)).toString("hex") };
  packets.push(row);
  console.log(JSON.stringify({ stage: "PACKET", ...row }));
});

function reg(mask) {
  ztcp.replyId = (ztcp.replyId || 0) + 1;
  const buf = createTCPHeader(COMMANDS.CMD_REG_EVENT, ztcp.sessionId, ztcp.replyId, Buffer.from(mask));
  ztcp.socket.write(buf);
  console.log(JSON.stringify({ stage: "REG_EVENT", mask: Buffer.from(mask).toString("hex"), session: ztcp.sessionId }));
}

reg([0xff, 0xff, 0x00, 0x00]);
reg([0x01, 0x00, 0x00, 0x00]);
reg([0xff, 0xff, 0xff, 0xff]);

console.log(JSON.stringify({ stage: "listening", seconds: 20, hint: "PRESS THUMB ON MACHINE NOW" }));
await new Promise((r) => setTimeout(r, 20000));
console.log(JSON.stringify({ stage: "summary", packetCount: packets.length, packets }));
try { await zk.disconnect(); } catch {}
process.exit(0);
