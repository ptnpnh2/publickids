// Minimal read-only Synology Surveillance Station gateway. See README.md.
import http from 'node:http';

const { SYNO_URL, SYNO_USER, SYNO_PASS, PORT = '8787' } = process.env;
const ALLOWED = JSON.parse(process.env.ALLOWED_CAMERAS ?? '{}');
const MAX_SECONDS = 60;
let busy = false;

async function synoLogin() {
  const u = new URL('/webapi/auth.cgi', SYNO_URL);
  u.search = new URLSearchParams({ api: 'SYNO.API.Auth', version: '6', method: 'login', account: SYNO_USER, passwd: SYNO_PASS, session: 'SurveillanceStation', format: 'sid' }).toString();
  const j = await (await fetch(u)).json();
  if (!j.success) throw new Error('login failed');
  return j.data.sid;
}

async function synoLogout(sid) {
  const u = new URL('/webapi/auth.cgi', SYNO_URL);
  u.search = new URLSearchParams({ api: 'SYNO.API.Auth', version: '6', method: 'logout', session: 'SurveillanceStation', _sid: sid }).toString();
  await fetch(u).catch(() => {});
}

/** Records `seconds` of the camera via a manual recording, then downloads that one recording. */
async function eventClip(cameraId, seconds) {
  const sid = await synoLogin();
  try {
    const call = async (params) => {
      const u = new URL('/webapi/entry.cgi', SYNO_URL);
      u.search = new URLSearchParams({ ...params, _sid: sid }).toString();
      return fetch(u);
    };
    await (await call({ api: 'SYNO.SurveillanceStation.ExternalRecording', version: '2', method: 'Record', cameraId, action: 'start' })).json();
    await new Promise((r) => setTimeout(r, seconds * 1000));
    await (await call({ api: 'SYNO.SurveillanceStation.ExternalRecording', version: '2', method: 'Record', cameraId, action: 'stop' })).json();
    const list = await (await call({ api: 'SYNO.SurveillanceStation.Recording', version: '6', method: 'List', cameraIds: cameraId, limit: '1', fromTime: String(Math.floor(Date.now() / 1000) - seconds - 30) })).json();
    const rec = list?.data?.recordings?.[0];
    if (!rec) throw new Error('no recording');
    const res = await call({ api: 'SYNO.SurveillanceStation.Recording', version: '6', method: 'Download', id: String(rec.id), mountId: '0' });
    return res;
  } finally {
    await synoLogout(sid);
  }
}

http
  .createServer(async (req, res) => {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', 'content-type');
    if (req.method === 'OPTIONS') return res.writeHead(204).end();
    if (req.method === 'GET' && req.url === '/health') return res.writeHead(200, { 'content-type': 'application/json' }).end('{"ok":true}');
    if (req.method !== 'POST' || req.url !== '/clip') return res.writeHead(404).end();
    if (busy) return res.writeHead(429).end('busy');
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      const { cameraId, seconds } = JSON.parse(body || '{}');
      const synoCam = ALLOWED[cameraId];
      if (!synoCam) return res.writeHead(403).end('camera not allowed');
      const s = Math.max(5, Math.min(MAX_SECONDS, Number(seconds) || 20));
      busy = true;
      const upstream = await eventClip(synoCam, s);
      res.writeHead(200, { 'content-type': upstream.headers.get('content-type') ?? 'video/mp4' });
      for await (const chunk of upstream.body) res.write(chunk);
      res.end();
    } catch (e) {
      res.writeHead(502).end(String(e.message));
    } finally {
      busy = false;
    }
  })
  .listen(Number(PORT), () => console.log(`camera gateway on :${PORT}`));
