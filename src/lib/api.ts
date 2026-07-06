"use client";

import { auth } from "./firebase";

export interface UserProfile {
  email: string;
  name: string;
  phone_number: string | null;
  role: "Administrator" | "Manager" | "Operator" | "Moderator";
  pages_access: string[]; // parsed JSON array
  modules_access: string[]; // parsed JSON array
  active: number; // 0 = inactive, 1 = active
  contract_signature_base64?: string | null;
  contract_pdf_link?: string | null;
  contract_signed_at?: number | null;
}

const WORKER_URL = "https://ib.hsgglobalpteltd.workers.dev";

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
      const err = new Error(errBody.message || errBody.error || `${errorPrefix} failed: ${res.statusText}`);
      (err as any).code = errBody.error;
      throw err;
    }
    throw new Error(`${errorPrefix} failed: ${errText || res.statusText}`);
  }
  return res.json();
}

// Parsing JSON safely
function safeParseAccess(field: any): string[] {
  if (Array.isArray(field)) return field;
  if (typeof field === "string") {
    try {
      return JSON.parse(field);
    } catch {
      return [];
    }
  }
  return [];
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
  return {
    ...data,
    pages_access: safeParseAccess(data.pages_access),
    modules_access: safeParseAccess(data.modules_access),
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
    modules_access: safeParseAccess(data.modules_access),
  };
}

// 3. UPDATE PROFILE
export async function updateOwnProfile(idToken: string, email: string, name: string, phoneNumber: string): Promise<UserProfile> {
  const token = await getFreshToken(idToken);
  const res = await fetch(`${WORKER_URL}/api/users/update-profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...getSessionIdHeader(),
    },
    body: JSON.stringify({ name, phone_number: phoneNumber }),
  });
  const data = await handleResponse(res, "Update profile");
  return {
    ...data,
    pages_access: safeParseAccess(data.pages_access),
    modules_access: safeParseAccess(data.modules_access),
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
    modules_access: safeParseAccess(u.modules_access),
  }));
}

// 5. UPDATE OTHER USER
export async function adminUpdateUser(
  idToken: string,
  requestorEmail: string,
  targetEmail: string,
  role: "Administrator" | "Manager" | "Operator" | "Moderator",
  pagesAccess: string[],
  modulesAccess: string[],
  active: number,
  name?: string,
  phoneNumber?: string | null
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
    }),
  });
  const data = await handleResponse(res, "Update user");
  return {
    ...data,
    pages_access: safeParseAccess(data.pages_access),
    modules_access: safeParseAccess(data.modules_access),
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

