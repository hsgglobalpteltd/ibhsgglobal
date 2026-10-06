"use client";

/**
 * Robust LocalStorage helper that automatically handles QuotaExceededError,
 * strips heavy base64 strings (like contract signatures) from session storage,
 * and clears non-essential offline caches when storage is tight.
 */
export function safeLocalStorageSet(key: string, value: any): boolean {
  if (typeof window === "undefined") return false;
  try {
    let strVal: string;
    
    // If it's a user profile, sanitize large non-essential fields like contract_signature_base64
    if (key === "ib_user_profile" || key === "ib_auth_profile") {
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : { ...value };
        if (parsed.contract_signature_base64) {
          delete parsed.contract_signature_base64;
        }
        strVal = JSON.stringify(parsed);
      } catch {
        strVal = typeof value === "string" ? value : JSON.stringify(value);
      }
    } else {
      strVal = typeof value === "string" ? value : JSON.stringify(value);
    }

    try {
      localStorage.setItem(key, strVal);
      return true;
    } catch (e: any) {
      console.warn(`LocalStorage quota exceeded when setting "${key}". Purging temporary caches...`, e);
      
      // 1. Purge standard heavy non-essential cached tables and temporary data
      const purgeKeys = [
        "last_invoice_pdf",
        "dispose_goods_data",
        "dispose_products_data",
        "Contacts_Book_data",
        "Store_Retailer_DB_data",
        "products_DB_data",
        "buyers_db_data",
        "brands_DB_data",
        "Setting_API_data",
        "ib_workspace_cache",
        "ib_briefing_chat_history",
        "ib_user_saved_chats",
        "pos_display_sync",
      ];
      
      for (const pk of purgeKeys) {
        try {
          localStorage.removeItem(pk);
        } catch {}
      }

      // 2. Clear any old drafts or heavy items
      try {
        const protectedKeys = new Set(["ib_user_profile", "ib_auth_profile", "ib_auth_token", "session_id"]);
        for (let i = 0; i < localStorage.length; i++) {
          const lKey = localStorage.key(i);
          if (lKey && !protectedKeys.has(lKey)) {
            if (lKey.startsWith("ib_doc_draft_") || lKey.startsWith("wfe_guest_session_") || lKey.startsWith("chat_")) {
              localStorage.removeItem(lKey);
            }
          }
        }
      } catch {}

      // Retry setting the critical auth/session key
      try {
        localStorage.setItem(key, strVal);
        return true;
      } catch (retryErr) {
        // Last resort: clear all non-protected keys
        try {
          const protectedKeys = new Set(["ib_user_profile", "ib_auth_profile", "ib_auth_token", "session_id"]);
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && !protectedKeys.has(k) && k !== key) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach((k) => localStorage.removeItem(k));
          localStorage.setItem(key, strVal);
          return true;
        } catch (finalErr) {
          console.warn(`LocalStorage still full after deep purge for "${key}".`, finalErr);
          return false;
        }
      }
    }
  } catch (err) {
    console.warn(`Unexpected storage error for "${key}":`, err);
    return false;
  }
}

export function safeLocalStorageGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeLocalStorageRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {}
}
