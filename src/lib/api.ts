"use client";

import { auth } from "./firebase";

export interface UserProfile {
  email: string;
  name: string;
  phone_number: string | null;
  role: "Administrator" | "Operator" | string;
  pages_access: string[]; // parsed JSON array
  modules_access: any; // parsed JSON object or array
  active: number; // 0 = inactive, 1 = active, 2 = blocked
  employee_id?: string | null;
  manager_pin?: string | null;
  contract_signature_base64?: string | null;
  contract_pdf_link?: string | null;
  contract_signed_at?: number | null;
}

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

// Resolves a fresh token from Firebase Auth dynamically, falling back to the passed state token
async function getFreshToken(passedToken?: string): Promise<string> {
  if (auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken(false);
      if (token) return token;
    } catch (e) {
      console.warn("Failed to get fresh Firebase token:", e);
    }
  }
  return passedToken || "";
}

// Returns X-Session-ID header if it exists in client storage
function getSessionIdHeader(): Record<string, string> {
  if (typeof window !== "undefined") {
    const sid = localStorage.getItem("session_id");
    if (sid) {
      return { "X-Session-ID": sid };
    }
  }
  return {};
}

// Standard response handler to parse structured API error messages
async function handleResponse(res: Response, errorPrefix: string): Promise<any> {
  if (!res.ok) {
    let errBody: any = null;
    let errText = "";
    try {
      errText = await res.text();
      errBody = JSON.parse(errText);
    } catch {}
    if (errBody && errBody.error) {
      if (errBody.error === "session_superseded" && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ib-session-superseded", { detail: errBody }));
      }
      const err = new Error(errBody.message || errBody.error || `${errorPrefix} failed: ${res.statusText}`);
      (err as any).code = errBody.error;
      throw err;
    }
    throw new Error(`${errorPrefix} failed: ${errText || res.statusText}`);
  }
  return res.json();
}

// Parsing JSON safely for array
function safeParseAccess(field: any): string[] {
  if (Array.isArray(field)) return field;
  if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// Parsing JSON safely for object or array
function safeParseModulesAccess(field: any): any {
  if (typeof field === "object" && field !== null) return field;
  if (typeof field === "string") {
    try {
      return JSON.parse(field);
    } catch {
      return {};
    }
  }
  return {};
}

// 0. PIN FAST LOGIN
export async function loginWithPin(
  pin: string,
  sessionId?: string | null,
  force?: boolean
): Promise<{ user: UserProfile; token: string; employee?: any }> {
  const res = await fetch(`${WORKER_URL}/api/users/pin-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionId ? { "X-Session-ID": sessionId } : getSessionIdHeader()),
    },
    body: JSON.stringify({ pin, session_id: sessionId, force }),
  });
  const data = await handleResponse(res, "PIN Login");
  if (data && data.error) {
    const err = new Error(data.message || data.error);
    (err as any).code = data.error;
    (err as any).email = data.email;
    (err as any).name = data.name;
    throw err;
  }
  return {
    ...data,
    user: {
      ...data.user,
      pages_access: safeParseAccess(data.user.pages_access),
      modules_access: safeParseModulesAccess(data.user.modules_access),
    }
  };
}

// 1. SYNC USER PROFILE
export async function syncUserProfile(
  idToken: string, 
  email: string, 
  name: string,
  sessionId?: string | null,
  force?: boolean
): Promise<UserProfile> {
  const token = await getFreshToken(idToken);
  const res = await fetch(`${WORKER_URL}/api/users/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(sessionId ? { "X-Session-ID": sessionId } : getSessionIdHeader()),
    },
    body: JSON.stringify({ email, name, session_id: sessionId, force }),
  });
  const data = await handleResponse(res, "Profile sync");
  if (data && data.error) {
    const err = new Error(data.message || data.error);
    (err as any).code = data.error;
    throw err;
  }
  return {
    ...data,
    pages_access: safeParseAccess(data.pages_access),
    modules_access: safeParseModulesAccess(data.modules_access),
  };
}

// 2. GET CURRENT PROFILE
export async function fetchMyProfile(idToken: string, email: string): Promise<UserProfile> {
  const token = await getFreshToken(idToken);
  const res = await fetch(`${WORKER_URL}/api/users/me`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      ...getSessionIdHeader(),
    },
  });
  const data = await handleResponse(res, "Retrieve profile");
  return {
    ...data,
    pages_access: safeParseAccess(data.pages_access),
    modules_access: safeParseModulesAccess(data.modules_access),
  };
}

// 3. UPDATE PROFILE
export async function updateOwnProfile(
  idToken: string, 
  email: string, 
  name: string, 
  phoneNumber: string,
  managerPin?: string | null
): Promise<UserProfile> {
  const token = await getFreshToken(idToken);
  const res = await fetch(`${WORKER_URL}/api/users/update-profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...getSessionIdHeader(),
    },
    body: JSON.stringify({ 
      name, 
      phone_number: phoneNumber,
      manager_pin: managerPin !== undefined ? managerPin : undefined
    }),
  });
  const data = await handleResponse(res, "Update profile");
  return {
    ...data,
    pages_access: safeParseAccess(data.pages_access),
    modules_access: safeParseModulesAccess(data.modules_access),
  };
}

export async function updateMyProfile(
  idToken: string,
  params: { name?: string; phone_number?: string | null; manager_pin?: string | null }
): Promise<UserProfile> {
  const token = await getFreshToken(idToken);
  const res = await fetch(`${WORKER_URL}/api/users/update-profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...getSessionIdHeader(),
    },
    body: JSON.stringify(params),
  });
  const data = await handleResponse(res, "Update profile");
  return {
    ...data,
    pages_access: safeParseAccess(data.pages_access),
    modules_access: safeParseModulesAccess(data.modules_access),
  };
}

