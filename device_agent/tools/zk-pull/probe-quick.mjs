import ZKLib from "zkteco-js";
import dgram from "dgram";
import net from "net";

const host = "192.168.1.201";
const port = 4370;

async function tryTcpRealtime(seconds = 12) {
  const zk = new ZKLib(host, port, 15000, 4000);
  const packets = [];
  try {
    await zk.createSocket();
    console.log(JSON.stringify({ stage: "tcp-connected" }));
    try { await zk.enableDevice(); } catch (e) { console.log(JSON.stringify({ stage: "enable", err: String(e?.message||e) })); }
    const ztcp = zk.ztcp;
    ztcp.socket.on("data", (data) => {
      packets.push({ t: Date.now(), len: data.length, hex: data.subarray(0, Math.min(64, data.length)).toString("hex") });
      console.log(JSON.stringify({ stage: "tcp-packet", len: data.length, hex: data.subarray(0, Math.min(64, data.length)).toString("hex") }));
    });
    // register all events
    const { createTCPHeader } = await import("zkteco-js/src/helper/utils.js").catch(() => ({}));
  } catch (e) {
    console.log(JSON.stringify({ stage: "tcp-fail", err: String(e?.message||e) }));
    return packets;
  }
  // keep using require style via createRequire in next script - simplify:
  await new Promise((r) => setTimeout(r, seconds * 1000));
  try { await zk.disconnect(); } catch {}
  console.log(JSON.stringify({ stage: "tcp-done", packetCount: packets.length }));
  return packets;
}

console.log(JSON.stringify({ stage: "start", note: "press thumb on machine during next 15s if possible" }));
await tryTcpRealtime(8);
