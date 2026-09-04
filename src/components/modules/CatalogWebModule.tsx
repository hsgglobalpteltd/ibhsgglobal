"use client";

import * as React from "react";
import * as XLSX from "xlsx";
import {
  Layout,
  Settings,
  Save,
  RefreshCw,
  Upload,
  Trash2,
  CheckCircle2,
  Package,
  Layers,
  Sparkles,
  Calendar,
  Image as ImageIcon,
  Edit2,
  Check,
  X,
  ExternalLink,
  Plus,
  Shield,
  Loader2,
  Phone,
  Mail,
  Sliders,
  Send,
  User,
  MessageSquare,
  MessageCircle,
  HelpCircle,
  Clock,
  ChevronRight,
  Info,
  History,
  FileText,
  Bot,
  Search,
  Download,
  BookOpen,
  XCircle,
  Eye,
  FileSpreadsheet,
  AlertCircle
} from "lucide-react";
import { NavigationTabs, TabItem } from "../navigation-tabs";
import { showToast } from "@/lib/toast";
import { generateExportCatalogPdf } from "@/utils/catalogPdf";

interface CsContextItem {
  id: string;
  category: string;
  title: string;
  content: string;
  is_active: boolean;
  priority: number;
  created_at: number;
  updated_at: number;
}

interface CsMessage {
  id: string;
  sender: "visitor" | "agent";
  text: string;
  timestamp: number;
}

interface CsConversation {
  id: string;
  session_id: string;
  visitor_name?: string;
  visitor_contact?: string;
  messages: CsMessage[];
  status: string;
  created_at: number;
  updated_at: number;
}

const CS_CATEGORY_OPTIONS = [
  "Company Profile",
  "Order & Delivery Policy",
  "Payment & Credit Terms",
  "Brand Portfolio",
  "Contact & Escalation",
  "Product Guidance",
  "General FAQ"
];

interface CatalogWebModuleProps {
  idToken?: string;
  profile?: any;
}

const WORKER_URL = "https://ib-v2.hsgglobalpteltd.workers.dev";