// 4. GET ALL USERS (Admin only)
export async function fetchAllUsers(idToken: string, email: string): Promise<UserProfile[]> {
  const token = await getFreshToken(idToken);
  const res = await fetch(`${WORKER_URL}/api/users`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      ...getSessionIdHeader(),
    },
  });
  const results = await handleResponse(res, "Retrieve users") as any[];
  return results.map((u) => ({
    ...u,
    pages_access: safeParseAccess(u.pages_access),
    modules_access: safeParseModulesAccess(u.modules_access),
  }));
}

// 5. UPDATE OTHER USER
export async function adminUpdateUser(
  idToken: string,
  requestorEmail: string,
  targetEmail: string,
  role: string,
  pagesAccess: string[],
  modulesAccess: any,
  active: number,
  name?: string,
  phoneNumber?: string | null,
  employeeId?: string | null
): Promise<UserProfile> {
  const token = await getFreshToken(idToken);
  const res = await fetch(`${WORKER_URL}/api/users/admin-update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...getSessionIdHeader(),
    },
    body: JSON.stringify({
      email: targetEmail,
      role,
      pages_access: pagesAccess,
      modules_access: modulesAccess,
      active,
      name,
      phone_number: phoneNumber,
      employee_id: employeeId,
    }),
  });
  const data = await handleResponse(res, "Update user");
  return {
    ...data,
    pages_access: safeParseAccess(data.pages_access),
    modules_access: safeParseModulesAccess(data.modules_access),
  };
}

// 6. DELETE USER (Admin only)
export async function adminDeleteUser(
  idToken: string,
  requestorEmail: string,
  targetEmail: string
): Promise<{ success: boolean; email: string }> {
  const token = await getFreshToken(idToken);
  const res = await fetch(`${WORKER_URL}/api/users/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...getSessionIdHeader(),
    },
    body: JSON.stringify({ email: targetEmail }),
  });
  return handleResponse(res, "Delete user");
}

// 6b. LOGOUT USER (Clear active session from DB)
export async function logoutUser(token?: string, email?: string): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`${WORKER_URL}/api/users/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ email }),
    });
    return await res.json();
  } catch (err) {
    console.warn("Logout API call failed:", err);
    return { success: false };
  }
}

// 7. CONTRACT APIs
export async function fetchLatestContract(): Promise<{ text: string; updated_at: number }> {
  const res = await fetch(`${WORKER_URL}/api/contract/latest`, {
    method: "GET",
  });
  return handleResponse(res, "Retrieve latest contract");
}

export async function adminUpdateContract(idToken: string, text: string): Promise<{ success: boolean; updated_at: number }> {
  const token = await getFreshToken(idToken);
  const res = await fetch(`${WORKER_URL}/api/contract/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...getSessionIdHeader(),
    },
    body: JSON.stringify({ text }),
  });
  return handleResponse(res, "Update contract");
}

export async function startSigningSession(email: string): Promise<{ session_id: string }> {
  const res = await fetch(`${WORKER_URL}/api/contract/start-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });
  return handleResponse(res, "Start signing session");
}

export async function pollSigningSession(sessionId: string): Promise<{
  session_id: string;
  email: string;
  status: string;
  name?: string;
  phone?: string;
  signature_data?: string;
}> {
  const res = await fetch(`${WORKER_URL}/api/contract/session-status?sessionId=${encodeURIComponent(sessionId)}`, {
    method: "GET",
  });
  return handleResponse(res, "Poll signing status");
}

export async function submitMobileSignature(
  sessionId: string,
  name: string,
  phone: string,
  signatureData: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${WORKER_URL}/api/contract/submit-signature`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_id: sessionId,
      name,
      phone,
      signature_data: signatureData,
    }),
  });
  return handleResponse(res, "Submit signature");
}

export async function finalizeContractSignature(
  idToken: string,
  email: string,
  name: string,
  phone: string,
  signatureBase64: string,
  pdfLink: string,
  signedAt: number
): Promise<UserProfile> {
  const token = await getFreshToken(idToken);
  const res = await fetch(`${WORKER_URL}/api/contract/finalize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...getSessionIdHeader(),
    },
    body: JSON.stringify({
      email,
      name,
      phone_number: phone,
      signature_base64: signatureBase64,
      pdf_link: pdfLink,
      signed_at: signedAt,
    }),
  });
  const data = await handleResponse(res, "Finalize contract signing");
  return {
    ...data,
    pages_access: safeParseAccess(data.pages_access),
    modules_access: safeParseAccess(data.modules_access),
  };
}

// 8. GOOGLE DRIVE ASSET LIBRARY APIs
export interface AssetFile {
  id: string;
  name: string;
  isFolder: boolean;
  mimeType: string;
  size?: number;
  url?: string;
  downloadUrl?: string;
}

export interface AssetListResponse {
  parentId: string;
  folders: AssetFile[];
  files: AssetFile[];
}

export async function fetchAssets(folderId?: string, skipCache = false): Promise<AssetListResponse> {
  const buster = `t=${Date.now()}`;
  let target = `${WORKER_URL}/api/assets/list?`;
  if (folderId) {
    target += `folderId=${encodeURIComponent(folderId)}&`;
  }
  if (skipCache) {
    target += `skipCache=true&`;
  }
  target += buster;
  const res = await fetch(target, {
    method: "GET",
  });
  return handleResponse(res, "Retrieve assets");
}

export async function createAssetFolder(name: string, parentId?: string): Promise<{ success: boolean; id: string; name: string }> {
  const res = await fetch(`${WORKER_URL}/api/assets/folder`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, parentId }),
  });
  return handleResponse(res, "Create folder");
}

export async function uploadAssetFile(
  file: File,
  parentId?: string
): Promise<{ success: boolean; id: string; name: string; url: string; downloadUrl: string }> {
  const arrayBuffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Data = btoa(binary);

  const res = await fetch(`${WORKER_URL}/api/assets/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      base64Data,
      parentId,
    }),
  });
  return handleResponse(res, "Upload file");
}

