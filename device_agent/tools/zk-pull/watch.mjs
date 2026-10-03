/**
 * ZK realtime watcher — SDK first, then POST Beautora API.
 * Usage: node watch.mjs <host> <port> [appUrl]
 *
 * Writes a human-readable log to ../../logs/zk-watcher.log (from tools/zk-pull).
 * Prints one JSON object per line on stdout for the C# host.
 */
import ZKLib from "zkteco-js";
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const {
  createTCPHeader,
  decodeRecordRealTimeLog52,
  decodeRecordRealTimeLog18,
  removeTcpHeader,
} = require("zkteco-js/src/helper/utils.js");
const { COMMANDS } = require("zkteco-js/src/helper/command.js");

const host = process.argv[2] || "192.168.1.201";
const port = Number(process.argv[3] || 4370);
const appUrl = (process.argv[4] || process.env.BEAUTORA_APP_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  ""
);
const agentKey = process.env.SYNCOPS_AGENT_API_KEY || "SyncOps@12345";
const agentUrl = (process.env.SYNCOPS_AGENT_URL || "http://127.0.0.1:17890").replace(/\/$/, "");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logDir = path.resolve(__dirname, "..", "..", "logs");
const logFile = path.join(logDir, "zk-watcher.log");
const statusFile = path.join(logDir, "zk-watcher-status.json");

fs.mkdirSync(logDir, { recursive: true });

const state = {
  startedAt: new Date().toISOString(),
  host,
  port,
  appUrl,
  connected: false,
  packetCount: 0,
  ackCount: 0,
  eventCount: 0,
  punchCount: 0,
  lastPacketAt: null,
  lastPacketHex: null,
  lastPunchUserId: null,
  lastPunchAt: null,
  lastPushOk: null,
  lastError: null,
  message: "starting",
};

const recentKeys = new Set();
const zk = new ZKLib(host, port, 20000, 5000);

