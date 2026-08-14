"use client";

export interface MaintenanceSettings {
  websiteMaintenance: boolean;
  allowedIps: string[];
  moduleMaintenance: Record<string, boolean>;
}

// Fetch current client IP from worker
export async function getClientIp(): Promise<string> {
  try {
    const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/client-ip");
    if (!res.ok) return "127.0.0.1";
    const data = await res.json();
    return data.ip || "127.0.0.1";
  } catch (e) {
    console.warn("Failed to fetch client IP:", e);
    return "127.0.0.1";
  }
}

// Fetch maintenance settings from Setting_API table
export async function fetchMaintenanceSettings(): Promise<MaintenanceSettings> {
  const defaultSettings: MaintenanceSettings = {
    websiteMaintenance: false,
    allowedIps: [],
    moduleMaintenance: {}
  };

  try {
    const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/admin/db?table=Setting_API");
    if (!res.ok) return defaultSettings;
    const list = await res.json();
    if (!Array.isArray(list)) return defaultSettings;

    const webRow = list.find((item) => item.id === "maintenance_website");
    const ipsRow = list.find((item) => item.id === "maintenance_allowed_ips");
    const modRow = list.find((item) => item.id === "maintenance_modules");

    let allowedIps: string[] = [];
    if (ipsRow?.Key || ipsRow?.value) {
      const raw = ipsRow.Key || ipsRow.value || "";
      allowedIps = raw.split(",").map((s: string) => s.trim()).filter(Boolean);
    }

    let moduleMaintenance: Record<string, boolean> = {};
    if (modRow?.Key || modRow?.value) {
      try {
        moduleMaintenance = JSON.parse(modRow.Key || modRow.value || "{}");
      } catch (err) {
        console.warn("Failed to parse module maintenance JSON:", err);
      }
    }

    return {
      websiteMaintenance: webRow?.Key === "true" || webRow?.value === "true",
      allowedIps,
      moduleMaintenance
    };
  } catch (err) {
    console.error("Failed to fetch maintenance settings:", err);
    return defaultSettings;
  }
}

// Save maintenance settings to the backend database
export async function saveMaintenanceSetting(id: string, value: string): Promise<boolean> {
  try {
    const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/admin/db-write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "Setting_API",
        action: "upsert",
        data: {
          id,
          Name: id.replace(/_/g, " "),
          Key: value
        }
      })
    });
    if (!res.ok) return false;
    const json = await res.json();
    return !!json.success;
  } catch (e) {
    console.error("Failed to save maintenance setting:", e);
    return false;
  }
}

// Evaluate if maintenance mode applies
export function checkIsUnderMaintenance(
  settings: MaintenanceSettings,
  clientIp: string,
  targetModule?: string
): boolean {
  // 1. Localhost Bypass Rule
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.")
    ) {
      return false; // local development bypasses maintenance mode
    }
  }

  // 2. IP Exclusion Rule
  const cleanClientIp = (clientIp || "").trim().toLowerCase();
  const isWhitelisted = settings.allowedIps.some(ip => ip.trim().toLowerCase() === cleanClientIp);
  if (isWhitelisted) {
    return false; // whitelisted IP bypasses maintenance mode
  }

  // 3. Website-wide Maintenance Rule
  if (settings.websiteMaintenance) {
    return true;
  }

  // 4. Module-specific Maintenance Rule
  if (targetModule && settings.moduleMaintenance[targetModule]) {
    return true;
  }

  return false;
}