export async function deleteAssetFile(fileId: string): Promise<{ success: boolean }> {
  const res = await fetch(`${WORKER_URL}/api/assets/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileId }),
  });
  return handleResponse(res, "Delete asset file");
}

export interface SnapDeal {
  id: string;
  dealing_with: string;
  handshake_date: number;
  notes?: string;
  terms_conditions?: string;
  deal_data: string; // JSON string
  signed_proof_url?: string;
  status: string; // "Active" | "Locked"
}

export interface SnapDealLog {
  id: string;
  deal_id: string;
  timestamp: number;
  actor_email: string;
  actor_name: string;
  action: string;
}

export async function fetchSnapDeals(): Promise<SnapDeal[]> {
  const res = await fetch(`${WORKER_URL}/api/snap-deals/list`, {
    method: "GET"
  });
  return handleResponse(res, "Retrieve snap deals");
}

export async function saveSnapDeal(
  deal: Partial<SnapDeal> & { actor_email: string; actor_name: string }
): Promise<{ success: boolean }> {
  const res = await fetch(`${WORKER_URL}/api/snap-deals/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(deal)
  });
  return handleResponse(res, "Save snap deal");
}

export async function uploadSignedProof(
  dealId: string,
  file: File,
  actor_email: string,
  actor_name: string
): Promise<{ success: boolean }> {
  // Step 1: Upload raw file to Cloudflare R2
  const fileName = `deal_signed/signed-deal-${dealId}-${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
  const uploadRes = await fetch(`${WORKER_URL}/api/upload?filename=${encodeURIComponent(fileName)}`, {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream"
    },
    body: file
  });

  if (!uploadRes.ok) {
    throw new Error(`Failed to upload file to storage. Status ${uploadRes.status}`);
  }
  const uploadData = (await uploadRes.json()) as any;
  if (!uploadData.success || !uploadData.url) {
    throw new Error("Storage upload failed");
  }

  // Step 2: Lock deal in database with the signed proof URL
  const res = await fetch(`${WORKER_URL}/api/snap-deals/upload-proof`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id: dealId,
      signed_proof_url: uploadData.url,
      actor_email,
      actor_name
    })
  });
  return handleResponse(res, "Lock deal with proof");
}

export async function revokeSnapDeal(
  dealId: string,
  actor_email: string,
  actor_name: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${WORKER_URL}/api/snap-deals/revoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id: dealId,
      actor_email,
      actor_name
    })
  });
  return handleResponse(res, "Revoke deal lock");
}

export async function fetchSnapDealLogs(dealId: string): Promise<SnapDealLog[]> {
  const res = await fetch(`${WORKER_URL}/api/snap-deals/logs?dealId=${encodeURIComponent(dealId)}`, {
    method: "GET"
  });
  return handleResponse(res, "Retrieve snap deal logs");
}

export async function archiveSnapDeal(
  dealId: string,
  actor_email: string,
  actor_name: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${WORKER_URL}/api/snap-deals/archive`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id: dealId,
      actor_email,
      actor_name
    })
  });
  return handleResponse(res, "Archive deal");
}

export async function restoreSnapDeal(
  dealId: string,
  actor_email: string,
  actor_name: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${WORKER_URL}/api/snap-deals/restore`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id: dealId,
      actor_email,
      actor_name
    })
  });
  return handleResponse(res, "Restore deal from archive");
}

export async function deleteSnapDeal(
  dealId: string,
  actor_email: string,
  actor_name: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${WORKER_URL}/api/snap-deals/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id: dealId,
      actor_email,
      actor_name
    })
  });
  return handleResponse(res, "Delete snap deal");
}

// ---------------------------------------------------------------------------
// PROJECT WORKSPACE PM API
// ---------------------------------------------------------------------------

let cachedWorkspaceData: any = null;
let workspaceDashboardPromise: Promise<any> | null = null;

export function getCachedWorkspaceData() {
  if (cachedWorkspaceData) return cachedWorkspaceData;
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem("ib_workspace_cache");
      if (cached) {
        cachedWorkspaceData = JSON.parse(cached);
        return cachedWorkspaceData;
      }
    } catch {}
  }
  return null;
}

export function prefetchWorkspaceDashboard(): Promise<any> {
  if (workspaceDashboardPromise) return workspaceDashboardPromise;
  workspaceDashboardPromise = fetchWorkspaceDashboard()
    .then((res) => {
      workspaceDashboardPromise = null;
      return res;
    })
    .catch((err) => {
      workspaceDashboardPromise = null;
      throw err;
    });
  return workspaceDashboardPromise;
}

export function setCachedWorkspaceData(updater: (prev: any) => any) {
  if (typeof window !== "undefined") {
    try {
      const current = getCachedWorkspaceData() || { success: true, projects: [], milestones: [], actions: [], pendingDelays: [], pipelines: [], systemUsers: [] };
      const updated = updater(current);
      cachedWorkspaceData = updated;
      localStorage.setItem("ib_workspace_cache", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to update workspace cache:", e);
    }
  }
}

export async function fetchWorkspaceDashboard(forceFresh = false): Promise<{
  success: boolean;
  projects: any[];
  milestones: any[];
  actions: any[];
  pendingDelays: any[];
  pipelines: any[];
  systemUsers: any[];
}> {
  const url = forceFresh
    ? `${WORKER_URL}/api/projects/dashboard?_t=${Date.now()}`
    : `${WORKER_URL}/api/projects/dashboard`;
  const res = await fetch(url);
  const data = await handleResponse(res, "Fetch workspace dashboard");
  if (data && data.success) {
    cachedWorkspaceData = data;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ib_workspace_cache", JSON.stringify(data));
      } catch {}
    }
  }
  return data;
}

export async function savePMProject(data: any): Promise<{ success: boolean; project: any }> {
  const res = await fetch(`${WORKER_URL}/api/projects/project/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res, "Save project");
}

