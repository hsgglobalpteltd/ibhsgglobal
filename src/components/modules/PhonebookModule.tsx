"use client";

import * as React from "react";
import { CustomButton } from "../custom-button";
import { showToast } from "@/lib/toast";
import { Search, Plus, Edit, Trash2, X, AlertTriangle } from "lucide-react";

interface Contact {
  Phone: string;
  Position: string;
  Name: string;
  Email: string;
  Gender: string;
  "Group Link": string;
  "ID Link": string;
}

interface Store {
  ID: string;
  "Display Name": string;
}

interface PhonebookModuleProps {
  profile?: {
    role: string;
  } | null;
}

export function PhonebookModule({ profile }: PhonebookModuleProps) {
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [stores, setStores] = React.useState<Store[]>([]);
  const [fetching, setFetching] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Edit / Add Modal state
  const [editingContact, setEditingContact] = React.useState<any | null>(null);
  // Delete Confirm Modal state
  const [deletingContact, setDeletingContact] = React.useState<Contact | null>(null);

  const userRole = React.useMemo(() => {
    const role = profile?.role;
    if (role === "Administrator" || role === "Manager") return "admin";
    if (role === "Operator" || role === "Operation") return "operator";
    return "viewer";
  }, [profile]);

  // Dynamically group categories based on Group Link values present in contacts database
  const categories = React.useMemo(() => {
    const uniqueKeys = new Set<string>();
    contacts.forEach((c) => {
      const grp = (c["Group Link"] || "").trim().toLowerCase();
      if (grp) {
        uniqueKeys.add(grp);
      }
    });
    // Fallback default in case the sheet is empty
    if (uniqueKeys.size === 0) {
      uniqueKeys.add("stores");
    }
    return Array.from(uniqueKeys).map((key) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1)
    })).sort((a, b) => {
      if (a.key === "stores") return -1;
      if (b.key === "stores") return 1;
      return a.label.localeCompare(b.label);
    });
  }, [contacts]);

  // Fetch contacts and stores databases
  const fetchFreshData = async (forceSync = false) => {
    setFetching(true);
    try {
      if (forceSync) {
        // Force refresh contacts sheet
        await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=Contacts_Book", {
          method: "POST"
        });
      }

      // Fetch contacts
      const contactsRes = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=Contacts_Book");
      if (contactsRes.ok) {
        const contactsJson = await contactsRes.json();
        const items = Array.isArray(contactsJson) ? contactsJson : (contactsJson.value || []);
        localStorage.setItem("Contacts_Book_data", JSON.stringify(items));
        setContacts(items);
      }

      // Fetch stores (silently populate lookup)
      const storesRes = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/cache?sheet=Store_Retailer_DB");
      if (storesRes.ok) {
        const storesJson = await storesRes.json();
        const items = Array.isArray(storesJson) ? storesJson : (storesJson.value || []);
        localStorage.setItem("Store_Retailer_DB_data", JSON.stringify(items));
        setStores(items);
      }
    } catch (err: any) {
      showToast("Failed to sync records: " + err.message, "error");
    } finally {
      setFetching(false);
    }
  };

  // Load cached databases on mount
  React.useEffect(() => {
    // 1. Load contacts
    const cachedContacts = localStorage.getItem("Contacts_Book_data");
    if (cachedContacts) {
      try {
        setContacts(JSON.parse(cachedContacts));
      } catch (e) {
        fetchFreshData(false);
      }
    } else {
      fetchFreshData(false);
    }

    // 2. Load stores lookup
    const cachedStores = localStorage.getItem("Store_Retailer_DB_data");
    if (cachedStores) {
      try {
        setStores(JSON.parse(cachedStores));
      } catch (e) {
        // Silently handled in background fetch
      }
    }

    // Background refresh
    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("db-refresh"));
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Listen to the global db-refresh event
  React.useEffect(() => {
    const handleDbRefresh = async () => {
      await fetchFreshData(true);
    };

    window.addEventListener("db-refresh", handleDbRefresh);
    return () => {
      window.removeEventListener("db-refresh", handleDbRefresh);
    };
  }, []);

  // Map store ID to store Display Name for visual rendering
  const getStoreDisplayName = (storeId: any) => {
    if (storeId === undefined || storeId === null || storeId === "") return "";
    const storeIdStr = String(storeId).trim().toLowerCase();
    const store = stores.find(
      (s) => String(s.ID).trim().toLowerCase() === storeIdStr
    );
    return store ? store["Display Name"] : String(storeId);
  };

  // Get Name Prefix (Salutation) based on Gender
  const getGenderPrefix = (gender?: string) => {
    if (!gender) return "";
    const g = gender.toLowerCase().trim();
    if (g === "male" || g === "m" || g === "mr" || g === "mr.") return "Mr.";
    if (g === "female" || g === "f" || g === "ms" || g === "ms." || g === "mrs" || g === "mrs.") return "Ms.";
    return "";
  };

  // Capitalize the first letter of each word in the string
  const capitalizeWords = (str?: string) => {
    if (!str) return "";
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Case-insensitive fuzzy filtering on search query (supports salutation filtering)
  const filteredContacts = React.useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase().trim();
    return contacts.filter((c) => {
      // Look up store name to allow searching by store display name
      const storeName = c["Group Link"] === "stores" ? String(getStoreDisplayName(c["ID Link"])).toLowerCase() : "";
      
      const rawName = String(c.Name || "");
      const capitalizedName = capitalizeWords(rawName).toLowerCase();
      const name = rawName.toLowerCase();
      
      const prefix = getGenderPrefix(c.Gender).toLowerCase(); // "mr." or "ms."
      const prefixNoDot = prefix.replace(".", ""); // "mr" or "ms"
      const nameWithPrefix = `${prefix} ${name}`;
      const nameWithPrefixNoDot = `${prefixNoDot} ${name}`;
      const capNameWithPrefix = `${prefix} ${capitalizedName}`;
      const capNameWithPrefixNoDot = `${prefixNoDot} ${capitalizedName}`;

      const phone = String(c.Phone || "").toLowerCase();
      const email = String(c.Email || "").toLowerCase();
      const position = String(c.Position || "").toLowerCase();
      const groupLink = String(c["Group Link"] || "").toLowerCase();
      const idLink = String(c["ID Link"] || "").toLowerCase();
      
      return (
        name.includes(q) ||
        capitalizedName.includes(q) ||
        prefix.includes(q) ||
        prefixNoDot.includes(q) ||
        nameWithPrefix.includes(q) ||
        nameWithPrefixNoDot.includes(q) ||
        capNameWithPrefix.includes(q) ||
        capNameWithPrefixNoDot.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        position.includes(q) ||
        groupLink.includes(q) ||
        idLink.includes(q) ||
        storeName.includes(q)
      );
    });
  }, [contacts, searchQuery, stores]);

  // Perform CRUD Save Contact (optimistic UI)
  const handleSaveContact = async (updatedItem: any) => {
    const previousContacts = [...contacts];
    const isNew = !!updatedItem.isNew;
    const keyColumn = "Phone";

    // Close Modal
    setEditingContact(null);

    // Prepare data
    const cleanData = { ...updatedItem };
    delete cleanData.isNew;

    // Validate empty Phone
    if (!cleanData[keyColumn] || !String(cleanData[keyColumn]).trim()) {
      showToast("Save failed: Phone Number is required!", "error");
      return;
    }

    // Validate duplicate Phone during creation
    if (isNew) {
      const exists = contacts.some(
        (c) => String(c.Phone).trim() === String(cleanData[keyColumn]).trim()
      );
      if (exists) {
        showToast("Save failed: A contact with this Phone Number already exists!", "error");
        return;
      }
    }

    // Map Mr./Ms. salutation to Male/Female internally to preserve DB value types
    if (cleanData.Gender === "Mr.") {
      cleanData.Gender = "Male";
    } else if (cleanData.Gender === "Ms.") {
      cleanData.Gender = "Female";
    }

    // 1. Optimistic local state update
    let newContactsList;
    if (isNew) {
      newContactsList = [...contacts, cleanData];
    } else {
      newContactsList = contacts.map((c) =>
        String(c.Phone) === String(cleanData[keyColumn]) ? { ...c, ...cleanData } : c
      );
    }
    setContacts(newContactsList);
    localStorage.setItem("Contacts_Book_data", JSON.stringify(newContactsList));

    showToast("Saving contact in background...", "info");

    // 2. Silent sync
    try {
      const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sheet: "Contacts_Book",
          action: isNew ? "insert" : "update",
          data: cleanData
        })
      });

      const json = await res.json();
      if (json.success) {
        showToast("Contact saved successfully!", "success");
      } else {
        throw new Error(json.error || "Server error");
      }
    } catch (err: any) {
      // Rollback
      setContacts(previousContacts);
      localStorage.setItem("Contacts_Book_data", JSON.stringify(previousContacts));
      showToast("Save failed: " + err.message, "error");
    }
  };

  // Perform CRUD Delete Contact (optimistic UI)
  const handleDeleteContact = async (contact: Contact) => {
    const previousContacts = [...contacts];
    setDeletingContact(null);

    // 1. Optimistic update
    const newContactsList = contacts.filter((c) => c.Phone !== contact.Phone);
    setContacts(newContactsList);
    localStorage.setItem("Contacts_Book_data", JSON.stringify(newContactsList));

    showToast("Deleting contact in background...", "info");

    // 2. Silent sync
    try {
      const res = await fetch("https://ib.hsgglobalpteltd.workers.dev/api/admin/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sheet: "Contacts_Book",
          action: "delete",
          data: {
            Phone: contact.Phone
          }
        })
      });

      const json = await res.json();
      if (json.success) {
        showToast("Contact deleted successfully!", "success");
      } else {
        throw new Error(json.error || "Server error");
      }
    } catch (err: any) {
      // Rollback
      setContacts(previousContacts);
      localStorage.setItem("Contacts_Book_data", JSON.stringify(previousContacts));
      showToast("Deletion failed: " + err.message, "error");
    }
  };

  const handleAddNew = () => {
    setEditingContact({
      isNew: true,
      Phone: "",
      Position: "",
      Name: "",
      Email: "",
      Gender: "Mr.",
      "Group Link": "stores",
      "ID Link": ""
    });
  };

  const handleEditClick = (contact: Contact) => {
    let genderVal = "Mr.";
    if (contact.Gender && (contact.Gender.toLowerCase() === "female" || contact.Gender.toLowerCase() === "f" || contact.Gender.toLowerCase() === "ms")) {
      genderVal = "Ms.";
    }
    
    setEditingContact({
      ...contact,
      Gender: genderVal
    });
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden gap-[10px] min-w-0 font-primary">
      {/* Header crumb search bar */}
      <div className="content-header flex flex-col md:flex-row gap-4 justify-between items-start md:items-center px-1 border-b border-zinc-200/50 pb-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-bold text-zinc-950">Phonebook Registry</h2>
          <p className="text-xs text-zinc-500">
            Linked contact indices, position titles, and affiliations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none w-full md:w-[320px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 text-xs font-semibold bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all text-zinc-800 placeholder-zinc-400"
            />
          </div>

          {userRole !== "viewer" && (
            <CustomButton variant="dark" onClick={handleAddNew} className="h-9 px-4 rounded-lg">
              <Plus size={14} /> Add Contact
            </CustomButton>
          )}
        </div>
      </div>

      {/* Main body: Scrollable container for dynamic categories */}
      <div className="content-body flex-1 overflow-y-auto pr-1 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {categories.map((cat) => {
            // Filter contacts belonging to this category
            const catContacts = filteredContacts.filter(
              (c) => (c["Group Link"] || "").toLowerCase().trim() === cat.key
            );

            return (
              <div
                key={cat.key}
                className="flex flex-col bg-zinc-50/40 border border-zinc-200/80 rounded-xl p-4 min-w-0 h-[510px] shadow-xs shrink-0"
              >
                {/* Category Header */}
                <div className="flex justify-between items-center pb-2 border-b border-zinc-200/60 select-none">
                  <h3 className="font-bold text-zinc-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {cat.label}
                  </h3>
                </div>

                {/* Vertical Scrollable list of cards inside container (fixed 5 contact display height) */}
                <div className="h-[432px] overflow-y-auto mt-3 pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-zinc-300 [&::-webkit-scrollbar-thumb]:rounded">
                {fetching && catContacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-zinc-300 border-t-blue-600" />
                    <span className="text-[10px] text-zinc-400 italic">Syncing...</span>
                  </div>
                ) : catContacts.length === 0 ? (
                  <div className="flex items-center justify-center py-12 border border-dashed border-zinc-200/60 rounded-xl bg-white/40">
                    <span className="text-[10px] text-zinc-400 italic">No entries</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 py-1">
                    {catContacts.map((contact, idx) => {
                      const prefix = getGenderPrefix(contact.Gender);
                      // If stores category, translate Store ID to Display Name
                      const isStoreCat = cat.key === "stores";
                      const affiliationLabel = isStoreCat
                        ? getStoreDisplayName(contact["ID Link"])
                        : contact["ID Link"];

                      return (
                        <div
                          key={`${contact.Phone || "no-phone"}-${contact.Name || "no-name"}-${idx}`}
                          className="group relative border border-zinc-200 rounded-xl p-3.5 bg-white hover:border-blue-400 hover:shadow-md transition-all flex items-stretch gap-3 min-h-[76px]"
                        >
                          {/* Actions Column (Left Side, same height as details) */}
                          {userRole !== "viewer" && (
                            <div className="flex flex-col justify-center gap-1 pr-2.5 border-r border-zinc-100 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEditClick(contact)}
                                className="p-1 text-zinc-500 hover:text-blue-600 rounded-md hover:bg-zinc-100 cursor-pointer transition-colors"
                                title="Edit Details"
                              >
                                <Edit size={12} />
                              </button>
                              <button
                                onClick={() => setDeletingContact(contact)}
                                className="p-1 text-zinc-500 hover:text-red-600 rounded-md hover:bg-red-50 cursor-pointer transition-colors"
                                title="Remove Contact"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}

                          {/* Details Column */}
                          <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                            {/* Row 1: Name and Phone (Big Text) */}
                            <div className="flex justify-between items-baseline gap-3">
                              <span className="font-bold text-sm text-zinc-950 truncate">
                                {prefix ? `${prefix} ` : ""}{capitalizeWords(contact.Name)}
                              </span>
                              <span className="text-xs font-bold text-zinc-600 select-all shrink-0">
                                {contact.Phone}
                              </span>
                            </div>

                            {/* Row 2: Title @ Store ID and Email (Small Text) */}
                            <div className="flex justify-between items-baseline gap-3 text-[10px]">
                              <span className="font-bold text-zinc-500 truncate">
                                {contact.Position || "Unspecified"}
                                {affiliationLabel ? ` @ ${affiliationLabel}` : ""}
                              </span>
                              <span className="text-zinc-400 font-medium break-all select-all shrink-0">
                                {contact.Email || "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* Add / Edit Overlay Modal */}
      {editingContact && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center z-50 animate-tableFadeIn">
          <div className="bg-white border border-zinc-200 w-full max-w-md rounded-xl p-5 shadow-2xl flex flex-col gap-4 animate-scaleUp">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
              <h3 className="text-xs font-bold text-zinc-950 uppercase tracking-wider">
                {editingContact.isNew ? "Create Contact" : "Modify Contact"}
              </h3>
              <button
                onClick={() => setEditingContact(null)}
                className="text-zinc-400 hover:text-zinc-700 cursor-pointer focus:outline-none"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveContact(editingContact);
              }}
              className="flex flex-col gap-3.5"
            >
              {/* Salutation selection */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">
                  Salutation
                </label>
                <select
                  value={editingContact.Gender || "Mr."}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, Gender: e.target.value })
                  }
                  required
                  className="w-full text-xs bg-white border border-zinc-300 rounded px-3 py-2 text-zinc-900 outline-none focus:border-blue-500 font-semibold cursor-pointer"
                >
                  <option value="Mr.">Mr.</option>
                  <option value="Ms.">Ms.</option>
                </select>
              </div>

              {/* Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={editingContact.Name || ""}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, Name: e.target.value })
                  }
                  className="w-full text-xs bg-white border border-zinc-300 rounded px-3 py-2 text-zinc-900 outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">
                  Phone Number (Unique Key)
                </label>
                <input
                  type="text"
                  required
                  disabled={!editingContact.isNew}
                  value={editingContact.Phone || ""}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, Phone: e.target.value })
                  }
                  className={`w-full text-xs rounded px-3 py-2 font-semibold outline-none border ${
                    !editingContact.isNew
                      ? "bg-zinc-50 border-zinc-200 text-zinc-500 cursor-not-allowed"
                      : "bg-white border-zinc-300 text-zinc-900 focus:border-blue-500"
                  }`}
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editingContact.Email || ""}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, Email: e.target.value })
                  }
                  className="w-full text-xs bg-white border border-zinc-300 rounded px-3 py-2 text-zinc-900 outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              {/* Position */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">
                  Position
                </label>
                <input
                  type="text"
                  value={editingContact.Position || ""}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, Position: e.target.value })
                  }
                  className="w-full text-xs bg-white border border-zinc-300 rounded px-3 py-2 text-zinc-900 outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              {/* Group Link (Category) */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">
                  Category
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. stores"
                  value={editingContact["Group Link"] || ""}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, "Group Link": e.target.value.toLowerCase() })
                  }
                  className="w-full text-xs bg-white border border-zinc-300 rounded px-3 py-2 text-zinc-900 outline-none focus:border-blue-500 font-semibold"
                />
                <span className="text-[10px] text-zinc-400 font-medium mt-0.5">
                  Insert directory classification for this contact (e.g. stores)
                </span>
              </div>

              {/* ID Link (Affiliation Reference) */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider">
                  Affiliation Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. S001"
                  value={editingContact["ID Link"] || ""}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, "ID Link": e.target.value })
                  }
                  className="w-full text-xs bg-white border border-zinc-300 rounded px-3 py-2 text-zinc-900 outline-none focus:border-blue-500 font-semibold"
                />
                <span className="text-[10px] text-zinc-400 font-medium mt-0.5">
                  Insert reference associated with this contact
                </span>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-200 mt-2">
                <CustomButton type="button" variant="default" onClick={() => setEditingContact(null)}>
                  Cancel
                </CustomButton>
                <CustomButton type="submit" variant="dark">
                  Save
                </CustomButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingContact && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-[0.5px] flex items-center justify-center z-50">
          <div className="bg-white border border-zinc-200 w-full max-w-sm rounded-xl p-5 shadow-2xl flex flex-col gap-4 animate-scaleUp">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-lg shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-bold text-zinc-950">Remove Contact</h4>
                <p className="text-xs text-zinc-500">
                  Are you sure you want to delete {getGenderPrefix(deletingContact.Gender)} {deletingContact.Name}? This change will sync to the database immediately.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
              <CustomButton variant="default" onClick={() => setDeletingContact(null)}>
                Cancel
              </CustomButton>
              <CustomButton
                variant="danger"
                onClick={() => handleDeleteContact(deletingContact)}
                className="bg-[#C5221F] hover:bg-[#B0120A] text-white"
              >
                Delete
              </CustomButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