// Client-side WebP Image Compressor (Converts to WebP & strictly compresses to <= 500KB max)
async function compressImageToWebp(file: File, maxWidth = 1920, targetMaxBytes = 500 * 1024): Promise<{ base64Data: string; filename: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context failed"));
        ctx.drawImage(img, 0, 0, width, height);

        // Iterative compression: test quality levels to guarantee <= 500KB
        let quality = 0.85;
        let dataUrl = canvas.toDataURL("image/webp", quality);
        let base64Data = dataUrl.split(",")[1];
        let byteSize = Math.round((base64Data.length * 3) / 4);

        // If above 500KB, reduce quality or scale down canvas
        while (byteSize > targetMaxBytes && quality > 0.4) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL("image/webp", quality);
          base64Data = dataUrl.split(",")[1];
          byteSize = Math.round((base64Data.length * 3) / 4);
        }

        // If still above 500KB, scale down dimensions
        if (byteSize > targetMaxBytes) {
          const scaledCanvas = document.createElement("canvas");
          scaledCanvas.width = Math.round(width * 0.75);
          scaledCanvas.height = Math.round(height * 0.75);
          const scaledCtx = scaledCanvas.getContext("2d");
          if (scaledCtx) {
            scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
            dataUrl = scaledCanvas.toDataURL("image/webp", 0.75);
            base64Data = dataUrl.split(",")[1];
          }
        }

        const rawName = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
        const cleanName = rawName.replace(/[^a-zA-Z0-9_-]/g, "_") + ".webp";
        resolve({ base64Data, filename: cleanName });
      };
      img.onerror = () => reject(new Error("Failed to load image for WebP compression"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function CatalogWebModule({ idToken, profile }: CatalogWebModuleProps) {
  const [activeTab, setActiveTab] = React.useState<"layout" | "catalog" | "setting" | "cs">("layout");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  // Excel Bulk Upload States
  const fileInputExcelRef = React.useRef<HTMLInputElement | null>(null);
  const [bulkPreviewItems, setBulkPreviewItems] = React.useState<any[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = React.useState(false);
  const [bulkUpdating, setBulkUpdating] = React.useState(false);
  const [bulkParseStats, setBulkParseStats] = React.useState<{ matched: number; newItems: number; total: number }>({
    matched: 0,
    newItems: 0,
    total: 0
  });

  // Layout Tab States
  const [selectedHeroTab, setSelectedHeroTab] = React.useState<"A" | "B" | "C">("A");
  const [layoutConfig, setLayoutConfig] = React.useState<any>({
    top_banner: "FINE FOOD AUSTRALIA 2026 OFFICIAL EXHIBITOR • HSG GLOBAL PTE LTD",
    hero_groups: [
      {
        id: "A",
        label: "Hero A (Mandatory)",
        enabled: true,
        headline_1: "Connecting Southeast Asian Taste",
        headline_2: "To Australian Shelves & Kitchens",
        subtext:
          "Ready-to-cook authentic Asian culinary pastes, ambient Halal food, and refreshing beverages for Australian supermarkets & foodservice — and your trusted FMCG distribution gateway into Singapore."
      },
      {
        id: "B",
        label: "Hero B (Optional Rotation)",
        enabled: false,
        headline_1: "",
        headline_2: "",
        subtext: ""
      },
      {
        id: "C",
        label: "Hero C (Optional Rotation)",
        enabled: false,
        headline_1: "",
        headline_2: "",
        subtext: ""
      }
    ],
    booking_start_date: "2026-08-27",
    booking_end_date: "2026-08-29",
    footer_showcase_text: "HSG Global Official Export & Trade Showcase",
    email_subject_tag: "HSG Global Trade",
    email_greeting: "Thank you for your interest in HSG Global Pte Ltd! We are pleased to share our official export catalog and product portfolio with you."
  });

  // Settings Tab States (Email, WhatsApp, Order & Prospect Automations)
  const [emailSettings, setEmailSettings] = React.useState({
    receiver_order_email: "sales@hsg-global.com",
    receiver_order_cc_1: "",
    receiver_order_cc_2: "",
    receiver_order_cc_3: "",
    receiver_order_whatsapp: "+6583494429",
    toggle_send_email_buyer: true,
    toggle_reminder_order: true,
    toggle_order_submission_received: true,
    toggle_update_order: true,
    toggle_send_email_prospect: true
  });

  const [triggeringReminder, setTriggeringReminder] = React.useState(false);
  const [testingTemplate, setTestingTemplate] = React.useState<string | null>(null);

  // Products & Brands Data
  const [products, setProducts] = React.useState<any[]>([]);
  const [brands, setBrands] = React.useState<any[]>([]);
  const [searchProductQuery, setSearchProductQuery] = React.useState("");

  // Edit Product Modal
  const [editingProduct, setEditingProduct] = React.useState<any | null>(null);
  const [savingProduct, setSavingProduct] = React.useState(false);

  // Edit Brand Modal
  const [editingBrand, setEditingBrand] = React.useState<any | null>(null);
  const [savingBrand, setSavingBrand] = React.useState(false);

  // Logos & Media Assets
  const [logos, setLogos] = React.useState<{
    retailers: Array<{ key: string; filename: string; url: string; size: number }>;
    brands: Array<{ key: string; filename: string; url: string; size: number }>;
    hero: Array<{ key: string; filename: string; url: string; size: number }>;
  }>({
    retailers: [],
    brands: [],
    hero: []
  });

  // Customer Service State
  const [csSubTab, setCsSubTab] = React.useState<"context" | "logs" | "simulator">("context");
  const [csContexts, setCsContexts] = React.useState<CsContextItem[]>([]);
  const [csContextLoading, setCsContextLoading] = React.useState(false);
  const [csContextSearch, setCsContextSearch] = React.useState("");
  const [csSelectedCategory, setCsSelectedCategory] = React.useState("all");

  // CS Context Modal State
  const [isCsContextModalOpen, setIsCsContextModalOpen] = React.useState(false);
  const [editingCsContext, setEditingCsContext] = React.useState<CsContextItem | null>(null);
  const [csContextForm, setCsContextForm] = React.useState({
    id: "",
    category: "Company Profile",
    title: "",
    content: "",
    is_active: true,
    priority: 1
  });
  const [csContextSaving, setCsContextSaving] = React.useState(false);

  // CS Delete Context State
  const [csDeleteConfirmOpen, setCsDeleteConfirmOpen] = React.useState(false);
  const [deletingCsContextId, setDeletingCsContextId] = React.useState<string | null>(null);

  // CS Conversations State
  const [csConversations, setCsConversations] = React.useState<CsConversation[]>([]);
  const [csLogsLoading, setCsLogsLoading] = React.useState(false);
  const [csLogsSearch, setCsLogsSearch] = React.useState("");
  const [selectedCsConversation, setSelectedCsConversation] = React.useState<CsConversation | null>(null);
  const [isCsTranscriptModalOpen, setIsCsTranscriptModalOpen] = React.useState(false);

  // CS Simulator State
  const [simulatorMessages, setSimulatorMessages] = React.useState<CsMessage[]>([
    {
      id: "sim_init",
      sender: "agent",
      text: "Hello! I am your HSG Global customer support concierge. How may I assist you today?",
      timestamp: Date.now()
    }
  ]);
  const [simulatorInput, setSimulatorInput] = React.useState("");
  const [simulatorLoading, setSimulatorLoading] = React.useState(false);
  const simulatorEndRef = React.useRef<HTMLDivElement>(null);

  // CS Fetch Contexts
  const fetchCsContexts = async () => {
    setCsContextLoading(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/cs/context`);
      const data = (await res.json()) as any;
      if (data && data.success && Array.isArray(data.data)) {
        setCsContexts(data.data);
      } else {
        setCsContexts([]);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load knowledge context", "error");
    } finally {
      setCsContextLoading(false);
    }
  };

  // CS Fetch Conversations
  const fetchCsConversations = async () => {
    setCsLogsLoading(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/cs/conversations`);
      const data = (await res.json()) as any;
      if (data && data.success && Array.isArray(data.data)) {
        const parsed = data.data.map((c: any) => ({
          ...c,
          messages: Array.isArray(c.messages) ? c.messages : typeof c.messages === "string" ? JSON.parse(c.messages) : []
        }));
        setCsConversations(parsed);
      } else {
        setCsConversations([]);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load conversation logs", "error");
    } finally {
      setCsLogsLoading(false);
    }
  };

  // Save CS Context
  const handleSaveCsContext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csContextForm.title.trim() || !csContextForm.content.trim()) {
      showToast("Title and Content are required", "error");
      return;
    }

    setCsContextSaving(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/cs/context/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: csContextForm })
      });
      const data = (await res.json()) as any;
      if (data && data.success) {
        showToast("Knowledge context saved successfully", "success");
        setIsCsContextModalOpen(false);
        setEditingCsContext(null);
        fetchCsContexts();
      } else {
        throw new Error(data?.error || "Failed to save context");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save context", "error");
    } finally {
      setCsContextSaving(false);
    }
  };

  // Delete CS Context
  const handleDeleteCsContextConfirm = async () => {
    if (!deletingCsContextId) return;
    try {
      const res = await fetch(`${WORKER_URL}/api/cs/context/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deletingCsContextId })
      });
      const data = (await res.json()) as any;
      if (data && data.success) {
        showToast("Knowledge context entry deleted", "info");
        setCsDeleteConfirmOpen(false);
        setDeletingCsContextId(null);
        fetchCsContexts();
      } else {
        throw new Error(data?.error || "Failed to delete context");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to delete context", "error");
    }
  };

  // Toggle CS Context Active
  const handleToggleCsActive = async (item: CsContextItem) => {
    const updated = { ...item, is_active: !item.is_active };
    try {
      const res = await fetch(`${WORKER_URL}/api/cs/context/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: updated })
      });
      const data = (await res.json()) as any;
      if (data && data.success) {
        showToast(`Context ${updated.is_active ? "activated" : "deactivated"}`, "success");
        setCsContexts(prev => prev.map(c => c.id === item.id ? updated : c));
      }
    } catch (err: any) {
      showToast(err.message || "Failed to update state", "error");
    }
  };

  // Simulator Send
  const handleSimulatorSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatorInput.trim() || simulatorLoading) return;

    const userText = simulatorInput.trim();
    const userMsg: CsMessage = {
      id: "sim_u_" + Date.now(),
      sender: "visitor",
      text: userText,
      timestamp: Date.now()
    };

    const newHistory = [...simulatorMessages, userMsg];
    setSimulatorMessages(newHistory);
    setSimulatorInput("");
    setSimulatorLoading(true);

    try {
      const res = await fetch(`${WORKER_URL}/api/cs/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          session_id: "admin_simulator_session",
          conversation_id: "SIMULATOR-TEST",
          visitor_name: "Admin Simulator",
          history: newHistory
        })
      });
      const data = (await res.json()) as any;
      if (data && data.success && data.reply) {
        const agentMsg: CsMessage = {
          id: "sim_a_" + Date.now(),
          sender: "agent",
          text: data.reply,
          timestamp: Date.now()
        };
        setSimulatorMessages(prev => [...prev, agentMsg]);
      } else {
        throw new Error(data?.error || "No reply returned");
      }
    } catch (err: any) {
      const errorMsg: CsMessage = {
        id: "sim_err_" + Date.now(),
        sender: "agent",
        text: "Error: Unable to generate response. Please verify context and API settings.",
        timestamp: Date.now()
      };
      setSimulatorMessages(prev => [...prev, errorMsg]);
    } finally {
      setSimulatorLoading(false);
      setTimeout(() => {
        simulatorEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  // Filtered CS Contexts
  const filteredCsContexts = React.useMemo(() => {
    return csContexts.filter(c => {
      const matchesCat = csSelectedCategory === "all" || c.category === csSelectedCategory;
      const matchesSearch = !csContextSearch.trim() || 
        c.title.toLowerCase().includes(csContextSearch.toLowerCase()) ||
        c.content.toLowerCase().includes(csContextSearch.toLowerCase()) ||
        c.category.toLowerCase().includes(csContextSearch.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [csContexts, csSelectedCategory, csContextSearch]);

  // Filtered CS Conversations
  const filteredCsConversations = React.useMemo(() => {
    return csConversations.filter(c => {
      if (!csLogsSearch.trim()) return true;
      const s = csLogsSearch.toLowerCase();
      const matchId = c.id.toLowerCase().includes(s);
      const matchSession = c.session_id?.toLowerCase().includes(s);
      const matchName = c.visitor_name?.toLowerCase().includes(s);
      const matchContact = c.visitor_contact?.toLowerCase().includes(s);
      const matchText = c.messages?.some(m => m.text?.toLowerCase().includes(s));
      return matchId || matchSession || matchName || matchContact || matchText;
    });
  }, [csConversations, csLogsSearch]);

  // 1. Load All Configurations & Data
  const loadAllData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [configRes, prodRes, logosRes, directSettingsRes] = await Promise.all([
        fetch(`${WORKER_URL}/api/exhibitor/config`),
        fetch(`${WORKER_URL}/api/exhibitor/all-products`),
        fetch(`${WORKER_URL}/api/exhibitor/logos`),
        fetch(`${WORKER_URL}/api/directorder/settings`)
      ]);

      if (configRes.ok) {
        const cData = await configRes.json();
        if (cData.layout) setLayoutConfig((prev: any) => ({ ...prev, ...cData.layout }));
        if (cData.settings) setEmailSettings((prev: any) => ({ ...prev, ...cData.settings }));
      }

      if (directSettingsRes.ok) {
        const directJson = await directSettingsRes.json();
        const list = Array.isArray(directJson) ? directJson : [];
        const waRec = list.find((s: any) => s.key === "receiver_order_whatsapp");
        const emailRec = list.find((s: any) => s.key === "receiver_order_email");
        const cc1Rec = list.find((s: any) => s.key === "receiver_order_cc_1");
        const cc2Rec = list.find((s: any) => s.key === "receiver_order_cc_2");
        const cc3Rec = list.find((s: any) => s.key === "receiver_order_cc_3");
        const buyerRec = list.find((s: any) => s.key === "toggle_send_email_buyer");
        const reminderRec = list.find((s: any) => s.key === "toggle_reminder_order");
        const receivedRec = list.find((s: any) => s.key === "toggle_order_submission_received");
        const updateRec = list.find((s: any) => s.key === "toggle_update_order");

        setEmailSettings((prev: any) => ({
          ...prev,
          receiver_order_whatsapp: waRec?.value || prev.receiver_order_whatsapp,
          receiver_order_email: emailRec?.value || prev.receiver_order_email,
          receiver_order_cc_1: cc1Rec?.value ?? prev.receiver_order_cc_1,
          receiver_order_cc_2: cc2Rec?.value ?? prev.receiver_order_cc_2,
          receiver_order_cc_3: cc3Rec?.value ?? prev.receiver_order_cc_3,
          toggle_send_email_buyer: buyerRec ? buyerRec.value === "true" : prev.toggle_send_email_buyer,
          toggle_reminder_order: reminderRec ? reminderRec.value === "true" : prev.toggle_reminder_order,
          toggle_order_submission_received: receivedRec ? receivedRec.value === "true" : prev.toggle_order_submission_received,
          toggle_update_order: updateRec ? updateRec.value === "true" : prev.toggle_update_order
        }));
      }

      if (prodRes.ok) {
        const pData = await prodRes.json();
        if (pData.products) setProducts(pData.products);
        if (pData.brands) setBrands(pData.brands);
      }

      if (logosRes.ok) {
        const lData = await logosRes.json();
        setLogos({
          retailers: lData.retailers || [],
          brands: lData.brands || [],
          hero: lData.hero || []
        });
      }
    } catch (err: any) {
      console.error("Failed to load catalog web configs:", err);
      showToast("Failed to load catalog web settings", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAllData();
    fetchCsContexts();
    fetchCsConversations();
  }, [loadAllData]);

  React.useEffect(() => {
    const handleRefresh = () => {
      loadAllData();
      fetchCsContexts();
      fetchCsConversations();
    };
    window.addEventListener("db-refresh", handleRefresh);
    return () => window.removeEventListener("db-refresh", handleRefresh);
  }, [loadAllData]);

  // 2. Save Layout / Settings (Syncs to both Exhibitor and Direct Order settings)
  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const [res1, res2] = await Promise.all([
        fetch(`${WORKER_URL}/api/exhibitor/config`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            layout: layoutConfig,
            settings: emailSettings
          })
        }),
        fetch(`${WORKER_URL}/api/directorder/settings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: [
              { key: "receiver_order_whatsapp", value: (emailSettings.receiver_order_whatsapp || "").trim() },
              { key: "receiver_order_email", value: (emailSettings.receiver_order_email || "").trim() },
              { key: "receiver_order_cc_1", value: (emailSettings.receiver_order_cc_1 || "").trim() },
              { key: "receiver_order_cc_2", value: (emailSettings.receiver_order_cc_2 || "").trim() },
              { key: "receiver_order_cc_3", value: (emailSettings.receiver_order_cc_3 || "").trim() },
              { key: "toggle_send_email_buyer", value: String(emailSettings.toggle_send_email_buyer) },
              { key: "toggle_reminder_order", value: String(emailSettings.toggle_reminder_order) },
              { key: "toggle_order_submission_received", value: String(emailSettings.toggle_order_submission_received) },
              { key: "toggle_update_order", value: String(emailSettings.toggle_update_order) },
              { key: "toggle_send_email_prospect", value: String(emailSettings.toggle_send_email_prospect) }
            ]
          })
        })
      ]);

      if (!res1.ok && !res2.ok) throw new Error("Failed to save configuration");
      showToast("Routing, notifications & automation settings saved successfully", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  // Trigger manual reminder
  const handleTriggerReminder = async () => {
    setTriggeringReminder(true);
    try {
      const res = await fetch(`${WORKER_URL}/api/public/order/trigger-reminder`, {
        method: "POST"
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "Trigger failed");
      showToast(`Reminder run completed! Processed: ${result.processed || 0} reminders.`, "success");
    } catch (err: any) {
      showToast("Failed to trigger reminder: " + err.message, "error");
    } finally {
      setTriggeringReminder(false);
    }
  };

  // Send test template email (Order templates & Prospect templates)
  const handleTestTemplate = async (templateType: string) => {
    if (!emailSettings.receiver_order_email?.trim()) {
      showToast("Please input Primary Receiver Email first", "warning");
      return;
    }
    setTestingTemplate(templateType);
    try {
      const res = await fetch(`${WORKER_URL}/api/public/order/test-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateType,
          adminEmail: emailSettings.receiver_order_email.trim()
        })
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to send test email");
      showToast(`Test email (${templateType}) sent to ${emailSettings.receiver_order_email}`, "success");
    } catch (err: any) {
      showToast("Test failed: " + err.message, "error");
    } finally {
      setTestingTemplate(null);
    }
  };

  // 3. Toggle Product List in Catalog
  const handleToggleProduct = async (sku: string, currentVal: boolean) => {
    const newVal = !currentVal;
    setProducts((prev) =>
      prev.map((p) => (p.sku === sku ? { ...p, list_in_catalog: newVal } : p))
    );

    try {
      const res = await fetch(`${WORKER_URL}/api/exhibitor/update-product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, list_in_catalog: newVal })
      });
      if (!res.ok) throw new Error("Failed to update product status");
      showToast(`${sku} ${newVal ? "enabled" : "hidden"} in catalog`, "success");
    } catch (err: any) {
      setProducts((prev) =>
        prev.map((p) => (p.sku === sku ? { ...p, list_in_catalog: currentVal } : p))
      );
      showToast(err.message || "Update failed", "error");
    }
  };

  // 4. Save Product Edits
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSavingProduct(true);

    try {
      const res = await fetch(`${WORKER_URL}/api/exhibitor/update-product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProduct)
      });
      if (!res.ok) throw new Error("Failed to update product details");
      showToast(`Product ${editingProduct.sku} updated`, "success");
      setProducts((prev) =>
        prev.map((p) => (p.sku === editingProduct.sku ? { ...p, ...editingProduct } : p))
      );
      setEditingProduct(null);
    } catch (err: any) {
      showToast(err.message || "Failed to update product", "error");
    } finally {
      setSavingProduct(false);
    }
  };

  // 5. Save Brand Edits
  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand) return;
    setSavingBrand(true);

    try {
      const res = await fetch(`${WORKER_URL}/api/exhibitor/update-brand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingBrand)
      });
      if (!res.ok) throw new Error("Failed to update brand details");
      showToast(`Brand ${editingBrand.id} updated`, "success");
      setBrands((prev) =>
        prev.map((b) => (b.id === editingBrand.id ? { ...b, ...editingBrand } : b))
      );
      setEditingBrand(null);
    } catch (err: any) {
      showToast(err.message || "Failed to update brand", "error");
    } finally {
      setSavingBrand(false);
    }
  };

  // 5.5 Toggle Brand Visibility (Batch toggle all products under this brand)
  const handleToggleBrand = async (brandId: string, currentVisible: boolean) => {
    const newVal = !currentVisible;
    const targetSkus = products
      .filter((p) => p.brands_id === brandId)
      .map((p) => p.sku);

    if (targetSkus.length === 0) {
      showToast(`No products found for brand ${brandId}`, "error");
      return;
    }

    // Optimistic UI update for all products of this brand
    setProducts((prev) =>
      prev.map((p) => (p.brands_id === brandId ? { ...p, list_in_catalog: newVal } : p))
    );

    try {
      // Parallel update all products of this brand to newVal in products_db
      await Promise.all(
        targetSkus.map((sku) =>
          fetch(`${WORKER_URL}/api/exhibitor/update-product`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sku, list_in_catalog: newVal })
          })
        )
      );

      showToast(
        `Brand ${brandId} & all ${targetSkus.length} product(s) ${newVal ? "enabled" : "hidden"} in catalog`,
        "success"
      );
    } catch (err: any) {
      // Rollback on error
      setProducts((prev) =>
        prev.map((p) => (p.brands_id === brandId ? { ...p, list_in_catalog: currentVisible } : p))
      );
      showToast(err.message || "Failed to update brand products", "error");
    }
  };

  // 5.8 Generate & Download Official Catalog PDF to R2 & Client
  const [generatingPdf, setGeneratingPdf] = React.useState(false);

  const handleDownloadAndGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      showToast("Compiling export catalog & uploading to Cloudflare R2...", "success");
      
      // Fetch fresh active catalog items
      const cRes = await fetch(`${WORKER_URL}/api/exhibitor/catalog-products`);
      if (!cRes.ok) throw new Error("Failed to fetch active catalog dataset");
      const cData = await cRes.json();
      
      const activeProds = cData.products || [];
      const activeBrands = cData.brands || [];
      const catalogHash = cData.catalog_hash || `manual_${Date.now()}`;

      // Generate PDF & upload to R2
      await generateExportCatalogPdf(
        activeProds,
        activeBrands,
        "HSG Global Internal Admin",
        "HSG Global Pte. Ltd.",
        catalogHash,
        {
          headerTitle: layoutConfig.pdf_header_title,
          subtext: layoutConfig.pdf_subtext,
          footerText: layoutConfig.pdf_footer_text
        }
      );

      showToast("PDF Catalog generated, stored in R2 cache & downloaded!", "success");
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      showToast(err.message || "Failed to generate PDF catalog", "error");
    } finally {
      setGeneratingPdf(false);
    }
  };

  // 6. Bulk File Upload with WebP Conversion
  const handleBulkUpload = async (category: "retailers" | "brands" | "hero", files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      let uploadedCount = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { base64Data, filename } = await compressImageToWebp(
          file,
          category === "hero" ? 1920 : 800,
          500 * 1024 // 500 KB max limit
        );

        const res = await fetch(`${WORKER_URL}/api/exhibitor/upload-logo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category,
            filename,
            base64Data
          })
        });

        if (res.ok) uploadedCount++;
      }

      showToast(`Successfully uploaded ${uploadedCount} ${category} asset(s) as WebP`, "success");
      
      const logosRes = await fetch(`${WORKER_URL}/api/exhibitor/logos`);
      if (logosRes.ok) {
        const lData = await logosRes.json();
        setLogos({
          retailers: lData.retailers || [],
          brands: lData.brands || [],
          hero: lData.hero || []
        });
      }
    } catch (err: any) {
      showToast(err.message || "Upload failed", "error");
    }
  };

  // 7. Delete File from R2
  const handleDeleteLogo = async (key: string, category: "retailers" | "brands" | "hero") => {
    if (!confirm("Are you sure you want to delete this asset from storage?")) return;

    try {
      const res = await fetch(`${WORKER_URL}/api/exhibitor/delete-logo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key })
      });

      if (!res.ok) throw new Error("Failed to delete asset");
      showToast("Asset deleted", "success");

      setLogos((prev) => ({
        ...prev,
        [category]: prev[category].filter((item) => item.key !== key)
      }));
    } catch (err: any) {
      showToast(err.message || "Delete failed", "error");
    }
  };

  // 8. Excel Template Download & Bulk Update Handlers
  const handleDownloadTemplate = () => {
    try {
      const templateData = (products && products.length > 0 ? products : []).map((p: any) => ({
        "SKU (Mandatory)": p.sku || "",
        "Brand ID": p.brands_id || "",
        "Product Name": p.display_name || "",
        "List in Catalog (YES/NO)": p.list_in_catalog === true || p.list_in_catalog === 1 ? "YES" : "NO",
        "Carton Quantity (EA)": p.carton || 12,
        "Pallet Carton Count": p.pallet_ctn || 80,
        "Storage Condition": p.storage_condition || "Ambient 15°–25°C",
        "Shelf Life": p.shelf_life || "24 Months",
        "Carton Length (mm)": p.carton_l_mm || 300,
        "Carton Width (mm)": p.carton_w_mm || 200,
        "Carton Height (mm)": p.carton_h_mm || 150,
      }));

      // Fallback row if no products loaded
      if (templateData.length === 0) {
        templateData.push({
          "SKU (Mandatory)": "EXAMPLE-SKU-001",
          "Brand ID": "BRAND_NAME",
          "Product Name": "Sample Product Name",
          "List in Catalog (YES/NO)": "YES",
          "Carton Quantity (EA)": 12,
          "Pallet Carton Count": 80,
          "Storage Condition": "Ambient 15°–25°C",
          "Shelf Life": "24 Months",
          "Carton Length (mm)": 300,
          "Carton Width (mm)": 200,
          "Carton Height (mm)": 150,
        });
      }

      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Catalog_Template");

      const colWidths = [
        { wch: 20 },
        { wch: 15 },
        { wch: 35 },
        { wch: 25 },
        { wch: 20 },
        { wch: 20 },
        { wch: 25 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 }
      ];
      ws["!cols"] = colWidths;

      XLSX.writeFile(wb, `HSG_Catalog_Specifications_Template_${new Date().toISOString().split("T")[0]}.xlsx`);
      showToast("Catalog specifications template downloaded", "success");
    } catch (err: any) {
      console.error("Failed to generate Excel template:", err);
      showToast("Error creating Excel template", "error");
    }
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawRows: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rawRows || rawRows.length === 0) {
          showToast("Uploaded Excel file is empty or improperly formatted", "error");
          return;
        }

        const parsedItems: any[] = [];
        let matched = 0;
        let newItems = 0;

        rawRows.forEach((row) => {
          // Normalize headers
          const sku = String(row["SKU (Mandatory)"] || row["SKU"] || row["sku"] || "").trim();
          if (!sku) return;

          const existing = products.find((p) => String(p.sku).toLowerCase() === sku.toLowerCase());
          if (existing) {
            matched++;
          } else {
            newItems++;
          }

          const rawListInCatalog = row["List in Catalog (YES/NO)"] ?? row["List in Catalog"] ?? row["list_in_catalog"];
          let listInCatalogVal: boolean = existing ? Boolean(existing.list_in_catalog) : true;
          if (rawListInCatalog !== undefined && rawListInCatalog !== null) {
            const strVal = String(rawListInCatalog).trim().toUpperCase();
            if (strVal === "YES" || strVal === "Y" || strVal === "TRUE" || strVal === "1") {
              listInCatalogVal = true;
            } else if (strVal === "NO" || strVal === "N" || strVal === "FALSE" || strVal === "0") {
              listInCatalogVal = false;
            }
          }

          parsedItems.push({
            sku,
            brands_id: String(row["Brand ID"] || row["Brand"] || existing?.brands_id || "").trim(),
            display_name: String(row["Product Name"] || row["display_name"] || existing?.display_name || sku).trim(),
            list_in_catalog: listInCatalogVal,
            carton: Number(row["Carton Quantity (EA)"] || row["carton"] || existing?.carton || 12),
            pallet_ctn: Number(row["Pallet Carton Count"] || row["pallet_ctn"] || existing?.pallet_ctn || 80),
            storage_condition: String(row["Storage Condition"] || row["storage_condition"] || existing?.storage_condition || "Ambient 15°–25°C").trim(),
            shelf_life: String(row["Shelf Life"] || row["shelf_life"] || existing?.shelf_life || "24 Months").trim(),
            carton_l_mm: Number(row["Carton Length (mm)"] || row["carton_l_mm"] || existing?.carton_l_mm || 0),
            carton_w_mm: Number(row["Carton Width (mm)"] || row["carton_w_mm"] || existing?.carton_w_mm || 0),
            carton_h_mm: Number(row["Carton Height (mm)"] || row["carton_h_mm"] || existing?.carton_h_mm || 0),
            is_matched: !!existing
          });
        });

        if (parsedItems.length === 0) {
          showToast("No valid SKU rows found in the Excel sheet", "error");
          return;
        }

        setBulkPreviewItems(parsedItems);
        setBulkParseStats({ matched, newItems, total: parsedItems.length });
        setBulkModalOpen(true);
      } catch (err: any) {
        console.error("Failed to parse Excel:", err);
        showToast("Failed to parse Excel file. Please use the official template.", "error");
      } finally {
        if (fileInputExcelRef.current) {
          fileInputExcelRef.current.value = "";
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmBulkUpdate = async () => {
    if (bulkPreviewItems.length === 0) return;
    setBulkUpdating(true);
    try {
      // Parallel update products
      const results = await Promise.all(
        bulkPreviewItems.map((item) =>
          fetch(`${WORKER_URL}/api/exhibitor/update-product`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sku: item.sku,
              display_name: item.display_name,
              list_in_catalog: item.list_in_catalog,
              carton: item.carton,
              pallet_ctn: item.pallet_ctn,
              storage_condition: item.storage_condition,
              shelf_life: item.shelf_life,
              carton_l_mm: item.carton_l_mm,
              carton_w_mm: item.carton_w_mm,
              carton_h_mm: item.carton_h_mm
            })
          })
        )
      );

      const successCount = results.filter((r) => r.ok).length;
      showToast(`Bulk updated ${successCount} product specification(s) successfully!`, "success");
      setBulkModalOpen(false);
      setBulkPreviewItems([]);
      await loadAllData();
    } catch (err: any) {
      console.error("Bulk update failed:", err);
      showToast(err.message || "Failed to complete bulk update", "error");
    } finally {
      setBulkUpdating(false);
    }
  };

  const MODULE_TABS: TabItem[] = [
    { id: "layout", label: "Layout" },
    { id: "catalog", label: "Catalog" },
    { id: "setting", label: "Routing & Settings" },
    { id: "cs", label: "AI Customer Service" },
  ];

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-white rounded-lg border border-slate-200 shadow-xs font-primary">
      <NavigationTabs
        tabs={MODULE_TABS}
        activeTabId={activeTab}
        onTabSelect={(id) => setActiveTab(id as "layout" | "setting" | "cs")}
      />
      
      {/* 1. TOP HEADER BAR */}
      <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-base font-bold text-zinc-950">
            Catalog Web Control Center
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage live export website layout, rotating slogans, products &amp; brands database, media assets, and trade email routing.
          </p>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2.5">
          {activeTab !== "cs" && (
            <button
              onClick={handleSaveConfig}
              disabled={saving || loading}
              className="h-8 px-3.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] active:scale-98 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Changes</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8F9FA]">
        {loading ? (
          <div className="py-24 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0B57D0]" />
            <span>Loading Catalog Web Configurations &amp; Database...</span>
          </div>
        ) : activeTab === "layout" ? (
          /* TAB 1: WEBSITE LAYOUT & MEDIA ASSETS */
          <div className="space-y-4 w-full font-primary">
            {/* 1. PUBLIC WEBSITE & HERO CONTENT SETTINGS CARD */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">
                    Public Website &amp; Hero Content Settings
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Configure rotating slogans, marketing headlines, and event dates displayed on the public website.
                  </p>
                </div>
                <span className="text-[11px] text-zinc-500 font-medium bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
                  Hero A is mandatory • B &amp; C auto-rotate per reload
                </span>
              </div>

              {/* 2-COLUMN STRUCTURED LAYOUT */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT COLUMN: WEBSITE HERO & TEXTS */}
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="pb-1 border-b border-slate-100">
                      <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                        Hero Banner &amp; Headlines
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Top Floating Banner
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. OFFICIAL EXHIBITOR • HSG GLOBAL PTE LTD"
                        value={layoutConfig.top_banner || ""}
                        onChange={(e) =>
                          setLayoutConfig({ ...layoutConfig, top_banner: e.target.value })
                        }
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Hero Text 1 <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Connecting Southeast Asian Taste"
                          value={layoutConfig.hero_headline_1 || layoutConfig.hero_groups?.[0]?.headline_1 || ""}
                          onChange={(e) =>
                            setLayoutConfig({ ...layoutConfig, hero_headline_1: e.target.value })
                          }
                          className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">
                          Hero Text 2 (Highlight) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="To Global Shelves & Kitchens"
                          value={layoutConfig.hero_headline_2 || layoutConfig.hero_groups?.[0]?.headline_2 || ""}
                          onChange={(e) =>
                            setLayoutConfig({ ...layoutConfig, hero_headline_2: e.target.value })
                          }
                          className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Hero Subtext <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Ready-to-cook authentic Asian culinary pastes, ambient Halal food, and refreshing beverages..."
                        value={layoutConfig.hero_subtext || layoutConfig.hero_groups?.[0]?.subtext || ""}
                        onChange={(e) =>
                          setLayoutConfig({ ...layoutConfig, hero_subtext: e.target.value })
                        }
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white resize-none focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                      />
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: EVENTS, HIGHLIGHT CARDS, FOOTER & EMAIL TEMPLATES */}
                <div className="space-y-4">
                  {/* Website Layout (Dates, Highlights & Footer) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                      <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                        Website Highlights &amp; Showcase
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                        <span className="font-semibold text-zinc-500">Event Dates:</span>
                        <input
                          type="date"
                          value={layoutConfig.booking_start_date}
                          onChange={(e) =>
                            setLayoutConfig({ ...layoutConfig, booking_start_date: e.target.value })
                          }
                          className="h-7 px-2 rounded-lg border border-slate-200 text-xs text-zinc-800 bg-white"
                        />
                        <span className="text-zinc-400">-</span>
                        <input
                          type="date"
                          value={layoutConfig.booking_end_date}
                          onChange={(e) =>
                            setLayoutConfig({ ...layoutConfig, booking_end_date: e.target.value })
                          }
                          className="h-7 px-2 rounded-lg border border-slate-200 text-xs text-zinc-800 bg-white"
                        />
                      </div>
                    </div>

                    {/* 3 Feature Highlight Cards */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                        Feature Highlight Cards (3 Cards)
                      </label>
                      <div className="space-y-2">
                        {[0, 1, 2].map((idx) => {
                          const card = layoutConfig.feature_cards?.[idx] || {
                            icon: idx === 0 ? "Flame" : idx === 1 ? "ShieldCheck" : "Store",
                            title: idx === 0 ? "Easy to Cook & Ready to Use" : idx === 1 ? "100% Halal & Ambient Ready" : "Direct Supermarket & Retail Network",
                            description: idx === 0 ? "Pre-sautéed natural spice bases and pastes." : idx === 1 ? "Sterile retort packaging allows 18–24 months ambient shelf-life." : "Supplying leading supermarket chains, hypermarkets, and HORECA."
                          };

                          const updateCard = (field: string, val: string) => {
                            const updated = [...(layoutConfig.feature_cards || [
                              { icon: "Flame", title: "Easy to Cook & Ready to Use", description: "Pre-sautéed natural spice bases and pastes." },
                              { icon: "ShieldCheck", title: "100% Halal & Ambient Ready", description: "Sterile retort packaging allows 18–24 months ambient shelf-life." },
                              { icon: "Store", title: "Direct Supermarket & Retail Network", description: "Supplying leading supermarket chains, hypermarkets, and HORECA." }
                            ])];
                            updated[idx] = { ...updated[idx], [field]: val };
                            setLayoutConfig({ ...layoutConfig, feature_cards: updated });
                          };

                          return (
                            <div key={`feat-card-${idx}`} className="p-2 rounded-lg border border-slate-200 bg-[#F8F9FA] flex items-center gap-2">
                              <select
                                value={card.icon || "Flame"}
                                onChange={(e) => updateCard("icon", e.target.value)}
                                className="h-7 px-1.5 text-xs bg-white border border-slate-200 rounded-lg text-zinc-700 cursor-pointer shrink-0"
                              >
                                <option value="Flame">🔥 Flame</option>
                                <option value="ShieldCheck">🛡️ Shield</option>
                                <option value="Store">🏪 Store</option>
                                <option value="Globe2">🌐 Globe</option>
                                <option value="Award">🏆 Award</option>
                                <option value="Package">📦 Package</option>
                                <option value="Utensils">🍴 Utensils</option>
                                <option value="Truck">🚚 Truck</option>
                              </select>
                              <input
                                type="text"
                                value={card.title || ""}
                                onChange={(e) => updateCard("title", e.target.value)}
                                placeholder={`Card #${idx + 1} Title`}
                                className="w-1/3 h-7 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-zinc-900 bg-white"
                              />
                              <input
                                type="text"
                                value={card.description || ""}
                                onChange={(e) => updateCard("description", e.target.value)}
                                placeholder="Short description..."
                                className="flex-1 h-7 px-2.5 rounded-lg border border-slate-200 text-xs text-zinc-600 bg-white"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Website Footer Showcase Subtitle
                      </label>
                      <input
                        type="text"
                        placeholder="Official Export Showcase"
                        value={layoutConfig.footer_showcase_text || ""}
                        onChange={(e) =>
                          setLayoutConfig({ ...layoutConfig, footer_showcase_text: e.target.value })
                        }
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                      />
                    </div>
                  </div>

                  {/* Email Template Controls */}
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="pb-1 border-b border-slate-100">
                      <span className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                        Email Auto-Reply Template
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Email Event / Lead Subject Tag
                      </label>
                      <input
                        type="text"
                        placeholder="HSG Global Trade"
                        value={layoutConfig.email_subject_tag ?? "HSG Global Trade"}
                        onChange={(e) =>
                          setLayoutConfig({ ...layoutConfig, email_subject_tag: e.target.value })
                        }
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Prospect Email Greeting Text
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Thank you for your interest in HSG Global Pte Ltd! We are pleased to share our official export catalog and product portfolio with you."
                        value={layoutConfig.email_greeting ?? "Thank you for your interest in HSG Global Pte Ltd! We are pleased to share our official export catalog and product portfolio with you."}
                        onChange={(e) =>
                          setLayoutConfig({ ...layoutConfig, email_greeting: e.target.value })
                        }
                        className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white resize-none focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. MEDIA ASSET MANAGER: HERO SLIDER PHOTOS, RETAILERS & BRAND LOGOS */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">
                    Media Assets Library
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Hero background sliders, retailer partner logos, and official brand logos.
                  </p>
                </div>
                <span className="text-[11px] text-zinc-500 font-medium bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
                  Auto-compressed to WebP &lt; 500KB
                </span>
              </div>

              {/* 2.1 Hero Slider Background Photos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-800">
                      Hero Slider Background Photos ({logos.hero.length})
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      High-resolution landscape photos for the hero background.
                    </p>
                  </div>
                  <label className="h-8 px-3 rounded-lg bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-200 shadow-xs transition-colors">
                    <Upload className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Upload Hero Photo(s)</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleBulkUpload("hero", e.target.files)}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {logos.hero.map((item) => (
                    <div
                      key={item.key}
                      className="group relative rounded-lg overflow-hidden border border-slate-200 bg-slate-900 h-28 flex items-center justify-center shadow-xs"
                    >
                      <img
                        src={item.url}
                        alt={item.filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDeleteLogo(item.key, "hero")}
                          className="w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center cursor-pointer shadow-md"
                          title="Delete photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {logos.hero.length === 0 && (
                    <div className="col-span-full py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                      No hero slider photos uploaded yet. Click &ldquo;Upload Hero Photo(s)&rdquo; above.
                    </div>
                  )}
                </div>
              </div>

              {/* 2.2 Retailers / Supermarket Network Logos */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-800">
                      Retailers Network Logos ({logos.retailers.length})
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      Showcase of authorized supermarket chains &amp; retail partner brands.
                    </p>
                  </div>
                  <label className="h-8 px-3 rounded-lg bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-200 shadow-xs transition-colors">
                    <Upload className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Upload Retailer Logo(s)</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleBulkUpload("retailers", e.target.files)}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-3">
                  {logos.retailers.map((item) => (
                    <div
                      key={item.key}
                      className="group relative rounded-lg overflow-hidden border border-slate-200 bg-white p-2 h-20 flex items-center justify-center shadow-xs"
                    >
                      <img
                        src={item.url}
                        alt={item.filename}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDeleteLogo(item.key, "retailers")}
                          className="w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center cursor-pointer shadow-md"
                          title="Delete logo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {logos.retailers.length === 0 && (
                    <div className="col-span-full py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                      No retailer logos uploaded yet. Click &ldquo;Upload Retailer Logo(s)&rdquo; above.
                    </div>
                  )}
                </div>
              </div>

              {/* 2.3 Assigned Brand Portfolio Logos */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-800">
                      Brand Portfolio Logos ({logos.brands.length})
                    </h4>
                    <p className="text-[11px] text-zinc-500">
                      Assigned brand logos showcased on product cards and catalog pages.
                    </p>
                  </div>
                  <label className="h-8 px-3 rounded-lg bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-200 shadow-xs transition-colors">
                    <Upload className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Upload Brand Logo(s)</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleBulkUpload("brands", e.target.files)}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-3">
                  {logos.brands.map((item) => (
                    <div
                      key={item.key}
                      className="group relative rounded-lg overflow-hidden border border-slate-200 bg-white p-2 h-20 flex items-center justify-center shadow-xs"
                    >
                      <img
                        src={item.url}
                        alt={item.filename}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDeleteLogo(item.key, "brands")}
                          className="w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center cursor-pointer shadow-md"
                          title="Delete logo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {logos.brands.length === 0 && (
                    <div className="col-span-full py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                      No brand logos uploaded yet. Click &ldquo;Upload Brand Logo(s)&rdquo; above.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "catalog" ? (
          /* TAB 2: CATALOG & PRODUCT SPECIFICATIONS */
          <div className="space-y-4 w-full">
            {/* HIDDEN FILE INPUT FOR EXCEL UPLOAD */}
            <input
              type="file"
              ref={fileInputExcelRef}
              onChange={handleExcelUpload}
              accept=".xlsx, .xls"
              className="hidden"
            />

            {/* OFFICIAL EXPORT CATALOG PDF ENGINE & LAYOUT CONFIGURATION CARD */}
            <div className="bg-[#f0f4f9]/80 border border-[#D3E3FD] rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#D3E3FD]/60 pb-3.5">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#0B57D0]/10 flex items-center justify-center text-[#0B57D0] shrink-0 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900">
                      Official Export Catalog PDF Engine &amp; Layout Settings
                    </h4>
                    <p className="text-xs text-zinc-500 mt-0.5 max-w-xl">
                      Customize catalog headers, contact information, and footer labels. Compiles all active brands &amp; products into a PDF catalog, caches in Cloudflare R2, and triggers local download.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleDownloadAndGeneratePdf}
                    disabled={generatingPdf}
                    type="button"
                    className="h-9 px-4.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {generatingPdf ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download Official Catalog PDF</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* PDF Layout Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                    Catalog Header Title
                  </label>
                  <input
                    type="text"
                    placeholder="OFFICIAL EXPORT PRODUCT CATALOG"
                    value={layoutConfig.pdf_header_title ?? "OFFICIAL EXPORT PRODUCT CATALOG"}
                    onChange={(e) =>
                      setLayoutConfig({ ...layoutConfig, pdf_header_title: e.target.value })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:border-[#0B57D0]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                    Catalog Subtext (Contact &amp; Terms)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Contact: sales@hsg-global.com | hsgglobal.sg • Global Foodservice & Retail"
                    value={layoutConfig.pdf_subtext ?? "Contact: sales@hsg-global.com | hsgglobal.sg\nSingapore • Malaysia • Global Foodservice & Retail FMCG | FOB / CIF Terms"}
                    onChange={(e) =>
                      setLayoutConfig({ ...layoutConfig, pdf_subtext: e.target.value })
                    }
                    className="w-full p-2 rounded-lg border border-slate-200 text-[11px] text-zinc-900 bg-white resize-none focus:border-[#0B57D0]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                    Catalog Footer Text
                  </label>
                  <input
                    type="text"
                    placeholder="Official Export Catalog"
                    value={layoutConfig.pdf_footer_text ?? "Official Export Catalog"}
                    onChange={(e) =>
                      setLayoutConfig({ ...layoutConfig, pdf_footer_text: e.target.value })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:border-[#0B57D0]"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-5">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
                    <Package className="w-4 h-4 text-[#0B57D0]" />
                    <span>Brand-Grouped Catalog List ({brands.length} Brands • {products.length} Products)</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Manage public catalog visibility, carton/pallet specs, shelf life, and upload bulk Excel spreadsheets.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                  {/* SEARCH BAR */}
                  <div className="w-full sm:w-56">
                    <input
                      type="text"
                      placeholder="Filter SKU, title, or brand..."
                      value={searchProductQuery}
                      onChange={(e) => setSearchProductQuery(e.target.value)}
                      className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs text-zinc-800 placeholder-zinc-400 bg-slate-50 focus:bg-white focus:border-[#0B57D0] outline-none"
                    />
                  </div>

                  {/* DOWNLOAD TEMPLATE BUTTON */}
                  <button
                    onClick={handleDownloadTemplate}
                    type="button"
                    className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    title="Download blank / current product template in Excel (.xlsx)"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Template</span>
                  </button>

                  {/* UPLOAD EXCEL BUTTON */}
                  <button
                    onClick={() => fileInputExcelRef.current?.click()}
                    type="button"
                    className="h-8 px-3.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] active:scale-98 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Upload Excel</span>
                  </button>
                </div>
              </div>

              {/* Grouped Brand Accordion & Tables */}
              <div className="space-y-4">
                {(() => {
                  // Sort brands: Active (visible in catalog) first, Hidden brands placed below
                  const sortedBrands = [...brands].sort((a, b) => {
                    const aActive = products.some(
                      (p) => p.brands_id === a.id && (p.list_in_catalog === true || p.list_in_catalog === 1)
                    );
                    const bActive = products.some(
                      (p) => p.brands_id === b.id && (p.list_in_catalog === true || p.list_in_catalog === 1)
                    );
                    if (aActive && !bActive) return -1;
                    if (!aActive && bActive) return 1;
                    return (a.rank || 999) - (b.rank || 999);
                  });

                  return sortedBrands.map((b) => {
                    const allBrandProds = products.filter((p) => p.brands_id === b.id);
                    const isBrandVisible = allBrandProds.some(
                      (p) => p.list_in_catalog === true || p.list_in_catalog === 1
                    );
                    const activeListedCount = allBrandProds.filter(
                      (p) => p.list_in_catalog === true || p.list_in_catalog === 1
                    ).length;

                    const brandProds = allBrandProds.filter((p) => {
                      if (!searchProductQuery) return true;
                      const q = searchProductQuery.toLowerCase();
                      return (
                        p.sku?.toLowerCase().includes(q) ||
                        p.display_name?.toLowerCase().includes(q)
                      );
                    });

                    return (
                    <div
                      key={b.id}
                      className={`border rounded-lg transition-all overflow-hidden ${
                        isBrandVisible ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50/70"
                      }`}
                    >
                      {/* Brand Header Banner with Toggle & Edit */}
                      <div className="p-3.5 flex flex-wrap items-center justify-between gap-3 bg-[#F8F9FA] border-b border-slate-200">
                        <div className="flex items-center gap-3">
                          {/* Brand Toggle Switch */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleBrand(b.id, isBrandVisible)}
                              className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer inline-flex items-center shrink-0 ${
                                isBrandVisible ? "bg-[#0B57D0]" : "bg-slate-300"
                              }`}
                              title={isBrandVisible ? "Brand Visible in Catalog" : "Brand Hidden from Catalog"}
                            >
                              <span
                                className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform transform ${
                                  isBrandVisible ? "translate-x-5" : "translate-x-0.5"
                                }`}
                              />
                            </button>
                            <span className={`text-xs font-bold ${isBrandVisible ? "text-zinc-900" : "text-zinc-400"}`}>
                              {isBrandVisible ? "Visible" : "Hidden"}
                            </span>
                          </div>

                          <div className="h-4 w-px bg-slate-200" />

                          {/* Brand Identity */}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs font-bold text-zinc-950">
                                {b.display_name}
                              </h3>
                              <span className="font-mono text-[10px] bg-slate-100 text-zinc-600 font-semibold px-1.5 py-0.5 rounded border border-slate-200">
                                {b.id}
                              </span>
                              <span className="text-[11px] text-zinc-500 font-medium">
                                ({activeListedCount}/{allBrandProds.length} active in catalog)
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 max-w-xl truncate mt-0.5">
                              {b.description || "No official catalog description set"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingBrand(b)}
                            className="h-7 px-2.5 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-zinc-700 text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                          >
                            <Edit2 className="w-3 h-3 text-zinc-500" />
                            <span>Edit Brand</span>
                          </button>
                        </div>
                      </div>

                      {/* Products Table under Brand (Visible only if Brand Toggle is ON) */}
                      {isBrandVisible ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50/50 border-b border-slate-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                                <th className="py-2 px-3 text-center w-24">In Catalog?</th>
                                <th className="py-2 px-3 w-32">SKU</th>
                                <th className="py-2 px-3">Product Name</th>
                                <th className="py-2 px-3 w-40">Carton Spec</th>
                                <th className="py-2 px-3 w-40">Storage / Shelf</th>
                                <th className="py-2 px-3 text-right w-20">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {brandProds.map((p) => {
                                const isProductListed = p.list_in_catalog === true || p.list_in_catalog === 1;
                                return (
                                  <tr key={p.sku} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="py-2 px-3 text-center">
                                      <button
                                        onClick={() => handleToggleProduct(p.sku, isProductListed)}
                                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer inline-flex items-center ${
                                          isProductListed ? "bg-emerald-500" : "bg-slate-300"
                                        }`}
                                        title={isProductListed ? "Product Visible" : "Product Hidden"}
                                      >
                                        <span
                                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform transform ${
                                            isProductListed ? "translate-x-4.5" : "translate-x-1"
                                          }`}
                                        />
                                      </button>
                                    </td>
                                    <td className="py-2 px-3 font-mono font-bold text-zinc-900">
                                      {p.sku}
                                    </td>
                                    <td className="py-2 px-3 font-semibold text-zinc-800 max-w-sm truncate">
                                      {p.display_name}
                                    </td>
                                    <td className="py-2 px-3 text-zinc-600 text-[11px]">
                                      {p.carton || 12} EA/CTN • {p.pallet_ctn || 80} CTN/PLT
                                    </td>
                                    <td className="py-2 px-3 text-zinc-600 text-[11px]">
                                      {p.storage_condition || "15°–25°C"} • {p.shelf_life || "24M"}
                                    </td>
                                    <td className="py-2 px-3 text-right">
                                      <button
                                        onClick={() => setEditingProduct(p)}
                                        className="px-2 py-1 rounded bg-slate-100 hover:bg-[#0B57D0] hover:text-white text-zinc-700 text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                        <span>Edit</span>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                              {brandProds.length === 0 && (
                                <tr>
                                  <td colSpan={6} className="py-4 text-center text-xs text-slate-400">
                                    No products assigned to this brand.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="px-4 py-2.5 text-[11px] text-zinc-400 bg-slate-50/50 italic flex items-center justify-between">
                          <span>Brand and its {brandProds.length} products are hidden from the public export catalog.</span>
                          <span className="font-semibold text-zinc-500">Brand Header Only</span>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
              </div>
            </div>
          </div>
        ) : activeTab === "setting" ? (
          /* TAB 3: ROUTING, AUTOMATION & TEMPLATE SETTINGS */
          <div className="space-y-4 w-full font-primary">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              {/* Left Column: Notification Destination Channels */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-xs p-5 space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
                  <div className="w-9 h-9 rounded-lg bg-[#0B57D0]/10 flex items-center justify-center text-[#0B57D0]">
                    <Settings className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">Notification &amp; Routing Channels</h3>
                    <p className="text-xs text-zinc-500">Configure destination channels for order notifications, quotation alerts, and inquiries.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* WhatsApp Contact */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Receiver WhatsApp Phone Number
                    </label>
                    <input
                      type="text"
                      placeholder="+6583494429"
                      value={emailSettings.receiver_order_whatsapp || ""}
                      onChange={(e) =>
                        setEmailSettings({ ...emailSettings, receiver_order_whatsapp: e.target.value })
                      }
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white font-mono focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                    />
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Includes international country code prefix (e.g. +65 or +61).
                    </p>
                  </div>

                  {/* Primary Email */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Primary Sales Admin Email (receiver_order_email)
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="sales@hsgglobal.sg"
                      value={emailSettings.receiver_order_email || ""}
                      onChange={(e) =>
                        setEmailSettings({ ...emailSettings, receiver_order_email: e.target.value })
                      }
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                    />
                  </div>

                  {/* CC Emails */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-zinc-700">
                      CC Emails (Up to 3)
                    </label>
                    <div className="space-y-2">
                      <input
                        type="email"
                        value={emailSettings.receiver_order_cc_1 || ""}
                        onChange={(e) =>
                          setEmailSettings({ ...emailSettings, receiver_order_cc_1: e.target.value })
                        }
                        placeholder="CC Recipient 1"
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                      />
                      <input
                        type="email"
                        value={emailSettings.receiver_order_cc_2 || ""}
                        onChange={(e) =>
                          setEmailSettings({ ...emailSettings, receiver_order_cc_2: e.target.value })
                        }
                        placeholder="CC Recipient 2"
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                      />
                      <input
                        type="email"
                        value={emailSettings.receiver_order_cc_3 || ""}
                        onChange={(e) =>
                          setEmailSettings({ ...emailSettings, receiver_order_cc_3: e.target.value })
                        }
                        placeholder="CC Recipient 3"
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleTestTemplate("test_connection")}
                      disabled={testingTemplate !== null || !emailSettings.receiver_order_email?.trim()}
                      className="h-8 px-3.5 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {testingTemplate === "test_connection" && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0B57D0]" />}
                      <span>Send Test Email</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveConfig}
                      disabled={saving}
                      className="h-8 px-4 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold text-xs rounded-lg disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      <span>Save Settings</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Automation & Email Triggers with Order & Prospect Tests */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-xs p-5 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                      <Mail className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900">Automation &amp; Email Triggers</h3>
                      <p className="text-xs text-zinc-500">Toggle automatic system triggers and send context-aware test emails.</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleTriggerReminder}
                    disabled={triggeringReminder || !emailSettings.toggle_reminder_order}
                    className="h-8 px-3 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 disabled:opacity-50"
                    title={!emailSettings.toggle_reminder_order ? "Please enable 'Reminder to Order' toggle first." : "Force execute inactivity reminder check now."}
                  >
                    {triggeringReminder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                    <span>Run Reminder</span>
                  </button>
                </div>

                <div className="flex flex-col divide-y divide-slate-100">
                  {/* 1. Test: Order Template (Direct Order to Buyer) */}
                  <div className="flex items-center justify-between py-3 gap-4">
                    <div className="flex flex-col gap-0.5 flex-1 pr-2">
                      <span className="text-xs font-bold text-zinc-800">Send Email to Buyer (Order Template)</span>
                      <span className="text-[11px] text-zinc-500">Send direct order confirmation copy to the buyer automatically.</span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTestTemplate("new_order")}
                        disabled={testingTemplate !== null}
                        className="h-7 px-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-[11px] rounded-md transition-all flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                        title="Test Order Template"
                      >
                        {testingTemplate === "new_order" && <Loader2 className="w-3 h-3 animate-spin text-[#0B57D0]" />}
                        <span>Test : Order Template</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEmailSettings({ ...emailSettings, toggle_send_email_buyer: !emailSettings.toggle_send_email_buyer })
                        }
                        className={`relative inline-flex h-5.5 w-10 items-center rounded-full transition-colors cursor-pointer ${
                          emailSettings.toggle_send_email_buyer ? "bg-[#0B57D0]" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                            emailSettings.toggle_send_email_buyer ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* 2. Test: Prospect Template (Catalog Inquiry / Prospect) */}
                  <div className="flex items-center justify-between py-3 gap-4">
                    <div className="flex flex-col gap-0.5 flex-1 pr-2">
                      <span className="text-xs font-bold text-zinc-800">Send Email to Prospect (Prospect Template)</span>
                      <span className="text-[11px] text-zinc-500">Auto-reply to website prospects with PDF catalog link and greeting.</span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTestTemplate("prospect_inquiry")}
                        disabled={testingTemplate !== null}
                        className="h-7 px-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-[11px] rounded-md transition-all flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                        title="Test Prospect Template"
                      >
                        {testingTemplate === "prospect_inquiry" && <Loader2 className="w-3 h-3 animate-spin text-[#0B57D0]" />}
                        <span>Test : Prospect Template</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEmailSettings({ ...emailSettings, toggle_send_email_prospect: !emailSettings.toggle_send_email_prospect })
                        }
                        className={`relative inline-flex h-5.5 w-10 items-center rounded-full transition-colors cursor-pointer ${
                          emailSettings.toggle_send_email_prospect ? "bg-[#0B57D0]" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                            emailSettings.toggle_send_email_prospect ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* 3. Inactivity Reminders */}
                  <div className="flex items-center justify-between py-3 gap-4">
                    <div className="flex flex-col gap-0.5 flex-1 pr-2">
                      <span className="text-xs font-bold text-zinc-800">Reminder to Order</span>
                      <span className="text-[11px] text-zinc-500">Enable automatic order reminders for inactive buyers (14, 19, 24 days).</span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleTestTemplate("reminder_1")}
                          disabled={testingTemplate !== null}
                          className="h-6 px-2 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-[10px] rounded transition-all cursor-pointer shadow-xs disabled:opacity-50"
                          title="Test Reminder 1 (Day 14)"
                        >
                          R1
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTestTemplate("reminder_2")}
                          disabled={testingTemplate !== null}
                          className="h-6 px-2 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-[10px] rounded transition-all cursor-pointer shadow-xs disabled:opacity-50"
                          title="Test Reminder 2 (Day 19)"
                        >
                          R2
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTestTemplate("reminder_3")}
                          disabled={testingTemplate !== null}
                          className="h-6 px-2 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-[10px] rounded transition-all cursor-pointer shadow-xs disabled:opacity-50"
                          title="Test Reminder 3 (Day 24)"
                        >
                          R3
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setEmailSettings({ ...emailSettings, toggle_reminder_order: !emailSettings.toggle_reminder_order })
                        }
                        className={`relative inline-flex h-5.5 w-10 items-center rounded-full transition-colors cursor-pointer ${
                          emailSettings.toggle_reminder_order ? "bg-[#0B57D0]" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                            emailSettings.toggle_reminder_order ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* 4. Order Submission Received */}
                  <div className="flex items-center justify-between py-3 gap-4">
                    <div className="flex flex-col gap-0.5 flex-1 pr-2">
                      <span className="text-xs font-bold text-zinc-800">Order Submission Received</span>
                      <span className="text-[11px] text-zinc-500">Notify Sales Admin immediately upon new order submission.</span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setEmailSettings({
                            ...emailSettings,
                            toggle_order_submission_received: !emailSettings.toggle_order_submission_received
                          })
                        }
                        className={`relative inline-flex h-5.5 w-10 items-center rounded-full transition-colors cursor-pointer ${
                          emailSettings.toggle_order_submission_received ? "bg-[#0B57D0]" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                            emailSettings.toggle_order_submission_received ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* 5. Update Order Status (Buyer Only) */}
                  <div className="flex items-center justify-between py-3 gap-4">
                    <div className="flex flex-col gap-0.5 flex-1 pr-2">
                      <span className="text-xs font-bold text-zinc-800">Update Order Notification</span>
                      <span className="text-[11px] text-zinc-500">Notify buyer only when order status is marked complete or updated.</span>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTestTemplate("update_order")}
                        disabled={testingTemplate !== null}
                        className="h-7 px-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 font-semibold text-[11px] rounded-md transition-all flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {testingTemplate === "update_order" && <Loader2 className="w-3 h-3 animate-spin text-[#0B57D0]" />}
                        <span>Test Send</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setEmailSettings({ ...emailSettings, toggle_update_order: !emailSettings.toggle_update_order })
                        }
                        className={`relative inline-flex h-5.5 w-10 items-center rounded-full transition-colors cursor-pointer ${
                          emailSettings.toggle_update_order ? "bg-[#0B57D0]" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
                            emailSettings.toggle_update_order ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    disabled={saving}
                    className="h-8 px-4 bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold text-xs rounded-lg disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save Automation Settings</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 3: AI CUSTOMER SERVICE / CHAT CONCIERGE */
          <div className="space-y-4 w-full flex flex-col flex-1 h-full min-h-[600px]">
            {/* Top Sub-Tab Switcher Bar */}
            <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0B57D0]/10 flex items-center justify-center text-[#0B57D0]">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">AI Concierge &amp; Live Chat Center</h3>
                  <p className="text-[11px] text-zinc-500">Manage knowledge base context, review visitor chats, and test live AI concierge.</p>
                </div>
              </div>

              {/* Sub Tabs */}
              <div className="bg-[#F8F9FA] p-0.5 rounded-lg flex items-center gap-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => setCsSubTab("context")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    csSubTab === "context"
                      ? "bg-[#0B57D0] text-white shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Knowledge Context ({csContexts.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCsSubTab("logs")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    csSubTab === "logs"
                      ? "bg-[#0B57D0] text-white shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Conversation Logs ({csConversations.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCsSubTab("simulator")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    csSubTab === "simulator"
                      ? "bg-[#0B57D0] text-white shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Test Simulator</span>
                </button>
              </div>
            </div>

            {/* SubTab 1: KNOWLEDGE CONTEXT */}
            {csSubTab === "context" && (
              <div className="bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col flex-1 overflow-hidden">
                {/* Action Bar */}
                <div className="p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-[#F8F9FA]/60">
                  <div className="flex items-center gap-2 flex-1 max-w-lg">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Search knowledge context by title, content or category..."
                        value={csContextSearch}
                        onChange={(e) => setCsContextSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                      />
                    </div>
                    <select
                      value={csSelectedCategory}
                      onChange={(e) => setCsSelectedCategory(e.target.value)}
                      className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                    >
                      <option value="all">All Categories</option>
                      {CS_CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={fetchCsContexts}
                      disabled={csContextLoading}
                      className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${csContextLoading ? "animate-spin" : ""}`} />
                      <span>Refresh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCsContext(null);
                        setCsContextForm({
                          id: "",
                          category: "Company Profile",
                          title: "",
                          content: "",
                          is_active: true,
                          priority: csContexts.length + 1
                        });
                        setIsCsContextModalOpen(true);
                      }}
                      className="h-8 px-3.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New Context</span>
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 text-zinc-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-3.5 py-2.5 w-[70px]">Rank</th>
                        <th className="px-3.5 py-2.5 w-[160px]">Category</th>
                        <th className="px-3.5 py-2.5 w-[220px]">Title &amp; Knowledge Focus</th>
                        <th className="px-3.5 py-2.5">Context Knowledge Preview</th>
                        <th className="px-3.5 py-2.5 w-[100px]">Status</th>
                        <th className="px-3.5 py-2.5 w-[100px] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {csContextLoading ? (
                        <tr>
                          <td colSpan={6} className="px-3.5 py-8 text-center text-zinc-400 italic">
                            <div className="flex items-center justify-center gap-2">
                              <RefreshCw className="w-4 h-4 animate-spin text-[#0B57D0]" />
                              <span>Loading knowledge context...</span>
                            </div>
                          </td>
                        </tr>
                      ) : filteredCsContexts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3.5 py-8 text-center text-zinc-400 italic">
                            No knowledge context entries found.
                          </td>
                        </tr>
                      ) : (
                        filteredCsContexts.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-3.5 py-2.5">
                              <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-zinc-100 rounded text-zinc-700">
                                #{row.priority || 1}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5">
                              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md whitespace-nowrap">
                                {row.category}
                              </span>
                            </td>
                            <td className="px-3.5 py-2.5">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-zinc-900">{row.title}</span>
                                <span className="text-[10px] text-zinc-400 font-mono">ID: {row.id}</span>
                              </div>
                            </td>
                            <td className="px-3.5 py-2.5">
                              <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                                {row.content}
                              </p>
                            </td>
                            <td className="px-3.5 py-2.5">
                              <button
                                type="button"
                                onClick={() => handleToggleCsActive(row)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                                  row.is_active
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                    : "bg-zinc-100 text-zinc-500 border border-zinc-200 hover:bg-zinc-200"
                                }`}
                              >
                                {row.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                {row.is_active ? "Active" : "Inactive"}
                              </button>
                            </td>
                            <td className="px-3.5 py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCsContext(row);
                                    setCsContextForm({
                                      id: row.id,
                                      category: row.category,
                                      title: row.title,
                                      content: row.content,
                                      is_active: row.is_active,
                                      priority: row.priority || 1
                                    });
                                    setIsCsContextModalOpen(true);
                                  }}
                                  className="p-1.5 text-zinc-500 hover:text-[#0B57D0] hover:bg-zinc-100 rounded-md transition-all cursor-pointer"
                                  title="Edit Context"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeletingCsContextId(row.id);
                                    setCsDeleteConfirmOpen(true);
                                  }}
                                  className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-all cursor-pointer"
                                  title="Delete Context"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SubTab 2: CONVERSATION LOGS */}
            {csSubTab === "logs" && (
              <div className="bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col flex-1 overflow-hidden">
                {/* Search & Actions */}
                <div className="p-3 border-b border-slate-200 flex items-center justify-between gap-3 bg-[#F8F9FA]/60">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Search chats by ID, visitor, or keywords..."
                      value={csLogsSearch}
                      onChange={(e) => setCsLogsSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={fetchCsConversations}
                    disabled={csLogsLoading}
                    className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${csLogsLoading ? "animate-spin" : ""}`} />
                    <span>Refresh Logs</span>
                  </button>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 text-zinc-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-3.5 py-2.5 w-[150px]">Conversation ID</th>
                        <th className="px-3.5 py-2.5 w-[180px]">Visitor / Contact</th>
                        <th className="px-3.5 py-2.5 w-[80px]">Turns</th>
                        <th className="px-3.5 py-2.5">Latest Message Preview</th>
                        <th className="px-3.5 py-2.5 w-[140px]">Last Activity</th>
                        <th className="px-3.5 py-2.5 w-[110px] text-right">Transcript</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {csLogsLoading ? (
                        <tr>
                          <td colSpan={6} className="px-3.5 py-8 text-center text-zinc-400 italic">
                            <div className="flex items-center justify-center gap-2">
                              <RefreshCw className="w-4 h-4 animate-spin text-[#0B57D0]" />
                              <span>Loading conversation logs...</span>
                            </div>
                          </td>
                        </tr>
                      ) : filteredCsConversations.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3.5 py-8 text-center text-zinc-400 italic">
                            No visitor conversation logs found.
                          </td>
                        </tr>
                      ) : (
                        filteredCsConversations.map((row) => {
                          const msgs = row.messages || [];
                          const lastMsg = msgs[msgs.length - 1];
                          return (
                            <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-3.5 py-2.5 font-mono font-bold text-[#0B57D0]">
                                {row.id}
                              </td>
                              <td className="px-3.5 py-2.5">
                                <div className="flex flex-col">
                                  <span className="font-semibold text-zinc-900">
                                    {row.visitor_name || "Anonymous Visitor"}
                                  </span>
                                  {row.visitor_contact && (
                                    <span className="text-[11px] text-zinc-500 font-mono">
                                      {row.visitor_contact}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[150px]">
                                    {row.session_id}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3.5 py-2.5">
                                <span className="text-xs font-semibold px-2 py-0.5 bg-zinc-100 rounded text-zinc-700">
                                  {row.messages?.length || 0} msgs
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5">
                                {lastMsg ? (
                                  <div className="flex items-start gap-1.5 max-w-xl">
                                    <span className={`text-[10px] font-bold uppercase px-1 rounded ${
                                      lastMsg.sender === "visitor" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                                    }`}>
                                      {lastMsg.sender === "visitor" ? "Visitor" : "Agent"}
                                    </span>
                                    <span className="text-xs text-zinc-600 truncate">
                                      {lastMsg.text}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-zinc-400 italic">No messages</span>
                                )}
                              </td>
                              <td className="px-3.5 py-2.5 font-mono text-zinc-600">
                                {row.updated_at ? new Date(row.updated_at).toLocaleString("en-SG", { dateStyle: "short", timeStyle: "short" }) : "-"}
                              </td>
                              <td className="px-3.5 py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCsConversation(row);
                                    setIsCsTranscriptModalOpen(true);
                                  }}
                                  className="h-7 px-2.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-[#0B57D0] text-xs font-semibold inline-flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View Chat</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SubTab 3: LIVE SIMULATOR */}
            {csSubTab === "simulator" && (
              <div className="bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col flex-1 overflow-hidden max-w-4xl mx-auto w-full min-h-[500px]">
                {/* Simulator Header */}
                <div className="bg-[#F8F9FA] border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-zinc-900">Live Customer Service Concierge Simulator</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSimulatorMessages([
                      {
                        id: "sim_init",
                        sender: "agent",
                        text: "Hello! I am your HSG Global customer support concierge. How may I assist you today?",
                        timestamp: Date.now()
                      }
                    ])}
                    className="text-xs text-zinc-500 hover:text-zinc-900 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Clear Chat
                  </button>
                </div>

                {/* Chat Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
                  {simulatorMessages.map((msg) => {
                    const isVisitor = msg.sender === "visitor";
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-start gap-2 ${isVisitor ? "flex-row-reverse" : "flex-row"}`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white ${
                          isVisitor ? "bg-amber-600" : "bg-[#1B4D2E]"
                        }`}>
                          {isVisitor ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>

                        <div className={`max-w-[75%] rounded-lg p-3 text-xs leading-relaxed shadow-2xs ${
                          isVisitor
                            ? "bg-[#0B57D0] text-white rounded-tr-none"
                            : "bg-white text-zinc-800 border border-zinc-200 rounded-tl-none"
                        }`}>
                          <div className="font-semibold text-[10px] mb-1 opacity-75">
                            {isVisitor ? "Visitor (You)" : "HSG Support Concierge"}
                          </div>
                          <div className="whitespace-pre-wrap">{msg.text}</div>
                        </div>
                      </div>
                    );
                  })}

                  {simulatorLoading && (
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#1B4D2E] text-white flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="bg-white border border-zinc-200 rounded-lg rounded-tl-none p-3 text-xs text-zinc-500 flex items-center gap-1.5 shadow-2xs">
                        <div className="w-1.5 h-1.5 bg-[#1B4D2E] rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-[#1B4D2E] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                        <div className="w-1.5 h-1.5 bg-[#1B4D2E] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                        <span className="ml-1 text-[11px]">Thinking with live catalog context...</span>
                      </div>
                    </div>
                  )}
                  <div ref={simulatorEndRef} />
                </div>

                {/* Input Bar */}
                <form onSubmit={handleSimulatorSend} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                  <input
                    type="text"
                    value={simulatorInput}
                    onChange={(e) => setSimulatorInput(e.target.value)}
                    placeholder="Ask anything about products, delivery MOQ, brands, or company details..."
                    disabled={simulatorLoading}
                    className="flex-1 text-xs px-3 py-2 bg-zinc-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                  <button
                    type="submit"
                    disabled={!simulatorInput.trim() || simulatorLoading}
                    className="px-4 py-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* EDIT PRODUCT MODAL (COMPREHENSIVE CATALOG & SPECIFICATION EDITOR) */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-zinc-900">Edit Product Specifications &amp; Catalog Data</h3>
                <span className="font-mono text-xs text-[#0B57D0] font-semibold">{editingProduct.sku}</span>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-200 flex items-center justify-center text-zinc-500 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Product Titles & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Display Title</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.display_name || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, display_name: e.target.value })
                    }
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Short Title (Catalog Header)</label>
                  <input
                    type="text"
                    placeholder="e.g. Sambal Tumis Paste"
                    value={editingProduct.product_meta?.Short_Title || ""}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        product_meta: { ...(editingProduct.product_meta || {}), Short_Title: e.target.value }
                      })
                    }
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Product Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Cooking Pastes & Aromatics"
                    value={editingProduct.product_meta?.Category || ""}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        product_meta: { ...(editingProduct.product_meta || {}), Category: e.target.value }
                      })
                    }
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              {/* Descriptions */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Catalog Description (Long Description)</label>
                <textarea
                  rows={2}
                  placeholder="Official marketing & recipe description for the catalog..."
                  value={editingProduct.product_meta?.Long_Des || ""}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      product_meta: { ...(editingProduct.product_meta || {}), Long_Des: e.target.value }
                    })
                  }
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white resize-none focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                />
              </div>

              {/* Barcodes & Weight */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Single Unit Barcode</label>
                  <input
                    type="text"
                    placeholder="e.g. 955604161111"
                    value={editingProduct.single_barcode || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, single_barcode: e.target.value })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-mono bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Carton Barcode (ITF-14)</label>
                  <input
                    type="text"
                    placeholder="e.g. 1955604161118"
                    value={editingProduct.carton_barcode || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, carton_barcode: e.target.value })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs font-mono bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-zinc-700">Carton Weight (g)</label>
                    {editingProduct.carton_weight && !isNaN(Number(editingProduct.carton_weight)) && (
                      <span className="text-[10px] text-[#0B57D0] font-semibold">
                        {(Number(editingProduct.carton_weight) >= 100 ? Number(editingProduct.carton_weight) / 1000 : Number(editingProduct.carton_weight)).toFixed(2)} kg
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 5600 (grams)"
                    value={editingProduct.carton_weight || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, carton_weight: e.target.value })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              {/* Packaging & Pallet Logistics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">EA / Carton</label>
                  <input
                    type="text"
                    value={editingProduct.carton || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, carton: e.target.value })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">CTN / Pallet</label>
                  <input
                    type="number"
                    value={editingProduct.pallet_ctn || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, pallet_ctn: Number(e.target.value) })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Storage Condition</label>
                  <input
                    type="text"
                    value={editingProduct.storage_condition || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, storage_condition: e.target.value })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Shelf Life</label>
                  <input
                    type="text"
                    value={editingProduct.shelf_life || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, shelf_life: e.target.value })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Length (mm)</label>
                  <input
                    type="number"
                    value={editingProduct.carton_l_mm || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, carton_l_mm: Number(e.target.value) })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Width (mm)</label>
                  <input
                    type="number"
                    value={editingProduct.carton_w_mm || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, carton_w_mm: Number(e.target.value) })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Height (mm)</label>
                  <input
                    type="number"
                    value={editingProduct.carton_h_mm || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, carton_h_mm: Number(e.target.value) })
                    }
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              <div className="pt-3.5 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="h-8 px-4 rounded-lg border border-slate-200 text-zinc-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
                >
                  {savingProduct ? "Saving..." : "Save Product Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BRAND MODAL */}
      {editingBrand && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-sm text-zinc-900">Edit Brand Information</h3>
                <span className="font-mono text-xs text-[#0B57D0] font-semibold">{editingBrand.id}</span>
              </div>
              <button
                onClick={() => setEditingBrand(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-200 flex items-center justify-center text-zinc-500 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Brand Name</label>
                <input
                  type="text"
                  required
                  value={editingBrand.display_name || ""}
                  onChange={(e) =>
                    setEditingBrand({ ...editingBrand, display_name: e.target.value })
                  }
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Catalog Description</label>
                <textarea
                  rows={3}
                  value={editingBrand.description || ""}
                  onChange={(e) =>
                    setEditingBrand({ ...editingBrand, description: e.target.value })
                  }
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white resize-none focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Display Rank / Order</label>
                <input
                  type="number"
                  value={editingBrand.rank || 999}
                  onChange={(e) =>
                    setEditingBrand({ ...editingBrand, rank: Number(e.target.value) })
                  }
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                />
              </div>

              <div className="pt-3.5 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBrand(null)}
                  className="h-8 px-4 rounded-lg border border-slate-200 text-zinc-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBrand}
                  className="h-8 px-4 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
                >
                  {savingBrand ? "Saving..." : "Save Brand"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CS CONTEXT MODAL (ADD / EDIT) */}
      {isCsContextModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <h3 className="font-primary text-sm font-bold text-zinc-900">
                {editingCsContext ? "Edit Knowledge Context Entry" : "Add New Knowledge Context"}
              </h3>
              <button
                type="button"
                onClick={() => setIsCsContextModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-md hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCsContext} className="p-5 flex flex-col gap-4 font-primary overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Category</label>
                  <select
                    value={csContextForm.category}
                    onChange={(e) => setCsContextForm({ ...csContextForm, category: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  >
                    {CS_CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Priority Rank (1 = Top)</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={csContextForm.priority}
                    onChange={(e) => setCsContextForm({ ...csContextForm, priority: parseInt(e.target.value) || 1 })}
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Singapore Delivery MOQ & Schedule"
                  value={csContextForm.title}
                  onChange={(e) => setCsContextForm({ ...csContextForm, title: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Context Knowledge Guidelines &amp; Content
                </label>
                <p className="text-[11px] text-zinc-500 mb-1.5">
                  Provide specific factual details, rules, policies, or contact details for the AI chat concierge to reference.
                </p>
                <textarea
                  rows={6}
                  placeholder="Write detailed rules, MOQ, lead times, FAQ answers, or brand descriptions..."
                  value={csContextForm.content}
                  onChange={(e) => setCsContextForm({ ...csContextForm, content: e.target.value })}
                  className="w-full text-xs p-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0B57D0]/20 focus:border-[#0B57D0] leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cs_is_active_cb"
                  checked={csContextForm.is_active}
                  onChange={(e) => setCsContextForm({ ...csContextForm, is_active: e.target.checked })}
                  className="rounded border-slate-300 text-[#0B57D0] focus:ring-[#0B57D0]"
                />
                <label htmlFor="cs_is_active_cb" className="text-xs font-semibold text-zinc-700 cursor-pointer">
                  Active in live Chat Concierge knowledge base
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCsContextModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={csContextSaving}
                  className="px-4 py-1.5 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {csContextSaving ? "Saving..." : "Save Knowledge Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CS DELETE CONFIRM POPUP */}
      {csDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-5">
            <h3 className="font-primary text-sm font-bold text-zinc-900 mb-2">Delete Knowledge Entry</h3>
            <p className="text-xs text-zinc-600 mb-4 leading-relaxed font-primary">
              Are you sure you want to delete this knowledge context entry? The concierge assistant will no longer reference this information.
            </p>
            <div className="flex justify-end gap-2 font-primary">
              <button
                type="button"
                onClick={() => setCsDeleteConfirmOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCsContextConfirm}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CS VIEW TRANSCRIPT MODAL */}
      {isCsTranscriptModalOpen && selectedCsConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <h3 className="font-primary text-sm font-bold text-zinc-900">
                Chat Transcript: {selectedCsConversation.id}
              </h3>
              <button
                type="button"
                onClick={() => setIsCsTranscriptModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-md hover:bg-zinc-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-3 font-primary overflow-y-auto">
              {/* Metadata Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 block uppercase">Visitor</span>
                  <span className="font-semibold text-zinc-800">{selectedCsConversation.visitor_name || "Anonymous Visitor"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 block uppercase">Contact</span>
                  <span className="font-mono text-zinc-800">{selectedCsConversation.visitor_contact || "-"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 block uppercase">Date / Time</span>
                  <span className="font-mono text-zinc-800">
                    {selectedCsConversation.created_at ? new Date(selectedCsConversation.created_at).toLocaleString("en-SG") : "-"}
                  </span>
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-zinc-50/60 rounded-lg border border-slate-200 max-h-[400px]">
                {selectedCsConversation.messages && selectedCsConversation.messages.length > 0 ? (
                  selectedCsConversation.messages.map((msg, i) => {
                    const isVisitor = msg.sender === "visitor";
                    return (
                      <div
                        key={msg.id || i}
                        className={`flex items-start gap-2 ${isVisitor ? "flex-row-reverse" : "flex-row"}`}
                      >
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-bold ${
                          isVisitor ? "bg-amber-600" : "bg-[#1B4D2E]"
                        }`}>
                          {isVisitor ? "V" : "CS"}
                        </div>
                        <div className={`max-w-[80%] rounded-lg p-2.5 text-xs leading-relaxed ${
                          isVisitor
                            ? "bg-[#0B57D0] text-white rounded-tr-none"
                            : "bg-white text-zinc-800 border border-zinc-200 rounded-tl-none"
                        }`}>
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <span className="font-bold text-[10px] opacity-75">
                              {isVisitor ? "Visitor" : "HSG Concierge"}
                            </span>
                            <span className="text-[9px] opacity-60 font-mono">
                              {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                            </span>
                          </div>
                          <div className="whitespace-pre-wrap">{msg.text}</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-zinc-400 text-center py-6">No messages recorded in this conversation.</p>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCsTranscriptModalOpen(false)}
                  className="px-4 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-zinc-700 text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXCEL BULK UPDATE PREVIEW MODAL */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900">Excel Catalog Bulk Update Preview</h3>
                  <p className="text-xs text-zinc-500">
                    Review specifications extracted from the uploaded Excel file before updating database.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-zinc-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Parse Summary Bar */}
            <div className="px-6 py-3 bg-[#F8F9FA] border-b border-slate-200 flex items-center justify-between text-xs text-zinc-600">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-zinc-800">
                  Total Items: <span className="text-[#0B57D0]">{bulkParseStats.total}</span>
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Matched SKUs: {bulkParseStats.matched}
                </span>
                {bulkParseStats.newItems > 0 && (
                  <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> Unmatched / New: {bulkParseStats.newItems}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-zinc-400">
                Clicking confirm will update catalog metadata in products database.
              </span>
            </div>

            {/* Preview Table */}
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3 text-center">In Catalog?</th>
                    <th className="py-2.5 px-3">Carton (EA)</th>
                    <th className="py-2.5 px-3">Pallet (CTN)</th>
                    <th className="py-2.5 px-3">Storage</th>
                    <th className="py-2.5 px-3">Shelf Life</th>
                    <th className="py-2.5 px-3">Dimensions (L×W×H mm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bulkPreviewItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-zinc-900">
                        {item.sku}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-zinc-800 max-w-xs truncate">
                        {item.display_name}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.list_in_catalog ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"
                        }`}>
                          {item.list_in_catalog ? "YES" : "NO"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-700 font-mono">
                        {item.carton}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-700 font-mono">
                        {item.pallet_ctn}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-600 truncate max-w-[120px]">
                        {item.storage_condition}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-600 font-medium">
                        {item.shelf_life}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-600 font-mono text-[11px]">
                        {item.carton_l_mm || 0} × {item.carton_w_mm || 0} × {item.carton_h_mm || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                Ready to apply {bulkPreviewItems.length} record updates.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-zinc-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkUpdate}
                  disabled={bulkUpdating}
                  className="px-5 py-2 rounded-lg bg-[#0B57D0] hover:bg-[#0842A0] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {bulkUpdating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating Database...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm &amp; Apply Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}