export async function savePMMilestone(data: any): Promise<{ success: boolean; milestone: any }> {
  const res = await fetch(`${WORKER_URL}/api/projects/milestone/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res, "Save milestone");
}

export async function savePMAction(data: any): Promise<{ success: boolean; action: any }> {
  const res = await fetch(`${WORKER_URL}/api/projects/action/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res, "Save action");
}

export async function addPMActionLog(actionId: string, log: any): Promise<{ success: boolean; logs: any[] }> {
  const res = await fetch(`${WORKER_URL}/api/projects/action/log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action_id: actionId, log }),
  });
  return handleResponse(res, "Add action progress log");
}

export async function deletePMEntity(type: "project" | "milestone" | "action", id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${WORKER_URL}/api/projects/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, id }),
  });
  return handleResponse(res, "Delete PM entity");
}

export async function submitPMDelayRequest(data: {
  action_id?: string;
  milestone_id: string;
  project_id: string;
  requested_by?: string;
  requested_by_name?: string;
  current_end_date: number;
  requested_end_date: number;
  reason: string;
}): Promise<{ success: boolean; request: any }> {
  const res = await fetch(`${WORKER_URL}/api/projects/delay-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res, "Submit delay request");
}

export async function approvePMDelayRequest(data: {
  request_id: string;
  approved: boolean;
  reviewer_notes?: string;
  reviewer_name?: string;
}): Promise<{ success: boolean; approved: boolean }> {
  const res = await fetch(`${WORKER_URL}/api/projects/delay-approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse(res, "Process delay request");
}

export interface BrainCellMapping {
  table: string;
  column: string;
  description: string;
}

export interface BrainCellItem {
  id: string;
  name: string;
  assigned_modules: string[];
  keywords: string[];
  mappings: BrainCellMapping[];
  custom_rules: string;
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

export async function fetchDbSchema(): Promise<{ success: boolean; schema: Record<string, string[]>; source?: string }> {
  const token = await getFreshToken();
  const sessionHeaders = getSessionIdHeader();
  const res = await fetch(`${WORKER_URL}/api/dashboard/db-schema`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...sessionHeaders,
    },
  });
  return handleResponse(res, "Fetch database schema");
}

export async function fetchBrainCells(): Promise<{ success: boolean; brain_cells: BrainCellItem[] }> {
  const token = await getFreshToken();
  const sessionHeaders = getSessionIdHeader();
  const res = await fetch(`${WORKER_URL}/api/dashboard/brain-cells`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...sessionHeaders,
    },
  });
  return handleResponse(res, "Fetch brain cells");
}

export async function saveBrainCell(cell: Partial<BrainCellItem>): Promise<{ success: boolean; brain_cell: BrainCellItem }> {
  const token = await getFreshToken();
  const sessionHeaders = getSessionIdHeader();
  const res = await fetch(`${WORKER_URL}/api/dashboard/brain-cells`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...sessionHeaders,
    },
    body: JSON.stringify(cell),
  });
  return handleResponse(res, "Save brain cell");
}

export async function deleteBrainCell(id: string): Promise<{ success: boolean; deletedId: string }> {
  const token = await getFreshToken();
  const sessionHeaders = getSessionIdHeader();
  const res = await fetch(`${WORKER_URL}/api/dashboard/brain-cells?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...sessionHeaders,
    },
  });
  return handleResponse(res, "Delete brain cell");
}

export interface ConsoleContextItem {
  id: string;
  title: string;
  keywords: string[];
  detail_context: string;
  created_at: number;
  updated_at: number;
}

export async function fetchConsoleContexts(): Promise<{ success: boolean; contexts: ConsoleContextItem[] }> {
  const token = await getFreshToken();
  const sessionHeaders = getSessionIdHeader();
  const res = await fetch(`${WORKER_URL}/api/dashboard/contexts`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...sessionHeaders,
    },
  });
  return handleResponse(res, "Fetch console contexts");
}

export async function saveConsoleContext(context: Partial<ConsoleContextItem>): Promise<{ success: boolean; context: ConsoleContextItem }> {
  const token = await getFreshToken();
  const sessionHeaders = getSessionIdHeader();
  const res = await fetch(`${WORKER_URL}/api/dashboard/contexts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...sessionHeaders,
    },
    body: JSON.stringify(context),
  });
  return handleResponse(res, "Save console context");
}

export async function deleteConsoleContext(id: string): Promise<{ success: boolean; deletedId: string }> {
  const token = await getFreshToken();
  const sessionHeaders = getSessionIdHeader();
  const res = await fetch(`${WORKER_URL}/api/dashboard/contexts?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...sessionHeaders,
    },
  });
  return handleResponse(res, "Delete console context");
}

