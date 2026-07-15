import { requireAdmin, ok, fail, serverUrl } from "@/lib/api";
import { listDevices, saveDevice, deleteDevice } from "@/lib/store";
import { signDeviceToken } from "@/lib/jwt";
import { sha256, uuid } from "@/lib/utils";
import type { Device } from "@/lib/types";

export const runtime = "nodejs";

// GET /api/devices — list fleet (admin)
export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return fail("Unauthorized", 401);
  const devices = await listDevices();
  return ok({ devices });
}

// POST /api/devices — register a new device, return token + pairing json
export async function POST(req: Request) {
  if (!(await requireAdmin(req))) return fail("Unauthorized", 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  const name = (body?.name || "").toString().trim();
  if (!name) return fail("Device name required");

  const id = uuid();
  const token = await signDeviceToken({ deviceId: id, deviceName: name });
  const tokenHash = await sha256(token);

  const now = Date.now();
  const device: Device = {
    id,
    name,
    status: "offline",
    token_hash: tokenHash,
    last_seen: 0,
    created_at: now,
    capabilities: [],
    telemetry: { reported_at: now },
    telemetry_history: [],
  };

  await saveDevice(device);

  // the pairing JSON the user copies / scans into the APK
  const pairing = {
    server_url: serverUrl(),
    token,
  };

  return ok({ device, token, pairing }, 201);
}
