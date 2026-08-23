import * as React from "react";

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

// Fetch maintenance settings from dedicated under_construction endpoint
export async function fetchMaintenanceSettings(): Promise<MaintenanceSettings> {
  const defaultSettings: MaintenanceSettings = {
    websiteMaintenance: false,
    allowedIps: [],
    moduleMaintenance: {}
  };

  try {
    const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/under-construction");
    if (!res.ok) return defaultSettings;
    const json = await res.json();
    
    return {
      websiteMaintenance: false,
      allowedIps: [],
      moduleMaintenance: json.modules || {}
    };
  } catch (err) {
    console.error("Failed to fetch under construction settings:", err);
    return defaultSettings;
  }
}

// Save a module's under construction state via dedicated endpoint
export async function saveModuleUnderConstruction(moduleName: string, isUnderConstruction: boolean): Promise<boolean> {
  try {
    const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/under-construction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module_name: moduleName,
        is_under_construction: isUnderConstruction
      })
    });
    if (!res.ok) return false;
    const json = await res.json();
    return !!json.success;
  } catch (e) {
    console.error("Failed to save under construction module setting:", e);
    return false;
  }
}

// Bulk save under construction modules map via dedicated endpoint
export async function saveAllUnderConstructionModules(modulesMap: Record<string, boolean>): Promise<boolean> {
  try {
    const res = await fetch("https://ib-v2.hsgglobalpteltd.workers.dev/api/under-construction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modules_map: modulesMap
      })
    });
    if (!res.ok) return false;
    const json = await res.json();
    return !!json.success;
  } catch (e) {
    console.error("Failed to save bulk under construction settings:", e);
    return false;
  }
}

// Check if current client is in localhost / development environment
export function isLocalhostEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.startsWith("192.168.") ||
    hostname.endsWith(".local")
  );
}

// Evaluate if maintenance mode applies (Localhost always bypasses under construction)
export function checkIsUnderMaintenance(
  settings: MaintenanceSettings,
  clientIp?: string,
  targetModule?: string
): boolean {
  // Developer Localhost Bypass: Localhost developers have full unrestricted access to all modules
  if (isLocalhostEnvironment()) {
    return false;
  }

  // 1. Module-specific Under Construction Rule (Blocks non-localhost users)
  if (targetModule && settings.moduleMaintenance && settings.moduleMaintenance[targetModule]) {
    return true;
  }

  // 2. IP Exclusion / Whitelist Rule for Global Website Maintenance
  if (clientIp) {
    const cleanClientIp = clientIp.trim().toLowerCase();
    const isWhitelisted = settings.allowedIps.some(ip => ip.trim().toLowerCase() === cleanClientIp);
    if (isWhitelisted) {
      return false; // whitelisted IP bypasses global maintenance mode
    }
  }

  // 3. Website-wide Maintenance Rule
  if (!targetModule && settings.websiteMaintenance) {
    return true;
  }

  return false;
}

// React hook to subscribe to live maintenance settings
export function useMaintenanceSettings() {
  const [settings, setSettings] = React.useState<MaintenanceSettings>({
    websiteMaintenance: false,
    allowedIps: [],
    moduleMaintenance: {}
  });
  const [loading, setLoading] = React.useState<boolean>(true);

  const loadSettings = React.useCallback(async () => {
    try {
      const data = await fetchMaintenanceSettings();
      setSettings(data);
    } catch (e) {
      console.error("Failed to load maintenance settings in hook:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadSettings();
    const handleRefresh = () => {
      loadSettings();
    };
    window.addEventListener("db-refresh", handleRefresh);
    return () => window.removeEventListener("db-refresh", handleRefresh);
  }, [loadSettings]);

  return { settings, setSettings, loading, reload: loadSettings };
}