export async function fetchDashboardAiBriefing(
  userName: string,
  profile?: any,
  skipGreeting = false,
  message?: string,
  history?: any[]
): Promise<{ success: boolean; text: string; is_ai?: boolean; source?: string; router_intent?: string; data?: any; error?: string }> {
  const token = await getFreshToken();
  const sessionHeaders = getSessionIdHeader();
  const res = await fetch(`${WORKER_URL}/api/dashboard/ai-briefing`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...sessionHeaders,
    },
    body: JSON.stringify({
      user_name: userName,
      role: profile?.role || "Operator",
      email: profile?.email || "",
      modules_access: profile?.modules_access || {},
      skip_greeting: skipGreeting,
      message: message || undefined,
      history: history || undefined,
    }),
  });
  return handleResponse(res, "Fetch dashboard briefing");
}

export interface AdminConsolePreferences {
  track_orders: boolean;
  tiktok_orders: boolean;
  direct_orders: boolean;
  merch_visits: boolean;
  personal_tasks: boolean;
}

export async function fetchAdminConsolePreferences(email: string): Promise<{ success: boolean; preferences: AdminConsolePreferences }> {
  const token = await getFreshToken();
  const sessionHeaders = getSessionIdHeader();
  const res = await fetch(`${WORKER_URL}/api/dashboard/admin-preferences?email=${encodeURIComponent(email)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...sessionHeaders,
    },
  });
  return handleResponse(res, "Fetch admin preferences");
}

export async function saveAdminConsolePreferences(email: string, preferences: AdminConsolePreferences): Promise<{ success: boolean; preferences: AdminConsolePreferences }> {
  const token = await getFreshToken();
  const sessionHeaders = getSessionIdHeader();
  const res = await fetch(`${WORKER_URL}/api/dashboard/admin-preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...sessionHeaders,
    },
    body: JSON.stringify({ email, preferences }),
  });
  return handleResponse(res, "Save admin preferences");
}

// 18. QUICK DROP (24-HOUR TEMPORARY FILE SHARING) APIs
export interface QuickDropFile {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  file_url: string;
  r2_key: string;
  uploaded_by_name: string;
  uploaded_by_email: string;
  created_at: number;
  expires_at: number;
}

export async function fetchQuickDropFiles(email: string, viewAll = false): Promise<{ success: boolean; files: QuickDropFile[] }> {
  const buster = `t=${Date.now()}`;
  const res = await fetch(`${WORKER_URL}/api/quick-drop/list?email=${encodeURIComponent(email)}&viewAll=${viewAll}&${buster}`, {
    method: "GET",
  });
  return handleResponse(res, "Fetch Quick Drop files");
}

export async function uploadQuickDropFile(
  file: File,
  uploaderName: string,
  uploaderEmail: string
): Promise<{ success: boolean; file: QuickDropFile }> {
  const arrayBuffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Data = btoa(binary);

  const res = await fetch(`${WORKER_URL}/api/quick-drop/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      uploadedByName: uploaderName,
      uploadedByEmail: uploaderEmail,
      base64Data,
    }),
  });
  return handleResponse(res, "Upload Quick Drop file");
}

export async function deleteQuickDropFile(id: string, email: string): Promise<{ success: boolean; deletedId: string }> {
  const res = await fetch(`${WORKER_URL}/api/quick-drop/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id, email }),
  });
  return handleResponse(res, "Delete Quick Drop file");
}

export async function fetchQuickDropText(email: string): Promise<{ content: string; updated_at: number; expires_at: number }> {
  const buster = `t=${Date.now()}`;
  const res = await fetch(`${WORKER_URL}/api/quick-drop/text?email=${encodeURIComponent(email)}&${buster}`, {
    method: "GET",
  });
  return handleResponse(res, "Fetch Quick Drop text");
}

