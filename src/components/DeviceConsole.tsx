"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Smartphone,
  BatteryCharging,
  HardDrive,
  Wifi,
  MapPin,
  Activity,
  Camera,
  Mic,
  MonitorDown,
  Volume2,
  Vibrate,
  Flashlight,
  Lock,
  Sun,
  Power,
  Clipboard,
  Bell,
  Settings2,
  Speaker,
  Gauge,
  FolderOpen,
  Terminal,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  MemoryStick,
  LayoutGrid,
  MonitorSmartphone,
  FlashlightOff,
  Zap,
  Video,
  MonitorPlay,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  Badge,
  StatusDot,
  EmptyState,
  ToastStack,
  useToasts,
} from "@/components/ui";
import { actionsByCategory } from "@/lib/catalog";
import { timeAgo, fmtDate, cn } from "@/lib/utils";
import type { Device, CommandResult } from "@/lib/types";

const ICONS: Record<string, any> = {
  Smartphone, BatteryCharging, HardDrive, Wifi, MapPin, Activity, Camera, Mic,
  MonitorDown, Volume2, Vibrate, Flashlight, FlashlightOff, Zap, Lock, Sun, Power,
  Clipboard, ClipboardList, Bell, Settings2, Speaker, Gauge, FolderOpen, MemoryStick,
  LayoutGrid, MonitorSmartphone, Video, MonitorPlay,
};

type Tab = "info" | "action" | "media" | "history" | "telemetry";

export default function DeviceConsole({ deviceId }: { deviceId: string }) {
  const router = useRouter();
  const [device, setDevice] = useState<Device | null>(null);
  const [results, setResults] = useState<CommandResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("info");
  const [busy, setBusy] = useState<string | null>(null);
  const { toasts, push: pushToast, dismiss } = useToasts();

  // ---- safe loader (never throws; handles non-JSON, 401, network) ----
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/devices/${deviceId}`, { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        setLoadError(`Server returned ${res.status}`);
        setLoading(false);
        return;
      }
      const text = await res.text();
      let j: any;
      try {
        j = JSON.parse(text);
      } catch {
        setLoadError("Received an invalid response from the server.");
        setLoading(false);
        return;
      }
      if (j?.data?.device) setDevice(j.data.device);
      if (Array.isArray(j?.data?.results)) setResults(j.data.results);
      setLoadError(null);
      setLoading(false);
    } catch (e: any) {
      setLoadError(e?.message || "Network error while loading device.");
      setLoading(false);
    }
  }, [deviceId, router]);

  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [load]);

  // ---- send a command and watch for its result by command_id ----
  async function sendCommand(action: string, payload: Record<string, unknown> = {}) {
    const label = humanAction(action);
    setBusy(action);
    pushToast("info", `${label}`, "Command queued — waiting for device…", 3000);

    let commandId: string | null = null;
    try {
      const res = await fetch(`/api/devices/${deviceId}/commands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, payload }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = j?.error || `Failed to queue (${res.status})`;
        pushToast("error", `${label} failed`, msg);
        setBusy(null);
        return;
      }
      commandId = j?.data?.command?.command_id ?? null;
    } catch (e: any) {
      pushToast("error", `${label} failed`, e?.message || "Network error");
      setBusy(null);
      return;
    }

    // poll for the matching result by command_id (no stale closure)
    if (commandId) {
      const deadline = Date.now() + 35000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 1500));
        await load();
        const found = results.find(
          (r) => r.command_id === commandId
        );
        if (found) {
          if (found.status === "success") {
            pushToast("success", `${label} succeeded`, undefined, 4000);
          } else {
            pushToast(
              "error",
              `${label} ${found.status}`,
              found.error || undefined,
              6000
            );
          }
          break;
        }
      }
    }
    setBusy(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-accent-cyan" />
      </div>
    );
  }

  if (loadError && !device) {
    return (
      <EmptyState
        icon={<AlertTriangle className="h-10 w-10" />}
        title="Couldn't load this device"
        description={loadError}
        action={
          <div className="flex gap-2">
            <Button variant="primary" onClick={load}>
              <RefreshCw className="h-4 w-4" /> Retry
            </Button>
            <Link href="/dashboard">
              <Button variant="outline">Back to fleet</Button>
            </Link>
          </div>
        }
      />
    );
  }

  if (!device) {
    return (
      <EmptyState
        title="Device not found"
        description="It may have been removed."
        action={
          <Link href="/dashboard">
            <Button variant="outline">Back to fleet</Button>
          </Link>
        }
      />
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "info", label: "Info & Status" },
    { id: "action", label: "Remote Actions" },
    { id: "media", label: "Media & Sensors" },
    { id: "telemetry", label: "Telemetry" },
    { id: "history", label: "Command History" },
  ];

  const isOffline = device.status !== "online";

  return (
    <div className="space-y-5">
      <ToastStack toasts={toasts} onDismiss={dismiss} />

      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{device.name}</h1>
              <Badge tone={device.status === "online" ? "online" : "offline"}>
                <StatusDot status={device.status} />
                <span className="capitalize">{device.status}</span>
              </Badge>
            </div>
            <p className="font-mono text-xs text-gray-600">{device.id}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* offline banner */}
      {isOffline && (
        <div className="flex items-center gap-2 rounded-lg border border-accent-amber/30 bg-accent-amber/10 px-3 py-2 text-xs text-accent-amber">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Device is offline. Commands will be queued and run when it reconnects.
        </div>
      )}

      {/* quick telemetry strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat icon={BatteryCharging} label="Battery"
          value={typeof device.telemetry?.battery_level === "number" ? `${device.telemetry.battery_level}%` : "—"} />
        <MiniStat icon={HardDrive} label="Free Storage"
          value={typeof device.telemetry?.free_storage_mb === "number" ? `${(device.telemetry.free_storage_mb / 1024).toFixed(1)} GB` : "—"} />
        <MiniStat icon={Wifi} label="Network"
          value={device.telemetry?.network_type || "—"} />
        <MiniStat icon={Clock} label="Last Seen"
          value={device.last_seen ? timeAgo(device.last_seen) : "never"} />
      </div>

      {/* tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition",
              tab === t.id
                ? "border-accent-cyan text-accent-cyan"
                : "border-transparent text-gray-400 hover:text-white"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* tab content */}
      {tab === "info" && <InfoTab device={device} send={sendCommand} busy={busy} />}
      {tab === "action" && <ActionTab send={sendCommand} busy={busy} />}
      {tab === "media" && <MediaTab send={sendCommand} busy={busy} results={results} />}
      {tab === "telemetry" && <TelemetryTab device={device} />}
      {tab === "history" && <HistoryTab results={results} />}
    </div>
  );
}

