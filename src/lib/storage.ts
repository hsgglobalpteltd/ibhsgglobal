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
      
      // Purge heavy non-essential cached tables and temporary data
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
        "pos_display_sync",
      ];
      
      for (const pk of purgeKeys) {
        try {
          localStorage.removeItem(pk);
        } catch {}
      }

      // Retry setting the critical auth/session key
      try {
        localStorage.setItem(key, strVal);
        return true;
      } catch (retryErr) {
        console.warn(`LocalStorage still full after purging non-essential keys for "${key}". Skipping cache.`, retryErr);
        return false;
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