export async function saveQuickDropText(email: string, content: string): Promise<{ success: boolean; content: string; updated_at: number; expires_at: number }> {
  const res = await fetch(`${WORKER_URL}/api/quick-drop/text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, content }),
  });
  return handleResponse(res, "Save Quick Drop text");
}

// -------------------------------------------------------------
// PRODUCT VALIDATION & REVIEWS (Multi-Review Architecture)
// -------------------------------------------------------------
export interface ValidationProduct {
  id: string;
  product_name: string;
  brand_name: string;
  sku?: string;
  product_owner?: string;
  // Distributor Pricing Waterfall
  cost_price: number;              // 1. Cost Price (Goods Price)
  landed_cost_rate?: number;       // Land buffer %
  land_price?: number;             // 2. Land Price ($)
  landed_cost?: number;            // alias for land_price
  overhead_rate?: number;          // Overhead %
  our_price?: number;              // 3. Our Price ($) (Land Price + Overhead)
  our_margin_rate?: number;        // Distributor Margin %
  margin_percentage?: number;      // alias for our_margin_rate
  price_to_retailer?: number;      // 4. Price to Retailer ($) (Trade Price)
  retailer_margin_rate?: number;   // Retailer Margin %
  rsp?: number;                    // 5. RSP ($) (Shelf Recommended Selling Price)
  expected_selling_price?: number; // alias for rsp
  images: string[];
  notes?: string;
  status: "pending" | "Market test" | "Further validation / refinement" | "Pause" | string;
  created_by?: string;
  reviews_count?: number;
  average_score?: number;
  latest_assessment_date?: string;
  latest_decision?: string;
  reviews?: ProductValidationReview[];
  created_at: number;
  updated_at: number;
}

export interface ProductValidationReview {
  id: string;
  product_id: string;
  product_name: string;
  brand_name: string;
  sku?: string;
  buyer_name: string; // Admin Reviewer
  product_owner?: string;
  assessment_date: string;
  total_score: number;
  score_band: string;
  buyer_decision: string;
  status: "completed" | "draft" | string;
  images?: string[];
  before_assessment: {
    sample_available?: boolean;
    packaging_available?: boolean;
    selling_price_confirmed?: boolean;
    consumer_usage_understood?: boolean;
    owner_responses_recorded?: boolean;
  };
  scorecard: {
    taste_aroma?: number;
    texture_quality?: number;
    packaging_appeal?: number;
    price_believability?: number;
    usage_occasion?: number;
    repeat_purchase?: number;
  };
  criteria_details: {
    taste_aroma?: { prompts_checked?: string[]; owner_response?: string; buyer_observations?: string };
    texture_quality?: { prompts_checked?: string[]; owner_response?: string; buyer_observations?: string };
    packaging_appeal?: { prompts_checked?: string[]; owner_response?: string; buyer_observations?: string };
    price_believability?: { prompts_checked?: string[]; owner_response?: string; buyer_observations?: string };
    usage_occasion?: { prompts_checked?: string[]; owner_response?: string; buyer_observations?: string };
    repeat_purchase?: { prompts_checked?: string[]; owner_response?: string; buyer_observations?: string };
  };
  commercial_terms: {
    sales_channels?: string;
    marketing_activities?: string;
    marketing_support?: string;
    moq?: string;
    delivery_timeline?: string;
    payment_terms?: string;
    influencer_engagement?: string;
    existing_sg_sales?: string;
  };
  decision_data: {
    checklist?: {
      all_criteria_scored?: boolean;
      owner_responses_reviewed?: boolean;
      missing_evidence_recorded?: boolean;
    };
    key_strengths?: string;
    concerns?: string;
    missing_info?: string;
    next_action?: string;
    action_owner?: string;
    due_date?: string;
    buyer_sign_off?: string;
    sign_off_date?: string;
  };
  created_at: number;
  updated_at: number;
  scanned_form_url?: string;
}

export async function fetchValidationProducts(): Promise<{
  success: boolean;
  data: ValidationProduct[];
  all_reviews: ProductValidationReview[];
}> {
  const buster = `t=${Date.now()}`;
  const res = await fetch(`${WORKER_URL}/api/product-validations/products?${buster}`, {
    method: "GET",
    headers: { ...getSessionIdHeader() }
  });
  return handleResponse(res, "Fetch Validation Products");
}

export async function saveValidationProduct(
  payload: Partial<ValidationProduct>
): Promise<{ success: boolean; data: ValidationProduct }> {
  const isUpdate = !!payload.id;
  const url = isUpdate
    ? `${WORKER_URL}/api/product-validations/products/${encodeURIComponent(payload.id!)}`
    : `${WORKER_URL}/api/product-validations/products`;

  const res = await fetch(url, {
    method: isUpdate ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...getSessionIdHeader()
    },
    body: JSON.stringify(payload)
  });
  return handleResponse(res, isUpdate ? "Update Validation Product" : "Create Validation Product");
}

export async function deleteValidationProduct(
  id: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${WORKER_URL}/api/product-validations/products/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { ...getSessionIdHeader() }
  });
  return handleResponse(res, "Delete Validation Product");
}

export async function fetchProductValidationReviews(
  productId?: string
): Promise<{ success: boolean; data: ProductValidationReview[] }> {
  const buster = `t=${Date.now()}`;
  const query = productId ? `product_id=${encodeURIComponent(productId)}&${buster}` : buster;
  const res = await fetch(`${WORKER_URL}/api/product-validations/reviews?${query}`, {
    method: "GET",
    headers: { ...getSessionIdHeader() }
  });
  return handleResponse(res, "Fetch Product Reviews");
}

export async function submitProductValidationReview(
  payload: Partial<ProductValidationReview>
): Promise<{ success: boolean; data: ProductValidationReview }> {
  const isUpdate = !!payload.id;
  const url = isUpdate
    ? `${WORKER_URL}/api/product-validations/reviews/${encodeURIComponent(payload.id!)}`
    : `${WORKER_URL}/api/product-validations/reviews`;

  const res = await fetch(url, {
    method: isUpdate ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...getSessionIdHeader()
    },
    body: JSON.stringify(payload)
  });
  return handleResponse(res, isUpdate ? "Update Review" : "Submit Review");
}

export async function deleteProductValidationReview(
  id: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${WORKER_URL}/api/product-validations/reviews/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { ...getSessionIdHeader() }
  });
  return handleResponse(res, "Delete Product Review");
}

export async function fetchProductValidationMetadata(): Promise<{
  success: boolean;
  products: any[];
  brands: any[];
}> {
  const buster = `t=${Date.now()}`;
  const res = await fetch(`${WORKER_URL}/api/product-validations/products-metadata?${buster}`, {
    method: "GET",
    headers: { ...getSessionIdHeader() }
  });
  return handleResponse(res, "Fetch Products Metadata");
}

export async function uploadProductValidationImage(
  file: File
): Promise<{ success: boolean; url: string; key: string; name: string }> {
  const arrayBuffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Data = btoa(binary);

  const res = await fetch(`${WORKER_URL}/api/product-validations/upload-image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getSessionIdHeader()
    },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "image/jpeg",
      base64Data
    })
  });
  return handleResponse(res, "Upload Validation Image");
}