// ----------------- Info tab -----------------
function InfoTab({ device, send, busy }: { device: Device; send: (a: string) => void; busy: string | null }) {
  const info: [string, string | undefined][] = [
    ["Brand", device.brand],
    ["Model", device.model],
    ["Manufacturer", device.manufacturer],
    ["OS Version", device.os_version],
    ["SDK", device.sdk_version],
    ["Serial", device.serial],
    ["App Version", device.app_version],
    ["Screen", device.screen_resolution],
    ["Platform", device.platform],
  ].filter(([, v]) => !!v) as [string, string][];

  const infoActions = actionsByCategory("info");
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-white">Device Info</h3>
          <Button variant="outline" size="sm" onClick={() => send("device.get_info")} disabled={busy === "device.get_info"}>
            {busy === "device.get_info" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </CardHeader>
        <CardBody>
          {info.length === 0 ? (
            <p className="text-sm text-gray-500">
              No info yet. The device reports this on first heartbeat, or tap refresh.
            </p>
          ) : (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {info.map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border/40 py-1.5 text-sm">
                  <dt className="text-gray-500">{k}</dt>
                  <dd className="font-medium text-gray-200">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h3 className="font-semibold text-white">Status Queries</h3></CardHeader>
        <CardBody className="space-y-2">
          {infoActions.map((a) => (
            <CommandRow key={a.action} icon={ICONS[a.icon]} label={a.label} desc={a.description}
              running={busy === a.action} onClick={() => send(a.action)} />
          ))}
        </CardBody>
      </Card>
    </div>
  );
}

// ----------------- Action tab -----------------
function ActionTab({ send, busy }: { send: (a: string, p?: any) => void; busy: string | null }) {
  const actions = actionsByCategory("action");
  return (
    <Card>
      <CardHeader><h3 className="font-semibold text-white">Remote Actions</h3></CardHeader>
      <CardBody>
        <div className="grid gap-2 sm:grid-cols-2">
          {actions.map((a) => (
            <CommandRow key={a.action} icon={ICONS[a.icon]} label={a.label} desc={a.description}
              running={busy === a.action} onClick={() => send(a.action, payloadFor(a.action))} />
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-500">
          Actions fire instantly when the device is online. If offline, they queue and run on next connect.
        </p>
      </CardBody>
    </Card>
  );
}

// ----------------- Media tab -----------------
function MediaTab({ send, busy, results }: {
  send: (a: string, p?: any) => void; busy: string | null; results: CommandResult[];
}) {
  const actions = actionsByCategory("media");
  // find latest media url in results (guard against missing data)
  const lastMedia = [...results].reverse().find(
    (r) => r.status === "success" && r.data && (r.data.image_url || r.data.audio_url || r.data.screenshot_url || r.data.image_base64 || r.data.audio_base64)
  );
  const imgUrl = lastMedia?.data?.image_url || lastMedia?.data?.screenshot_url || lastMedia?.data?.image_base64;
  const audioUrl = lastMedia?.data?.audio_url || lastMedia?.data?.audio_base64;
  const mediaTs = lastMedia?.completed_at ?? lastMedia?.created_at ?? Date.now();

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader><h3 className="font-semibold text-white">Media & Sensors</h3></CardHeader>
        <CardBody>
          <div className="grid gap-2 sm:grid-cols-2">
            {actions.map((a) => (
              <CommandRow key={a.action} icon={ICONS[a.icon]} label={a.label} desc={a.description}
                running={busy === a.action} onClick={() => send(a.action, payloadFor(a.action))} />
            ))}
          </div>
          <p className="mt-4 rounded-md border border-accent-amber/30 bg-accent-amber/10 px-3 py-2 text-xs text-accent-amber">
            ⚠ Media actions trigger a visible notification on the device — the owner always knows.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h3 className="font-semibold text-white">Last Media</h3></CardHeader>
        <CardBody>
          {lastMedia ? (
            <div className="space-y-2">
              {!!imgUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imgUrl as string} alt="capture" className="w-full rounded-lg border border-border" />
              )}
              {!!audioUrl && (
                <audio controls src={audioUrl as string} className="w-full" />
              )}
              <p className="text-xs text-gray-500">{lastMedia.action} · {timeAgo(mediaTs)}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No media captured yet.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

// ----------------- Telemetry tab -----------------
function TelemetryTab({ device }: { device: Device }) {
  const hist = Array.isArray(device.telemetry_history) ? device.telemetry_history : [];
  return (
    <Card>
      <CardHeader><h3 className="font-semibold text-white">Telemetry</h3></CardHeader>
      <CardBody>
        {hist.length === 0 ? (
          <p className="text-sm text-gray-500">No telemetry yet. It appears as the device sends heartbeats.</p>
        ) : (
          <div className="space-y-4">
            <SimpleChart title="Battery %" data={hist.map((t) => t.battery_level).filter((x): x is number => typeof x === "number")} tone="#22c55e" />
            <SimpleChart title="Free Storage (GB)" data={hist.map((t) => (typeof t.free_storage_mb === "number" ? +(t.free_storage_mb / 1024).toFixed(2) : undefined)).filter((x): x is number => typeof x === "number")} tone="#00f0ff" />
            <SimpleChart title="Free RAM (GB)" data={hist.map((t) => (typeof t.free_memory_mb === "number" ? +(t.free_memory_mb / 1024).toFixed(2) : undefined)).filter((x): x is number => typeof x === "number")} tone="#a855f7" />
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function SimpleChart({ title, data, tone }: { title: string; data: number[]; tone: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 100, H = 30;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x},${y}`;
  }).join(" ");
  return (
    <div>
      <p className="mb-1 text-xs text-gray-500">{title}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-16 w-full" preserveAspectRatio="none">
        <polyline points={pts} fill="none" stroke={tone} strokeWidth="1.5" />
      </svg>
    </div>
  );
}

// ----------------- History tab -----------------
function HistoryTab({ results }: { results: CommandResult[] }) {
  if (results.length === 0) {
    return <EmptyState icon={<Terminal className="h-8 w-8" />} title="No commands yet" description="Commands you send will appear here." />;
  }
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-gray-500">
              <th className="px-4 py-2 font-medium">Action</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="hidden px-4 py-2 font-medium sm:table-cell">Completed</th>
              <th className="px-4 py-2 font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {[...results].reverse().map((r) => (
              <tr key={r.command_id} className="border-b border-border/40">
                <td className="px-4 py-2 font-mono text-xs text-gray-200">{r.action}</td>
                <td className="px-4 py-2">
                  <Badge tone={r.status === "success" ? "online" : r.status === "pending" ? "neutral" : "offline"}>
                    {r.status}
                  </Badge>
                </td>
                <td className="hidden px-4 py-2 text-gray-500 sm:table-cell">
                  {r.completed_at ? fmtDate(r.completed_at) : "—"}
                </td>
                <td className="px-4 py-2">
                  {r.error ? (
                    <span className="text-accent-red">{r.error}</span>
                  ) : r.data ? (
                    <pre className="max-w-xs overflow-auto font-mono text-xs text-gray-400">
                      {JSON.stringify(r.data).slice(0, 150)}
                    </pre>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ----------------- shared bits -----------------
function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 text-gray-500">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </Card>
  );
}

function CommandRow({ icon: Icon, label, desc, running, onClick }: {
  icon: any; label: string; desc: string; running: boolean; onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg-base/40 p-3 transition hover:border-accent-cyan/30">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-bg-hover text-accent-cyan">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-200">{label}</p>
          <p className="truncate text-xs text-gray-500">{desc}</p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onClick} disabled={running} className="shrink-0">
        {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Terminal className="h-3.5 w-3.5" />}
        Run
      </Button>
    </div>
  );
}

// human-readable label for an action string
function humanAction(action: string): string {
  return action
    .split(/[._]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// default payloads for commands that need params
function payloadFor(action: string): Record<string, unknown> {
  switch (action) {
    case "camera.capture": return { camera: "rear", flash: false, quality: "medium" };
    case "mic.record": return { duration_sec: 5, quality: "medium" };
    case "screen.mirror": return { mode: "start", quality: "medium", fps: 10 };
    case "camera.live": return { camera: "rear", mode: "start" };
    case "speaker.play": return { mode: "tts", text: "DeviceBridge connected.", volume: 70 };
    case "sensors.stream": return { sensor: "accelerometer", duration_ms: 3000 };
    case "storage.list": return { path: "/" };
    case "device.vibrate": return { duration_ms: 1000 };
    case "flash.blink": return { duration_ms: 3000, interval_ms: 300 };
    default: return {};
  }
}
