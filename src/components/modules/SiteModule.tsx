"use client";

import * as React from "react";
import { DataTable, Column } from "../data-table";
import { showToast } from "@/lib/toast";
import { Plus, X, ChevronDown, ChevronUp, FileText, Globe, Trash2, Settings, Loader2 } from "lucide-react";
import { CustomButton } from "../custom-button";

interface SiteModuleProps {
  idToken?: string;
  profile?: any;
}

const WORKER_URL = "https://ib.hsgglobalpteltd.workers.dev";

export function SiteModule({ idToken, profile }: SiteModuleProps) {
  const [sites, setSites] = React.useState<any[]>([]);
  const [tenants, setTenants] = React.useState<any[]>([]);
  const [brands, setBrands] = React.useState<any[]>([]);
  const [fetching, setFetching] = React.useState(true);
  
  // Modals state
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [newSiteId, setNewSiteId] = React.useState("");
  const [newSiteName, setNewSiteName] = React.useState("");
  const [createAssignedEmails, setCreateAssignedEmails] = React.useState("");
  
  const [assignModalOpen, setAssignModalOpen] = React.useState(false);
  const [selectedSite, setSelectedSite] = React.useState<any | null>(null);

  // Settings Modal form states
  const [siteName, setSiteName] = React.useState("");
  const [siteFavicon, setSiteFavicon] = React.useState("");
  const [siteCustomDomain, setSiteCustomDomain] = React.useState("");
  const [siteFbPixel, setSiteFbPixel] = React.useState("");
  const [siteAdsenseId, setSiteAdsenseId] = React.useState("");
  const [siteTiktokPixel, setSiteTiktokPixel] = React.useState("");
  const [siteAssignedEmails, setSiteAssignedEmails] = React.useState("");
  const [selectedAllowedBrandIds, setSelectedAllowedBrandIds] = React.useState<string[]>([]);
  const [uploadingFavicon, setUploadingFavicon] = React.useState(false);

  const columns: Column[] = [
    { id: "id", header: "Site ID (Slug)", accessor: "id" },
    { id: "name", header: "Site Name", accessor: "name" },
    { id: "managers", header: "Managed By Tenants", accessor: "managers_label" },
    { id: "status", header: "Status", accessor: "status" },
  ];

  const loadData = React.useCallback(async () => {
    setFetching(true);
    try {
      // 1. Fetch sites
      const sitesRes = await fetch(`${WORKER_URL}/api/admin/sites`, {
        headers: {
          "Authorization": `Bearer ${idToken}`,
          "X-Session-ID": localStorage.getItem("session_id") || ""
        }
      });
      const rawSitesData = sitesRes.ok ? await sitesRes.json() : [];
      const sitesData = Array.isArray(rawSitesData) ? rawSitesData : [];

      // 2. Fetch tenants (for assignment modal)
      let tenantsData = [];
      try {
        const tenantsRes = await fetch(`${WORKER_URL}/api/admin/tenants`, {
          headers: {
            "Authorization": `Bearer ${idToken}`,
            "X-Session-ID": localStorage.getItem("session_id") || ""
          }
        });
        if (tenantsRes.ok) {
          const rawTenants = await tenantsRes.json();
          tenantsData = Array.isArray(rawTenants) ? rawTenants : [];
        }
      } catch (e) {}

      // 3. Fetch brands catalog (optional)
      let brandsData = [];
      try {
        const brandsRes = await fetch(`${WORKER_URL}/api/admin/cache?sheet=brands_DB`, {
          headers: {
            "Authorization": `Bearer ${idToken}`,
            "X-Session-ID": localStorage.getItem("session_id") || ""
          }
        });
        if (brandsRes.ok) {
          const rawBrands = await brandsRes.json();
          brandsData = Array.isArray(rawBrands) ? rawBrands : (rawBrands.value || []);
        }
      } catch (e) {}
      
      // Filter out 'main' site from standard list (or let it stay, but user specified creating tenant sites here)
      const filteredSites = sitesData.filter((s: any) => s.id !== "main");
      
      const enrichedSites = [];
      for (const s of filteredSites) {
        let pagesList = [];
        try {
          const pagesRes = await fetch(`${WORKER_URL}/api/tenant/pages?siteId=${s.id}`, {
            headers: {
              "Authorization": `Bearer ${idToken}`,
              "X-Session-ID": localStorage.getItem("session_id") || ""
            }
          });
          if (pagesRes.ok) {
            const rawPages = await pagesRes.json();
            pagesList = Array.isArray(rawPages) ? rawPages : [];
          }
        } catch (e) {
          console.error(`Failed to load pages for site ${s.id}`, e);
        }

        enrichedSites.push({
          ...s,
          pages: pagesList,
          managers_label: s.tenant_emails && s.tenant_emails.length > 0 
            ? s.tenant_emails.join(", ") 
            : "Unassigned"
        });
      }
      
      setSites(enrichedSites);
      setTenants(tenantsData.filter((t: any) => t.approved === 1)); // only approved tenants
      setBrands(brandsData);
    } catch (err: any) {
      showToast(err.message || "Failed to load database records", "error");
    } finally {
      setFetching(false);
    }
  }, [idToken]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    const handleDbRefresh = async () => {
      await loadData();
    };
    window.addEventListener("db-refresh", handleDbRefresh);
    return () => window.removeEventListener("db-refresh", handleDbRefresh);
  }, [loadData]);

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newSiteId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!cleanId || !newSiteName.trim()) {
      showToast("Please provide a valid slug and name.", "error");
      return;
    }

    const assignedEmailsArray = createAssignedEmails
      ? createAssignedEmails.split(",").map(e => e.trim().toLowerCase()).filter(Boolean)
      : [];
    
    try {
      const res = await fetch(`${WORKER_URL}/api/admin/sites/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
          "X-Session-ID": localStorage.getItem("session_id") || ""
        },
        body: JSON.stringify({ 
          id: cleanId, 
          name: newSiteName.trim(),
          assigned_emails: assignedEmailsArray
        })
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create site");
      }
      
      showToast(`Created site folder: /${cleanId}`, "success");
      setCreateModalOpen(false);
      setNewSiteId("");
      setNewSiteName("");
      setCreateAssignedEmails("");
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to create site container", "error");
    }
  };

  const handleEditRow = (row: any) => {
    setSelectedSite(row);
    setSiteName(row.name || "");
    setSiteFavicon(row.favicon || "");
    setSiteCustomDomain(row.custom_domain || "");
    setSiteFbPixel(row.fb_pixel || "");
    setSiteAdsenseId(row.adsense_id || "");
    setSiteTiktokPixel(row.tiktok_pixel || "");
    setSiteAssignedEmails((row.tenant_emails || []).join(", "));
    
    let parsedBrands: string[] = [];
    try {
      const rawBrand = row.brand_assigned;
      const parsed = typeof rawBrand === "string" ? JSON.parse(rawBrand) : (rawBrand || []);
      parsedBrands = (Array.isArray(parsed) ? parsed : []).map((b: any) => String(b).trim()).filter(Boolean);
    } catch {}
    setSelectedAllowedBrandIds(parsedBrands);
    setAssignModalOpen(true);
  };

  const handleSaveAssignments = async () => {
    if (!selectedSite) return;
    try {
      const assignedEmailsArray = siteAssignedEmails
        ? siteAssignedEmails.split(",").map(e => e.trim().toLowerCase()).filter(Boolean)
        : [];

      const res = await fetch(`${WORKER_URL}/api/admin/sites/update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
          "X-Session-ID": localStorage.getItem("session_id") || ""
        },
        body: JSON.stringify({
          site_id: selectedSite.id,
          name: siteName.trim(),
          favicon: siteFavicon.trim(),
          custom_domain: siteCustomDomain.trim(),
          fb_pixel: siteFbPixel.trim(),
          adsense_id: siteAdsenseId.trim(),
          tiktok_pixel: siteTiktokPixel.trim(),
          brand_assigned: selectedAllowedBrandIds,
          assigned_emails: assignedEmailsArray
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update site settings");
      }

      showToast(`Updated site settings for /${selectedSite.id}`, "success");
      setAssignModalOpen(false);
      setSelectedSite(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to save settings.", "error");
    }
  };

  const handleToggleBrandCheckbox = (brandId: string) => {
    const cleanId = String(brandId).trim();
    setSelectedAllowedBrandIds(prev => {
      const stringPrev = prev.map(b => String(b).trim());
      return stringPrev.includes(cleanId) 
        ? stringPrev.filter(b => b !== cleanId) 
        : [...stringPrev, cleanId];
    });
  };

  const handleDeleteSite = async (row: any) => {
    const confirmation = confirm(`Delete site container /${row.id} and ALL of its pages? This action is permanent.`);
    if (!confirmation) return;
    
    try {
      const res = await fetch(`${WORKER_URL}/api/admin/sites/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
          "X-Session-ID": localStorage.getItem("session_id") || ""
        },
        body: JSON.stringify({ site_id: row.id })
      });
      if (!res.ok) throw new Error();
      showToast(`Deleted site container: /${row.id}`, "success");
      loadData();
    } catch {
      showToast("Failed to delete site folder.", "error");
    }
  };

  const handleToggleFreezeSite = async (row: any) => {
    const newStatus = row.status === "active" ? "suspended" : "active";
    try {
      const res = await fetch(`${WORKER_URL}/api/admin/sites/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
          "X-Session-ID": localStorage.getItem("session_id") || ""
        },
        body: JSON.stringify({ site_id: row.id, status: newStatus })
      });
      if (!res.ok) throw new Error();
      showToast(`Updated site status for /${row.id} to ${newStatus === "suspended" ? "Suspended" : "Active"}`, "success");
      loadData();
    } catch {
      showToast("Failed to update site status.", "error");
    }
  };

  const handleToggleFreezePage = async (siteId: string, pagePath: string, currentlySuspended: number) => {
    const newSuspended = currentlySuspended === 1 ? 0 : 1;
    try {
      const res = await fetch(`${WORKER_URL}/api/admin/pages/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
          "X-Session-ID": localStorage.getItem("session_id") || ""
        },
        body: JSON.stringify({ site_id: siteId, page_path: pagePath, suspended: newSuspended })
      });
      if (!res.ok) throw new Error();
      showToast(`Updated page status for /${siteId}${pagePath ? "/" + pagePath : ""} to ${newSuspended === 1 ? "Suspended" : "Active"}`, "success");
      loadData();
    } catch {
      showToast("Failed to update page status.", "error");
    }
  };

  const handleUploadFavicon = async (file: File) => {
    if (!selectedSite) return;
    const filename = `favicons/${selectedSite.id}/${Date.now()}_${file.name}`;
    try {
      const fileData = await file.arrayBuffer();
      const res = await fetch(`${WORKER_URL}/api/upload?filename=${encodeURIComponent(filename)}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${idToken}`,
          "Content-Type": file.type || "application/octet-stream"
        },
        body: fileData
      });
      if (res.ok) {
        const data = await res.json();
        setSiteFavicon(data.url);
        showToast("Favicon uploaded successfully.", "success");
      } else {
        showToast("Failed to upload favicon.", "error");
      }
    } catch {
      showToast("Network error uploading favicon.", "error");
    }
  };

  const [expandedSites, setExpandedSites] = React.useState<Record<string, boolean>>({});
  const toggleSiteExpand = (siteId: string) => {
    setExpandedSites(prev => ({
      ...prev,
      [siteId]: !prev[siteId]
    }));
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden gap-[10px] min-w-0">
      <div className="content-header flex justify-between items-center mb-1 px-1 shrink-0">
        <span className="font-primary text-sm font-semibold text-zinc-500">
          Manage website domains and allocation folders.
        </span>
        <CustomButton onClick={() => setCreateModalOpen(true)} variant="dark" className="h-9 text-xs flex items-center gap-1.5">
          <Plus size={15} /> Create Site
        </CustomButton>
      </div>

      <div className="content-body flex-1 w-full overflow-y-auto p-1">
        {fetching ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="animate-spin text-zinc-500 w-8 h-8" />
          </div>
        ) : sites.length === 0 ? (
          <div className="flex items-center justify-center h-48 bg-[#F0F4F9] border border-dashed border-slate-200 rounded select-none">
            <span className="font-primary text-sm text-zinc-500 italic">
              No websites created yet. Click "Create Site" to begin.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sites.map((site) => (
              <div key={site.id} className="flex flex-col bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden relative font-primary">
                
                {/* Card Top / Header */}
                <div className="p-4 flex gap-3 items-start">
                  <div className="w-10 h-10 rounded-full bg-zinc-50 border border-zinc-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {site.favicon ? (
                      <img src={site.favicon.replace(/ /g, "%20")} alt="Favicon" className="w-full h-full object-cover" />
                    ) : (
                      <Globe size={18} className="text-zinc-400" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-zinc-900 truncate" title={site.name}>{site.name}</h3>
                    <p className="text-xs text-zinc-450 truncate" title={`/${site.id}`}>Slug: <span className="font-semibold">/{site.id}</span></p>
                    {site.custom_domain && (
                      <p className="text-[10px] text-zinc-500 truncate" title={site.custom_domain}>Domain: <span className="underline">{site.custom_domain}</span></p>
                    )}
                  </div>

                  {/* Right side toggle status */}
                  <div className="flex flex-col gap-1 items-end">
                    <button
                      onClick={() => handleToggleFreezeSite(site)}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors border ${
                        site.status === "active"
                          ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                          : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                      }`}
                      title={site.status === "active" ? "Active (click to suspend)" : "Suspended (click to activate)"}
                    >
                      {site.status === "active" ? "Active" : "Suspended"}
                    </button>
                  </div>
                </div>

                {/* Card Content Details */}
                <div className="px-4 pb-3 flex flex-col gap-1.5 text-xs text-zinc-600 border-b border-zinc-100">
                  <p className="truncate">
                    <span className="font-bold text-zinc-700">Assigned Users:</span>{" "}
                    {site.tenant_emails && site.tenant_emails.length > 0 
                      ? site.tenant_emails.join(", ") 
                      : <span className="italic text-zinc-400 font-semibold">Admin-Owned</span>
                    }
                  </p>
                  <p className="truncate">
                    <span className="font-bold text-zinc-700">Allowed Brands:</span>{" "}
                    {(() => {
                      let parsedBrands: string[] = [];
                      try {
                        const rawBrand = site.brand_assigned;
                        parsedBrands = typeof rawBrand === "string" ? JSON.parse(rawBrand) : (rawBrand || []);
                      } catch {}
                      if (parsedBrands.length === 0) return <span className="italic text-zinc-450">None</span>;
                      
                      const brandNames = parsedBrands.map(id => {
                        const b = Array.isArray(brands) ? brands.find(x => String(x.ID) === String(id)) : null;
                        return b ? (b["Display Name"] || b.Name) : id;
                      });
                      return brandNames.join(", ");
                    })()}
                  </p>
                </div>

                {/* Actions Toolbar */}
                <div className="px-4 py-2.5 flex justify-between bg-zinc-50/50 items-center shrink-0">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEditRow(site)}
                      className="flex items-center gap-1 text-[11px] font-bold text-zinc-650 hover:text-zinc-900 border border-zinc-200 bg-white rounded-lg px-2.5 py-1 transition-colors cursor-pointer shadow-3xs"
                    >
                      <Settings size={12} /> Settings
                    </button>
                    <button 
                      onClick={() => handleDeleteSite(site)}
                      className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:text-red-700 border border-red-100 bg-white rounded-lg px-2.5 py-1 transition-colors cursor-pointer shadow-3xs"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>

                {/* Collapsible Pages list header */}
                <div 
                  onClick={() => toggleSiteExpand(site.id)}
                  className="flex items-center justify-between p-3 bg-zinc-50 border-t border-zinc-100 hover:bg-zinc-100/50 cursor-pointer select-none text-xs font-semibold text-zinc-700"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText size={14} className="text-zinc-500" /> Pages ({(site.pages || []).length})
                  </span>
                  {expandedSites[site.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>

                {/* Collapsible Pages list body */}
                {expandedSites[site.id] && (
                  <div className="flex flex-col border-t divide-y divide-zinc-100 bg-zinc-50/20 max-h-[160px] overflow-y-auto">
                    {(site.pages || []).length === 0 ? (
                      <div className="p-3 text-[11px] text-zinc-400 italic text-center bg-zinc-50/10">
                        No pages created for this site yet.
                      </div>
                    ) : (
                      (site.pages || []).map((page: any) => (
                        <div key={page.page_path} className="flex justify-between items-center p-3 text-xs">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="font-semibold text-zinc-800 truncate">
                              {page.page_path === "" ? "/" : `/${page.page_path}`}
                            </span>
                            <span className="text-[10px] text-zinc-400 truncate" title={page.seo_title || "No SEO Title"}>
                              {page.seo_title || "No SEO Title"}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2.5 flex-shrink-0 ml-2">
                            <span className={page.published === 1 
                              ? "px-2 py-0.5 text-[9px] font-bold text-green-700 bg-green-50 rounded" 
                              : "px-2 py-0.5 text-[9px] font-bold text-zinc-500 bg-zinc-100 rounded"}
                            >
                              {page.published === 1 ? "Published" : "Draft"}
                            </span>

                            <button
                              onClick={() => handleToggleFreezePage(site.id, page.page_path, page.suspended || 0)}
                              className={`px-2 py-1 text-[9px] font-bold rounded cursor-pointer transition-colors border ${
                                page.suspended === 1
                                  ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                  : "bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                              }`}
                              title={page.suspended === 1 ? "Suspended (click to activate)" : "Active (click to suspend)"}
                            >
                              {page.suspended === 1 ? "Suspended" : "Active"}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Create Site */}
      {createModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-primary">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-lg font-bold text-zinc-955">Create New Site Container</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-zinc-400 hover:text-zinc-650 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateSite} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-700">Site ID / Route Slug (lowercase only)</label>
                <input 
                  type="text" 
                  className="h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:outline-none focus:border-zinc-950 bg-zinc-50/50" 
                  placeholder="e.g. sitetenant1"
                  value={newSiteId}
                  onChange={(e) => setNewSiteId(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-700">Site Display Name</label>
                <input 
                  type="text" 
                  className="h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:outline-none focus:border-zinc-950 bg-zinc-50/50" 
                  placeholder="e.g. Portal Site homepage"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-700">Assigned Users (Emails)</label>
                <input 
                  type="text" 
                  className="h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:outline-none focus:border-zinc-950 bg-zinc-50/50" 
                  placeholder="e.g. user1@test.com, user2@test.com"
                  value={createAssignedEmails}
                  onChange={(e) => setCreateAssignedEmails(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <CustomButton type="button" onClick={() => setCreateModalOpen(false)} variant="secondary" className="h-9 text-xs">
                  Cancel
                </CustomButton>
                <CustomButton type="submit" variant="dark" className="h-9 text-xs">
                  Create Container
                </CustomButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Site Settings */}
      {assignModalOpen && selectedSite && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-primary">
          <div className="w-full max-w-4xl bg-white border border-zinc-200 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center border-b pb-2 shrink-0">
              <h3 className="text-md font-bold text-zinc-955 flex items-center gap-2">
                <Settings size={18} className="text-zinc-600" /> Site Settings: /{selectedSite.id}
              </h3>
              <button onClick={() => setAssignModalOpen(false)} className="text-zinc-400 hover:text-zinc-650 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-1 flex-1 py-1">
              {/* Left Column: General Configuration */}
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wide border-b pb-1">Site Configuration</h4>
                
                {/* Name */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">Site Display Name</label>
                  <input 
                    type="text" 
                    className="h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:outline-none focus:border-zinc-950 bg-zinc-50/50" 
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    required
                  />
                </div>

                {/* Custom Domain */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">Custom Domain Name</label>
                  <input 
                    type="text" 
                    className="h-9 px-3 border border-zinc-300 rounded-lg text-xs focus:outline-none focus:border-zinc-950 bg-zinc-50/50" 
                    placeholder="e.g. www.mysite.com"
                    value={siteCustomDomain}
                    onChange={(e) => setSiteCustomDomain(e.target.value)}
                  />
                </div>

                {/* Favicon Upload */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">FAVICON (MAX 512KB)</label>
                  <div className="flex items-center gap-3 p-2 bg-zinc-50 border border-zinc-200 rounded-lg">
                    <div className="w-9 h-9 rounded-full bg-white border border-zinc-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {siteFavicon ? (
                        <img src={siteFavicon.replace(/ /g, "%20")} alt="Favicon" className="w-full h-full object-cover" />
                      ) : (
                        <Globe size={14} className="text-zinc-400" />
                      )}
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      <input 
                        type="file" 
                        id="favicon-file-input" 
                        accept="image/png, image/jpeg, image/x-icon, image/gif, image/svg+xml" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploadingFavicon(true);
                            await handleUploadFavicon(file);
                            setUploadingFavicon(false);
                          }
                        }}
                      />
                      <div className="flex gap-2 items-center">
                        <CustomButton 
                          type="button" 
                          onClick={() => document.getElementById("favicon-file-input")?.click()}
                          className="h-7 text-[10px] px-3.5 py-0 rounded border-zinc-200 bg-white hover:bg-zinc-50 font-bold text-zinc-700"
                          disabled={uploadingFavicon}
                        >
                          {uploadingFavicon ? "Uploading..." : "Upload Image"}
                        </CustomButton>
                        {siteFavicon && (
                          <CustomButton 
                            type="button" 
                            onClick={() => setSiteFavicon("")}
                            className="h-7 text-[10px] px-3.5 py-0 rounded border-red-200 bg-red-55 text-red-750 hover:bg-red-100 font-bold"
                          >
                            Remove
                          </CustomButton>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* FB & TikTok Pixels, Google AdSense */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-705 uppercase tracking-wider">FB Pixel ID</label>
                    <input 
                      type="text" 
                      className="h-9 px-2 border border-zinc-300 rounded-lg text-xs focus:outline-none focus:border-zinc-950 bg-zinc-50/50" 
                      value={siteFbPixel}
                      onChange={(e) => setSiteFbPixel(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-705 uppercase tracking-wider">AdSense ID</label>
                    <input 
                      type="text" 
                      className="h-9 px-2 border border-zinc-300 rounded-lg text-xs focus:outline-none focus:border-zinc-950 bg-zinc-50/50" 
                      value={siteAdsenseId}
                      onChange={(e) => setSiteAdsenseId(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-705 uppercase tracking-wider">TikTok Pixel</label>
                    <input 
                      type="text" 
                      className="h-9 px-2 border border-zinc-300 rounded-lg text-xs focus:outline-none focus:border-zinc-950 bg-zinc-50/50" 
                      value={siteTiktokPixel}
                      onChange={(e) => setSiteTiktokPixel(e.target.value)}
                    />
                  </div>
                </div>

                {/* Assigned Users Comma-Separated Input */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider">Assigned Users (Emails)</label>
                  <p className="text-[10px] text-zinc-500 mb-0.5">Enter user emails separated by commas. Leave empty for Administrator only:</p>
                  <textarea 
                    className="p-2 border border-zinc-300 rounded-lg text-xs focus:outline-none focus:border-zinc-955 bg-zinc-50/50 h-16 resize-none" 
                    placeholder="user1@test.com, user2@test.com"
                    value={siteAssignedEmails}
                    onChange={(e) => setSiteAssignedEmails(e.target.value)}
                  />
                </div>
              </div>

              {/* Right Column: Brand Checkbox Assignment */}
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wide border-b pb-1">Allowed Brands Allocation</h4>
                <p className="text-[11px] text-zinc-500 mb-1">Select which brands this site is allowed to manage and display:</p>
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[300px] border border-zinc-200 p-2 rounded-lg bg-zinc-50/30">
                  {brands.length === 0 ? (
                    <p className="text-xs italic text-zinc-400 py-2">No brands found in database.</p>
                  ) : (
                    brands.map((b) => (
                      <label key={b.ID} className="flex items-center gap-3 p-2 bg-zinc-50/50 border rounded-lg cursor-pointer hover:bg-zinc-100/50 transition-colors">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded text-zinc-900 border-zinc-300 focus:ring-zinc-900"
                          checked={selectedAllowedBrandIds.includes(String(b.ID))}
                          onChange={() => handleToggleBrandCheckbox(String(b.ID))}
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-zinc-800">{b["Display Name"] || b.Name || "Unnamed Brand"}</span>
                          <span className="text-[10px] text-zinc-500">ID: {b.ID}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t shrink-0">
              <CustomButton onClick={() => setAssignModalOpen(false)} variant="secondary" className="h-9 text-xs">
                Cancel
              </CustomButton>
              <CustomButton onClick={handleSaveAssignments} variant="dark" className="h-9 text-xs">
                Save Site Settings
              </CustomButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