export async function uploadScannedForm(
  file: File
): Promise<{ success: boolean; scan_url: string; extracted_data: any; warning?: string }> {
  const arrayBuffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Data = btoa(binary);

  const res = await fetch(`${WORKER_URL}/api/brand-launchpad/parse-scanned-form`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getSessionIdHeader()
    },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "image/jpeg",
      base64Data
    })
  });
  return handleResponse(res, "Process Scanned Form");
}

// ---------------------------------------------------------------------------
// BRAND LAUNCHPAD (HSG NEW BRAND PIPELINE)
// ---------------------------------------------------------------------------

export interface BrandLaunchpadProduct {
  id: string;
  brand_id: string;
  product_name: string;
  sku: string;
  category: string;
  pack_size: string;
  shelf_life_months: number;
  storage_condition: "Ambient" | "Chilled" | "Frozen" | string;
  cost_price: number;
  landed_cost_rate: number;
  land_price: number;
  overhead_rate: number;
  our_price: number;
  our_margin_rate: number;
  price_to_retailer: number;
  retailer_margin_rate: number;
  rsp: number;
  images?: string[];
  avg_taste_score: number;
  reviews_count: number;
  score_status: string;
  created_at?: number;
  updated_at?: number;
  reviews?: BrandLaunchpadReview[];
}

export interface BrandLaunchpadReview {
  id: string;
  product_id: string;
  reviewer_name: string;
  reviewer_type: "Admin" | "Staff" | "Guest Taster" | string;
  assessment_date: string;
  score_taste_aroma: number;
  score_texture_quality: number;
  score_packaging_appeal: number;
  score_price_believability: number;
  score_usage_occasion: number;
  score_repeat_purchase: number;
  total_score: number;
  score_band: string;
  reviewer_decision: "Proceed" | "With Conditions" | "Pause" | "Reject" | string;
  tasting_notes?: string;
  scanned_worksheet_url?: string;
  created_at?: number;
}

export interface BrandLaunchpadTrial {
  id?: string;
  brand_id: string;
  m1_channels: string[];
  m1_units_sold: number;
  m1_sampling_feedback: string;
  m2_weekly_velocity: string;
  m2_price_response: "Full Price Accepted" | "Price Sensitive" | "Discounts Needed" | string;
  m2_repeat_purchase_signs: string;
  m3_total_units: number;
  m3_repeat_rate_percent: number;
  m3_achieved_margin_percent: number;
  m3_customer_rating: number;
  m3_reviews_summary: string;
  trial_status: "In Progress" | "Proof Established" | "Needs Further Testing" | "Trial Paused" | string;
  updated_at?: number;
}

export interface BrandLaunchpadRetail {
  id?: string;
  brand_id: string;
  target_retail_channels: string[];
  buyer_value_proposition: string;
  buffer_stock_units: number;
  reorder_lead_time_days: number;
  post_listing_marketing_budget: string;
  final_verdict: "Pending" | "Scale" | "Improve" | "Hold" | "Stop" | string;
  verdict_notes: string;
  pitch_deck_url: string;
  signed_retail_agreement_url: string;
  approved_by: string;
  approved_at?: number | null;
  updated_at?: number;
}

export interface BrandLaunchpadBrand {
  id: string;
  brand_name: string;
  company_name: string;
  owner_type: "Brand Owner" | "Manufacturer" | "Trader" | "Agent" | string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  country_of_origin: string;
  payment_terms: string;
  lead_time_days: number;
  current_step: number; // 1 to 5
  status: string; // 'Step 1: Intake', 'Step 2: Taste Scorecard', etc.
  brand_story: string;
  target_consumer: string;
  consumer_need_served: string;
  tiktok_hooks: string;
  launch_promo_support: string;
  retail_ambition: string;
  alignment_confirmed: boolean;
  scanned_intake_url?: string;
  scanned_marketing_url?: string;
  created_by?: string;
  created_at: number;
  updated_at: number;
  products?: BrandLaunchpadProduct[];
  trial?: BrandLaunchpadTrial | null;
  retail?: BrandLaunchpadRetail | null;
}

export async function fetchBrandLaunchpadBrands(): Promise<{ success: boolean; brands: BrandLaunchpadBrand[] }> {
  const buster = `t=${Date.now()}`;
  const res = await fetch(`${WORKER_URL}/api/brand-launchpad/brands?${buster}`, {
    method: "GET",
    headers: { ...getSessionIdHeader() }
  });
  return handleResponse(res, "Fetch Brand Launchpad Brands");
}

export async function fetchBrandLaunchpadBrand(id: string): Promise<{ success: boolean; brand: BrandLaunchpadBrand }> {
  const buster = `t=${Date.now()}`;
  const res = await fetch(`${WORKER_URL}/api/brand-launchpad/brands/${encodeURIComponent(id)}?${buster}`, {
    method: "GET",
    headers: { ...getSessionIdHeader() }
  });
  return handleResponse(res, "Fetch Single Brand Launchpad");
}

