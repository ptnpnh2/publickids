# Camera gateway (optional, V2)

A tiny read-only bridge between the app and a Synology Surveillance Station (or any IP camera)
on the home network. The app never talks to the camera system directly and never gets a live stream:
it POSTs `/clip` and receives a short event clip.

```
POST /clip   { "cameraId": "...", "seconds": 20, "purpose": "pushups" }  →  video/mp4 (≤ 60 s)
GET  /health →  { ok: true }
```

Guardrails enforced here in addition to the app:
- Only cameras listed in `ALLOWED_CAMERAS` (map app camera ids → Surveillance Station camera ids).
- Clip length clamped to 60 s; one request at a time; no history/recording browsing endpoints.
- Uses a **read-only** Surveillance Station account; credentials live only on the gateway host.
- Clips are streamed back and not stored on the gateway.

## Run
```bash
SYNO_URL=https://nas.local:5001 SYNO_USER=kids-readonly SYNO_PASS=... \
ALLOWED_CAMERAS='{"cam-livingroom":"3"}' PORT=8787 node gateway/synology-gateway.mjs
```
Then set `http://<gateway-host>:8787` as the gateway URL in the app (More → Settings → Camera connector).
Serve it over HTTPS on your LAN (a reverse proxy with a local certificate) if the app is loaded over HTTPS.

This gateway has not been tested against a real NAS in this repository; the Surveillance Station
API calls follow the public WebAPI (`SYNO.API.Auth`, `SYNO.SurveillanceStation.Camera`,
`SYNO.SurveillanceStation.Recording`) and may need adjusting to your DSM version.