function emit(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

function logLine(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  try {
    fs.appendFileSync(logFile, line + "\n");
  } catch {
    /* ignore */
  }
  emit({ type: "log", message: msg });
}

function writeStatus(extra = {}) {
  Object.assign(state, extra);
  try {
    fs.writeFileSync(statusFile, JSON.stringify(state, null, 2));
  } catch {
    /* ignore */
  }
  emit({ type: "status", ...state });
}

function extractUserId(data) {
  if (!data) return "";

  if (Buffer.isBuffer(data)) {
    try {
      const d52 = decodeRecordRealTimeLog52(data);
      const id = String(d52?.userId ?? "").trim();
      if (id) return id;
    } catch {
      /* continue */
    }

    try {
      const payload = (() => {
        try {
          return removeTcpHeader(data);
        } catch {
          return data;
        }
      })();
      if (payload && payload.length >= 9) {
        const d18 = decodeRecordRealTimeLog18(payload);
        if (d18?.userId != null && d18.userId !== 0) return String(d18.userId);
      }
    } catch {
      /* continue */
    }

    try {
      const payload = removeTcpHeader(data);
      const ascii = payload.toString("binary");
      const m = ascii.match(/[1-9][0-9]{0,8}/);
      if (m) return m[0];
    } catch {
      /* continue */
    }

    try {
      const payload = removeTcpHeader(data);
      if (payload.length >= 12) {
        const u16 = payload.readUInt16LE(8);
        if (u16 > 0 && u16 < 100000) return String(u16);
      }
    } catch {
      /* continue */
    }

    return "";
  }

  return String(
    data.deviceUserId ?? data.userId ?? data.uid ?? data.user_id ?? ""
  ).trim();
}

function extractTime(data) {
  if (Buffer.isBuffer(data)) {
    try {
      const d52 = decodeRecordRealTimeLog52(data);
      const t = d52?.attTime;
      if (t instanceof Date && !Number.isNaN(t.getTime())) return t.toISOString();
      if (typeof t === "string") return new Date(t).toISOString();
    } catch {
      /* fall through */
    }
  }
  const time = data?.recordTime ?? data?.attTime ?? data?.time ?? data?.timestamp;
  if (!time) return new Date().toISOString();
  return typeof time === "string" ? time : new Date(time).toISOString();
}

async function pushToBeautora(userId, atIso) {
  const externalKey = `${userId}@${new Date(atIso).getTime()}`;
  const dedupe = `${userId}@${Math.floor(new Date(atIso).getTime() / 1000)}`;
  if (recentKeys.has(dedupe)) {
    logLine(`SDK punch deduped user=${userId}`);
    return { ok: true, deduped: true };
  }
  recentKeys.add(dedupe);
  if (recentKeys.size > 200) {
    const first = recentKeys.values().next().value;
    recentKeys.delete(first);
  }

  logLine(`API POST ${appUrl}/api/agent/thumb-punch thumbId=${userId}`);
  try {
    const res = await fetch(`${appUrl}/api/agent/thumb-punch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Beautora-Agent-Key": agentKey,
      },
      body: JSON.stringify({
        thumbId: userId,
        action: "toggle",
        at: atIso,
        externalKey,
      }),
    });
    const text = await res.text();
    const ok = res.ok;
    logLine(`API response ${res.status} ${text.slice(0, 200)}`);
    emit({
      type: "push",
      ok,
      status: res.status,
      userId,
      body: text.slice(0, 300),
    });
    writeStatus({ lastPushOk: ok });
    return { ok, status: res.status, body: text };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    logLine(`API ERROR ${error}`);
    emit({ type: "push-error", userId, error });
    writeStatus({ lastError: error, lastPushOk: false });
    return { ok: false, error };
  }
}

async function handlePunch(userId, atIso, rawHex) {
  const id = String(userId ?? "").trim();
  if (!id) {
    logLine(`event without userId hex=${rawHex || ""}`);
    emit({ type: "debug", message: "empty userId", hex: rawHex });
    return;
  }
  state.punchCount += 1;
  writeStatus({
    lastPunchUserId: id,
    lastPunchAt: atIso,
    message: `punch user=${id}`,
  });
  logLine(`SDK ATTENDANCE userId=${id} at=${atIso}`);
  emit({ type: "attendance", userId: id, at: atIso });
  await pushToBeautora(id, atIso);
}

function registerEvents(ztcp) {
  ztcp.replyId = (ztcp.replyId || 0) + 1;
  const eventMask = Buffer.from([0xff, 0xff, 0x00, 0x00]);
  const reg = createTCPHeader(
    COMMANDS.CMD_REG_EVENT,
    ztcp.sessionId,
    ztcp.replyId,
    eventMask
  );
  ztcp.socket.write(reg);
  logLine("SDK REG_EVENT subscribed (mask=ffff0000)");
}

async function main() {
  logLine(`=== watcher start host=${host}:${port} app=${appUrl} agent=${agentUrl} ===`);
  logLine("Flow: Machine thumb → ZK TCP SDK → decode → POST /api/agent/thumb-punch");
  writeStatus({ message: "connecting to ZK SDK…" });

  await zk.createSocket();
  writeStatus({ connected: true, message: "SDK TCP connected — waiting for thumb events" });
  logLine("SDK TCP connected OK");

  try {
    await zk.enableDevice();
    logLine("SDK enableDevice OK");
  } catch (e) {
    logLine(`SDK enableDevice skipped: ${e?.message || e}`);
  }

  const ztcp = zk.ztcp;
  if (!ztcp?.socket) throw new Error("TCP socket missing after connect");

  ztcp.socket.on("data", (data) => {
    void (async () => {
      try {
        if (!Buffer.isBuffer(data) || data.length < 8) return;
        const hex = data.subarray(0, Math.min(80, data.length)).toString("hex");
        state.packetCount += 1;
        state.lastPacketAt = new Date().toISOString();
        state.lastPacketHex = hex;

        let commandId = null;
        try {
          const payload = removeTcpHeader(data);
          if (payload && payload.length >= 2) commandId = payload.readUIntLE(0, 2);
        } catch {
          /* ignore */
        }

        // Pure ACK packets are 16 bytes (REG_EVENT replies) — not attendance.
        if (data.length <= 16) {
          state.ackCount += 1;
          logLine(`SDK ACK/keepalive len=${data.length} cmd=${commandId} hex=${hex}`);
          writeStatus({ message: "SDK connected — ACK only (no thumb event yet)" });
          return;
        }

        state.eventCount += 1;
        logLine(`SDK EVENT len=${data.length} cmd=${commandId} hex=${hex}`);
        writeStatus({ message: `SDK event len=${data.length}` });

        const maybeEvent =
          commandId === COMMANDS.CMD_REG_EVENT ||
          commandId === 500 ||
          data.length >= 28;

        if (!maybeEvent) {
          emit({ type: "debug", message: "ignored packet", commandId, hex });
          return;
        }

        const userId = extractUserId(data);
        if (!userId) {
          logLine(`SDK event could not decode userId hex=${hex}`);
          emit({ type: "debug", message: "event without userId", commandId, hex });
          return;
        }

        await handlePunch(userId, extractTime(data), hex);
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        logLine(`SDK handler error: ${error}`);
        emit({ type: "error", error });
        writeStatus({ lastError: error });
      }
    })();
  });

  registerEvents(ztcp);

  try {
    await zk.getRealTimeLogs((data) => {
      void handlePunch(extractUserId(data), extractTime(data));
    });
    logLine("SDK getRealTimeLogs helper attached");
  } catch (e) {
    logLine(`SDK getRealTimeLogs failed: ${e?.message || e}`);
  }

  setInterval(() => {
    try {
      if (ztcp?.socket) registerEvents(ztcp);
    } catch (e) {
      logLine(`re-register error: ${e}`);
    }
  }, 20000);

  // NOTE: Do NOT call getAttendances() here while the custom socket 'data'
  // handler is attached — it steals protocol replies and times out.
  // This device model needs Cloud/ADMS HTTP push for punches.

  setInterval(() => {
    const msg =
      state.punchCount > 0
        ? `heartbeat punches=${state.punchCount} packets=${state.packetCount}`
        : `heartbeat WAITING for Cloud/ADMS — TCP realtime silent on this model. Set Cloud Server=${process.env.SYNCOPS_LAN_IP || "192.168.1.100"}:17890 Proxy=OFF`;
    logLine(msg);
    writeStatus({
      message:
        state.punchCount > 0
          ? `ok — ${state.punchCount} punch(es) forwarded to API`
          : "SDK TCP ok — waiting for Cloud ADMS or realtime event",
    });
    emit({
      type: "heartbeat",
      packetCount: state.packetCount,
      ackCount: state.ackCount,
      eventCount: state.eventCount,
      punchCount: state.punchCount,
      lastPunchUserId: state.lastPunchUserId,
    });
  }, 10000);

  logLine("SDK listening — prefer Cloud ADMS (device → PC:17890/iclock). TCP thank-you alone is not enough.");
  writeStatus({ message: "SDK listening — configure Cloud ADMS on device" });
  await new Promise(() => {});
}

main().catch(async (e) => {
  const error =
    e instanceof Error
      ? e.message
      : typeof e === "object" && e !== null
        ? JSON.stringify(e)
        : String(e);
  logLine(`FATAL ${error}`);
  writeStatus({ connected: false, lastError: error, message: `fatal: ${error}` });
  emit({ type: "fatal", error });
  try {
    await zk.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});

process.on("SIGINT", async () => {
  logLine("watcher stopped (SIGINT)");
  try {
    await zk.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(0);
});