export async function saveBrandLaunchpadBrand(
  payload: Partial<BrandLaunchpadBrand> & { products?: Partial<BrandLaunchpadProduct>[] }
): Promise<{ success: boolean; brand: BrandLaunchpadBrand }> {
  const isUpdate = !!payload.id;
  const url = isUpdate
    ? `${WORKER_URL}/api/brand-launchpad/brands/${encodeURIComponent(payload.id!)}`
    : `${WORKER_URL}/api/brand-launchpad/brands`;

  const res = await fetch(url, {
    method: isUpdate ? "PATCH" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...getSessionIdHeader()
    },
    body: JSON.stringify(payload)
  });
  return handleResponse(res, isUpdate ? "Update Brand Launchpad" : "Create Brand Launchpad");
}

export async function deleteBrandLaunchpadBrand(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${WORKER_URL}/api/brand-launchpad/brands/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { ...getSessionIdHeader() }
  });
  return handleResponse(res, "Delete Brand Launchpad");
}

export async function saveBrandLaunchpadProduct(
  payload: Partial<BrandLaunchpadProduct>
): Promise<{ success: boolean; product: BrandLaunchpadProduct }> {
  const isUpdate = !!payload.id;
  const url = isUpdate
    ? `${WORKER_URL}/api/brand-launchpad/products/${encodeURIComponent(payload.id!)}`
    : `${WORKER_URL}/api/brand-launchpad/products`;

  const res = await fetch(url, {
    method: isUpdate ? "PATCH" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...getSessionIdHeader()
    },
    body: JSON.stringify(payload)
  });
  return handleResponse(res, isUpdate ? "Update SKU" : "Add SKU");
}

export async function deleteBrandLaunchpadProduct(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${WORKER_URL}/api/brand-launchpad/products/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { ...getSessionIdHeader() }
  });
  return handleResponse(res, "Delete SKU");
}

export async function fetchBrandLaunchpadReviews(productId?: string): Promise<{ success: boolean; reviews: BrandLaunchpadReview[] }> {
  const buster = `t=${Date.now()}`;
  const query = productId ? `product_id=${encodeURIComponent(productId)}&${buster}` : buster;
  const res = await fetch(`${WORKER_URL}/api/brand-launchpad/reviews?${query}`, {
    method: "GET",
    headers: { ...getSessionIdHeader() }
  });
  return handleResponse(res, "Fetch Taste Reviews");
}

export async function submitBrandLaunchpadReview(
  payload: Partial<BrandLaunchpadReview>
): Promise<{ success: boolean; review: BrandLaunchpadReview }> {
  const res = await fetch(`${WORKER_URL}/api/brand-launchpad/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getSessionIdHeader()
    },
    body: JSON.stringify(payload)
  });
  return handleResponse(res, "Submit Taste Review");
}

export async function deleteBrandLaunchpadReview(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${WORKER_URL}/api/brand-launchpad/reviews/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { ...getSessionIdHeader() }
  });
  return handleResponse(res, "Delete Taste Review");
}

export async function saveBrandLaunchpadTrial(
  brandId: string,
  payload: Partial<BrandLaunchpadTrial>
): Promise<{ success: boolean; trial: BrandLaunchpadTrial }> {
  const res = await fetch(`${WORKER_URL}/api/brand-launchpad/trial/${encodeURIComponent(brandId)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getSessionIdHeader()
    },
    body: JSON.stringify(payload)
  });
  return handleResponse(res, "Update Trial Data");
}

export async function saveBrandLaunchpadRetail(
  brandId: string,
  payload: Partial<BrandLaunchpadRetail>
): Promise<{ success: boolean; retail: BrandLaunchpadRetail }> {
  const res = await fetch(`${WORKER_URL}/api/brand-launchpad/retail/${encodeURIComponent(brandId)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getSessionIdHeader()
    },
    body: JSON.stringify(payload)
  });
  return handleResponse(res, "Update Retail Readiness");
}

export async function uploadBrandLaunchpadFile(
  file: File
): Promise<{ success: boolean; url: string; key: string; name: string }> {
  const arrayBuffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Data = btoa(binary);

  const res = await fetch(`${WORKER_URL}/api/brand-launchpad/upload`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getSessionIdHeader()
    },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      base64Data
    })
  });
  return handleResponse(res, "Upload Launchpad File");
}

// ---------------------------------------------------------------------------
// ACTIVE SESSIONS & CONNECTED DEVICES API
// ---------------------------------------------------------------------------
export interface ActiveUserSession {
  id: string;
  app: string;
  device_type: "desktop" | "mobile" | "tablet";
  platform: string;
  ip: string;
  login_at: number;
  last_active: number;
  is_current?: boolean;
}

export async function fetchActiveUserSessions(
  idToken: string
): Promise<{ success: boolean; total_devices: number; sessions: ActiveUserSession[] }> {
  const token = await getFreshToken(idToken);
  const res = await fetch(`${WORKER_URL}/api/users/active-sessions`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      ...getSessionIdHeader(),
    },
  });
  return handleResponse(res, "Retrieve active sessions");
}

export async function revokeUserSession(
  idToken: string,
  params: { sessionId?: string; revokeAllOthers?: boolean }
): Promise<{ success: boolean; total_devices: number; sessions: ActiveUserSession[] }> {
  const token = await getFreshToken(idToken);
  const res = await fetch(`${WORKER_URL}/api/users/revoke-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...getSessionIdHeader(),
    },
    body: JSON.stringify({
      session_id: params.sessionId,
      revoke_all_others: params.revokeAllOthers,
    }),
  });
  return handleResponse(res, "Revoke session");
}
