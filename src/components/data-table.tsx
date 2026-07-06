"use client";

import * as React from "react";
import { ArrowUp, ArrowDown, ArrowUpDown, Filter, X, Search, FileSpreadsheet, FileText, Pencil, Trash2, Check, Plus, Image as ImageIcon, Ban } from "lucide-react";
import { jsPDF } from "jspdf";
import { CustomButton } from "./custom-button";
import { ConfirmDialog } from "./confirm-dialog";

export interface Column {
  id: string;
  header: string;
  accessor: string;
}

const getRawVal = (row: any, accessor: string) => {
  if (!row) return "";
  const rawKey = `${accessor}_raw`;
  return row[rawKey] !== undefined ? row[rawKey] : row[accessor];
};

const getFormattedTextValue = (row: any, accessor: string) => {
  const val = getRawVal(row, accessor);
  if (val == null) return "";
  
  if (React.isValidElement(val)) {
    return "";
  }

  if (typeof val === "object") {
    if (val instanceof Date) {
      return val.toLocaleDateString("en-GB") + " " + val.toLocaleTimeString([], { hour12: false });
    }
    try {
      return JSON.stringify(val);
    } catch (e) {
      return String(val);
    }
  }

  return String(val);
};

const getRowId = (row: any): string => {
  if (!row) return "";
  if (row.id !== undefined && row.id !== null) return String(row.id);
  if (row.ID !== undefined && row.ID !== null) return String(row.ID);
  if (row.SKU !== undefined && row.SKU !== null) return String(row.SKU);
  if (row.email !== undefined && row.email !== null) return String(row.email);
  if (row.Email !== undefined && row.Email !== null) return String(row.Email);
  return "";
};

interface DataTableProps {
  columns: Column[];
  data: any[];
  height?: string; // e.g., "h-[450px]"
  userRole?: "admin" | "operator" | "viewer";
  title?: string;
  onSaveRow?: (updatedRow: any) => void;
  onDeleteRow?: (rowId: string) => void;
  onBlockRow?: (row: any) => void;
  onEditModeChange?: (isEditMode: boolean) => void;
  onEditRow?: (row: any) => void;
  onAddNew?: () => void;
  addNewText?: string;
  fetching?: boolean;
  syncStatus?: "idle" | "syncing" | "synced";
  headerActions?: React.ReactNode;
}

export function DataTable({
  columns: initialColumns,
  data,
  userRole = "admin",
  title = "Database Records",
  onSaveRow,
  onDeleteRow,
  onBlockRow,
  onEditModeChange,
  onEditRow,
  onAddNew,
  addNewText,
  fetching = false,
  syncStatus = "idle",
  height = "h-[520px]",
  headerActions,
}: DataTableProps) {
  const [tableData, setTableData] = React.useState<any[]>(data);
  const [columns, setColumns] = React.useState<Column[]>(initialColumns);
  const [colOrder, setColOrder] = React.useState<string[]>(initialColumns.map((c) => c.id));
  const [sortConfig, setSortConfig] = React.useState<{ key: string; direction: "asc" | "desc" | null }>({
    key: "",
    direction: null,
  });
  const [colFilters, setColFilters] = React.useState<Record<string, string>>({});
  const [globalSearch, setGlobalSearch] = React.useState<string>("");
  const [activeFilterCol, setActiveFilterCol] = React.useState<string | null>(null);
  
  // Drag and drop states
  const [draggingColId, setDraggingColId] = React.useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = React.useState<string | null>(null);

  // Export Modal states
  const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);
  const [pdfExportCols, setPdfExportCols] = React.useState<Record<string, boolean>>({});

  // Edit Mode states
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [editingRowId, setEditingRowId] = React.useState<string | null>(null);
  const [editRowData, setEditRowData] = React.useState<any>(null);

  // Modal / Alert Dialog states
  const [deleteRowId, setDeleteRowId] = React.useState<string | null>(null);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);

  // References
  const containerRef = React.useRef<HTMLDivElement>(null);
  const filterInputRef = React.useRef<HTMLInputElement>(null);

  // Focus table when clicked to capture keyboard inputs
  const [isFocused, setIsFocused] = React.useState(false);

  // Initialize data and columns order on change
  React.useEffect(() => {
    setTableData(data);
  }, [data]);

  React.useEffect(() => {
    setColumns(initialColumns);
    setColOrder(initialColumns.map((c) => c.id));
    // Default select all columns for export
    const initialSelection = initialColumns.reduce((acc, col) => ({ ...acc, [col.id]: true }), {});
    setPdfExportCols(initialSelection);
  }, [initialColumns]);

  // Turn off edit mode if role switches to viewer
  React.useEffect(() => {
    if (userRole === "viewer") {
      setIsEditMode(false);
      setEditingRowId(null);
      setEditRowData(null);
    }
  }, [userRole]);

  // Trigger global db-refresh every 60 seconds while in edit mode
  React.useEffect(() => {
    if (!isEditMode) return;

    const interval = setInterval(() => {
      window.dispatchEvent(new CustomEvent("db-refresh"));
    }, 60000);

    return () => clearInterval(interval);
  }, [isEditMode]);

  // Click outside to close filter popover or lose focus
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
        setActiveFilterCol(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Focus filter input when opened
  React.useEffect(() => {
    if (activeFilterCol && filterInputRef.current) {
      filterInputRef.current.focus();
    }
  }, [activeFilterCol]);

  // Check substring word match (word by word partial match at word boundaries/transitions)
  function cellWordMatch(queryWord: string, cellValue: any): boolean {
    const q = queryWord.toLowerCase().trim();
    if (!q) return true;

    const valStr = String(cellValue ?? "").toLowerCase().trim();
    if (!valStr) return false;

    // Check if the query exists as a substring first
    const idx = valStr.indexOf(q);
    if (idx === -1) return false;

    const originalStr = String(cellValue ?? "").trim();
    let currentIdx = idx;

    // Check all occurrences of query to see if any start at a word boundary/transition
    while (currentIdx !== -1) {
      if (currentIdx === 0) return true; // Starts at beginning of the string

      const prevChar = originalStr[currentIdx - 1];
      const nextChar = originalStr[currentIdx]; // First char of the match in original casing

      // 1. Preceded by space/punctuation/non-alphanumeric
      if (/[^a-zA-Z0-9]/.test(prevChar)) return true;

      // 2. Letter/number transition
      if (/[a-zA-Z]/.test(prevChar) && /[0-9]/.test(nextChar)) return true;
      if (/[0-9]/.test(prevChar) && /[a-zA-Z]/.test(nextChar)) return true;

      // 3. camelCase transition (e.g. lowercase letter followed by uppercase letter)
      if (/[a-z]/.test(prevChar) && /[A-Z]/.test(nextChar)) return true;

      // Find next occurrence
      currentIdx = valStr.indexOf(q, currentIdx + 1);
    }

    return false;
  }

  // Keydown listener on table container to capture direct typing anywhere
  const handleGlobalKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // If typing inside an input field or editing a row, do not hijack the keys!
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || e.ctrlKey || e.altKey || e.metaKey || editingRowId !== null) {
      return;
    }

    if (e.key === "Escape") {
      setGlobalSearch("");
      e.preventDefault();
    } else if (e.key === "Backspace") {
      setGlobalSearch((prev) => prev.slice(0, -1));
      e.preventDefault();
    } else if (e.key.length === 1) {
      // Append character to global search
      setGlobalSearch((prev) => prev + e.key);
      e.preventDefault();
    }
  };

  // Sort toggle handler
  const handleSort = (colId: string) => {
    setSortConfig((prev) => {
      if (prev.key === colId) {
        if (prev.direction === "asc") {
          return { key: colId, direction: "desc" };
        } else if (prev.direction === "desc") {
          return { key: "", direction: null };
        }
      }
      return { key: colId, direction: "asc" };
    });
  };

  // Column drag and drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLTableHeaderCellElement>, colId: string) => {
    setDraggingColId(colId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", colId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableHeaderCellElement>, colId: string) => {
    e.preventDefault();
    if (draggingColId !== colId) {
      setDragOverColId(colId);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLTableHeaderCellElement>, targetColId: string) => {
    e.preventDefault();
    const sourceColId = e.dataTransfer.getData("text/plain") || draggingColId;
    if (sourceColId && sourceColId !== targetColId) {
      const sourceIdx = colOrder.indexOf(sourceColId);
      const targetIdx = colOrder.indexOf(targetColId);
      if (sourceIdx !== -1 && targetIdx !== -1) {
        const newOrder = [...colOrder];
        newOrder.splice(sourceIdx, 1);
        newOrder.splice(targetIdx, 0, sourceColId);
        setColOrder(newOrder);
      }
    }
    setDraggingColId(null);
    setDragOverColId(null);
  };

  const handleDragEnd = () => {
    setDraggingColId(null);
    setDragOverColId(null);
  };

  // Edit mode handlers
  const handleStartEdit = (row: any) => {
    setEditingRowId(getRowId(row));
    setEditRowData({ ...row });
  };

  const handleSaveRow = (rowId: string) => {
    setTableData((prev) =>
      prev.map((row) => (getRowId(row) === rowId ? { ...editRowData } : row))
    );
    onSaveRow?.(editRowData);
    setEditingRowId(null);
    setEditRowData(null);
  };

  const handleCancelEdit = () => {
    if (editingRowId !== null) {
      setShowUnsavedConfirm(true);
    } else {
      setEditingRowId(null);
      setEditRowData(null);
    }
  };

  const handleDeleteRow = (rowId: string) => {
    setDeleteRowId(rowId);
  };

  const handleConfirmDelete = () => {
    if (deleteRowId !== null) {
      setTableData((prev) => prev.filter((row) => getRowId(row) !== deleteRowId));
      onDeleteRow?.(deleteRowId);
      setDeleteRowId(null);
    }
  };

  // Export handlers
  const exportCSV = () => {
    const activeCols = colOrder.map(id => columns.find(c => c.id === id)).filter(Boolean) as Column[];
    const headersStr = activeCols.map(c => `"${c.header.replace(/"/g, '""')}"`).join(",");
    const rowsStr = filteredData.map(row => 
      activeCols.map(c => `"${getFormattedTextValue(row, c.accessor).replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    const blob = new Blob([[headersStr, rowsStr].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `export_${Date.now()}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    setIsExportModalOpen(true);
  };

  const handleConfirmPDFExport = () => {
    setIsExportModalOpen(false);
    const doc = new jsPDF();
    const activeCols = colOrder
      .map(id => columns.find(c => c.id === id))
      .filter((c): c is Column => !!c && !!pdfExportCols[c.id]);
    
    if (activeCols.length === 0) return;

    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-GB") + " " + now.toLocaleTimeString([], { hour12: false });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("iB - HSG Global Internal Bridge", 14, 15);
    doc.setFontSize(10);
    doc.text(`Title : ${title}`, 14, 21);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Records  : ${filteredData.length} | Generated ${formattedDate}`, 14, 27);

    let yOffset = 35;
    const colWidth = 180 / activeCols.length;

    // Draw Header
    doc.setFillColor(229, 229, 229);
    doc.rect(14, yOffset - 4, 182, 7, "F");
    doc.setFont("helvetica", "bold");
    activeCols.forEach((col, idx) => {
      doc.text(col.header, 16 + (idx * colWidth), yOffset);
    });

    yOffset += 6;
    doc.setFont("helvetica", "normal");

    // Draw Data Rows
    filteredData.forEach((row, rowIdx) => {
      // Split each cell's text into size-bound lines
      const rowLines = activeCols.map(col => {
        const text = getFormattedTextValue(row, col.accessor);
        return doc.splitTextToSize(text, colWidth - 3);
      });

      const maxLines = Math.max(...rowLines.map(lines => lines.length), 1);
      const rowHeight = maxLines * 4.5 + 2.5;

      if (yOffset + rowHeight > 275) {
        doc.addPage();
        yOffset = 25;
        // Repeat headers on new page
        doc.setFillColor(229, 229, 229);
        doc.rect(14, yOffset - 4, 182, 7, "F");
        doc.setFont("helvetica", "bold");
        activeCols.forEach((col, idx) => {
          doc.text(col.header, 16 + (idx * colWidth), yOffset);
        });
        yOffset += 8;
        doc.setFont("helvetica", "normal");
      }

      // Zebra striping
      if (rowIdx % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(14, yOffset - 4, 182, rowHeight, "F");
      }

      // Render cell text lines
      activeCols.forEach((col, colIdx) => {
        const lines = rowLines[colIdx];
        lines.forEach((line: string, lineIdx: number) => {
          doc.text(line, 16 + (colIdx * colWidth), yOffset + (lineIdx * 4.5));
        });
      });

      yOffset += rowHeight;
    });

    doc.save(`export_${Date.now()}.pdf`);
  };

  // Filter column input handler
  const handleColumnFilterChange = (colId: string, val: string) => {
    setColFilters((prev) => ({
      ...prev,
      [colId]: val,
    }));
  };

  // Processing data: Filter (column & global search) -> Sort
  const filteredData = React.useMemo(() => {
    let result = [...tableData];

    // 1. Column filters (exact or partial check)
    Object.keys(colFilters).forEach((colId) => {
      const filterVal = colFilters[colId].trim().toLowerCase();
      if (filterVal) {
        const col = columns.find((c) => c.id === colId);
        if (col) {
          result = result.filter((row) => 
            String(getRawVal(row, col.accessor) ?? "").toLowerCase().includes(filterVal)
          );
        }
      }
    });

    // 2. Global Search (word by word)
    const gQuery = globalSearch.trim();
    if (gQuery) {
      const words = gQuery.split(/\s+/).filter(Boolean);
      result = result.filter((row) => {
        // For EVERY word in query, AT LEAST ONE cell must contain the word
        return words.every((word) => {
          return colOrder.some((colId) => {
            const col = columns.find((c) => c.id === colId);
            if (!col) return false;
            return cellWordMatch(word, getRawVal(row, col.accessor));
          });
        });
      });
    }

    // 3. Sorting
    if (sortConfig.key && sortConfig.direction) {
      const col = columns.find((c) => c.id === sortConfig.key);
      if (col) {
        const key = col.accessor;
        const dir = sortConfig.direction;
        result.sort((a, b) => {
          const valA = getRawVal(a, key);
          const valB = getRawVal(b, key);
          
          if (valA == null) return dir === "asc" ? 1 : -1;
          if (valB == null) return dir === "asc" ? -1 : 1;

          if (typeof valA === "number" && typeof valB === "number") {
            return dir === "asc" ? valA - valB : valB - valA;
          }

          const strA = String(valA).toLowerCase();
          const strB = String(valB).toLowerCase();
          
          // Date sorting support for dd/mm/yyyy format
          const isDateA = /^\d{2}\/\d{2}\/\d{4}$/.test(strA);
          const isDateB = /^\d{2}\/\d{2}\/\d{4}$/.test(strB);
          if (isDateA && isDateB) {
            const partsA = strA.split("/");
            const partsB = strB.split("/");
            const dateA = new Date(Number(partsA[2]), Number(partsA[1]) - 1, Number(partsA[0])).getTime();
            const dateB = new Date(Number(partsB[2]), Number(partsB[1]) - 1, Number(partsB[0])).getTime();
            return dir === "asc" ? dateA - dateB : dateB - dateA;
          }

          return dir === "asc" 
            ? strA.localeCompare(strB)
            : strB.localeCompare(strA);
        });
      }
    }

    return result;
  }, [tableData, colFilters, globalSearch, sortConfig, colOrder, columns]);

  return (
    <div 
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleGlobalKeyDown}
      onFocus={() => setIsFocused(true)}
      className={`flex flex-col w-full ${height} rounded-lg bg-white border border-slate-200 shadow-xs overflow-hidden focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 select-none font-primary`}
      style={{ outline: "none" }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes tableProgress {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(250%); }
        }
        @keyframes tableFadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes tableFadeInOnly {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-tableProgress {
          animation: tableProgress 1.2s infinite linear;
        }
        .animate-tableFadeIn {
          animation: tableFadeIn 0.2s ease-out forwards;
        }
        .animate-tableFadeInOnly {
          animation: tableFadeInOnly 0.2s ease-out forwards;
        }
        .animate-modalSlideUp {
          animation: modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      {/* Search HUD / Table Header Bar (Fixed height) */}
      <div className="h-12 flex items-center justify-between px-4 bg-[#F0F4F9] border-b border-slate-200 gap-4 flex-shrink-0 relative">
        <div className="flex items-center gap-3.5 text-zinc-800">
          <div className="flex items-center gap-2">
            {!globalSearch ? (
              <>
                <Search size={15} className="text-zinc-500 flex-shrink-0" />
                <span className="font-bold text-xs text-zinc-700 uppercase tracking-wider select-none">
                  {title}
                </span>
              </>
            ) : (
              <span className="text-sm font-semibold text-zinc-900 select-none">
                Search: <span className="underline decoration-zinc-400 decoration-2 underline-offset-4 font-bold">{globalSearch}</span>
              </span>
            )}
          </div>


        </div>

        {/* Loading Progress Bar overlaid at the very bottom edge of header bar */}
        {fetching && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-200/50 overflow-hidden">
            <div 
              className="h-full bg-[#0B57D0] animate-tableProgress origin-left" 
              style={{ width: "40%" }} 
            />
          </div>
        )}
        
        <div className="flex items-center gap-2">
          {headerActions}
          {globalSearch && (
            <CustomButton 
              variant="default"
              onClick={() => setGlobalSearch("")}
              title="Clear active filter"
            >
              <span>Esc</span>
              <X size={13} className="stroke-[2.5]" />
            </CustomButton>
          )}

          {isEditMode && onAddNew && (
            <CustomButton
              variant="default"
              onClick={onAddNew}
              title="Create new record"
            >
              <Plus size={13} className="stroke-[2.5]" />
              <span>{addNewText || "Add New"}</span>
            </CustomButton>
          )}

          {userRole !== "viewer" && (onEditRow || onSaveRow || onDeleteRow || onBlockRow) && (
            <CustomButton
              variant={isEditMode ? "dark" : "default"}
              onClick={() => {
                if (isEditMode) {
                  if (editingRowId !== null) {
                    setShowUnsavedConfirm(true);
                  } else {
                    setIsEditMode(false);
                    onEditModeChange?.(false);
                  }
                } else {
                  setIsEditMode(true);
                  onEditModeChange?.(true);
                }
              }}
            >
              {isEditMode ? "Exit Edit Mode" : "Edit Database"}
            </CustomButton>
          )}
        </div>
      </div>

      {/* Table Area (Scrollable body, sticky headers) */}
      <div className="flex-1 overflow-auto bg-white custom-scrollbar">
        <table className="w-full text-left border-collapse table-auto min-w-max">
          <thead>
            <tr className="border-b border-slate-200">
              {isEditMode && (
                <th className="py-3.5 px-4 sticky top-0 bg-[#F0F4F9] font-semibold text-sm text-[#474747] border-b border-slate-200 w-24 select-none z-10">
                  Actions
                </th>
              )}
              {colOrder.map((colId) => {
                const col = columns.find((c) => c.id === colId);
                if (!col) return null;

                const isDragOver = colId === dragOverColId;
                const isSorting = sortConfig.key === colId;
                const isFiltered = !!colFilters[colId];

                return (
                  <th
                    key={colId}
                    draggable
                    onDragStart={(e) => handleDragStart(e, colId)}
                    onDragOver={(e) => handleDragOver(e, colId)}
                    onDrop={(e) => handleDrop(e, colId)}
                    onDragEnd={handleDragEnd}
                    className={`relative py-3.5 px-4 sticky top-0 bg-[#F0F4F9] font-semibold text-sm text-[#474747] cursor-grab active:cursor-grabbing border-b border-slate-200 select-none transition-all z-10 
                      ${isDragOver ? "border-r-2 border-[#0B57D0] bg-[#D3E3FD]" : ""} 
                      ${draggingColId === colId ? "opacity-40" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      {/* Sort Clickable text */}
                      <button 
                        onClick={() => handleSort(colId)} 
                        className="flex items-center gap-1.5 hover:text-zinc-950 font-semibold focus:outline-none text-left w-full truncate cursor-pointer"
                        title="Click to sort"
                      >
                        <span className="truncate">{col.header}</span>
                        {isSorting ? (
                          sortConfig.direction === "asc" ? (
                            <ArrowUp size={14} className="text-zinc-950 flex-shrink-0" />
                          ) : (
                            <ArrowDown size={14} className="text-zinc-950 flex-shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown size={12} className="text-zinc-400 opacity-60 hover:opacity-100 flex-shrink-0" />
                        )}
                      </button>

                      {/* Filter Button & Popover container */}
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveFilterCol((prev) => (prev === colId ? null : colId));
                          }}
                          className={`p-1 rounded hover:bg-[#E0E8F6] transition-colors focus:outline-none cursor-pointer
                            ${isFiltered ? "text-[#0B57D0] bg-[#D3E3FD] border border-blue-200" : "text-zinc-400 hover:text-[#1F1F1F]"}`}
                          title="Filter Column"
                        >
                          <Filter size={13} />
                        </button>

                        {/* Dropdown Popover */}
                        {activeFilterCol === colId && (
                          <div 
                            className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg p-3 shadow-lg z-25 text-left font-normal"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Filter {col.header}</span>
                              {isFiltered && (
                                <button 
                                  onClick={() => handleColumnFilterChange(colId, "")}
                                  className="text-[10px] text-red-600 hover:underline font-semibold cursor-pointer"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                            <input
                              ref={filterInputRef}
                              type="text"
                              value={colFilters[colId] || ""}
                              onChange={(e) => handleColumnFilterChange(colId, e.target.value)}
                              placeholder={`Search ${col.header}...`}
                              className="w-full text-xs bg-[#F0F4F9] border border-slate-200 rounded px-2 py-1.5 text-zinc-900 focus:outline-none focus:border-blue-400"
                            />
                            <div className="flex justify-end gap-1.5 mt-3">
                              <button 
                                onClick={() => setActiveFilterCol(null)}
                                className="text-[10px] font-semibold bg-white px-2 py-1 rounded border border-slate-200 text-zinc-700 hover:text-zinc-950 cursor-pointer"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 select-text">
            {filteredData.length > 0 ? (
              filteredData.map((row, rowIdx) => {
                const isRowEditing = editingRowId === getRowId(row);

                return (
                  <tr 
                    key={getRowId(row) || rowIdx}
                    className={`transition-colors ${isRowEditing ? "bg-[#D3E3FD]/40 font-medium" : "hover:bg-[#F0F4F9]/70"}`}
                  >
                    {isEditMode && (
                      <td className="py-2 px-4 text-sm text-zinc-800 border-r border-zinc-200/50">
                        <div className="flex items-center gap-1.5">
                          {isRowEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveRow(getRowId(row))}
                                className="p-1 rounded bg-[#EEEEEE] hover:bg-green-100 text-green-700 hover:text-green-800 border border-zinc-300 shadow-sm transition-colors cursor-pointer"
                                title="Save changes"
                              >
                                <Check size={13} />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1 rounded bg-[#EEEEEE] hover:bg-zinc-200 text-zinc-600 hover:text-zinc-950 border border-zinc-300 shadow-sm transition-colors cursor-pointer"
                                title="Cancel editing"
                              >
                                <X size={13} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  if (onEditRow) {
                                    onEditRow(row);
                                  } else {
                                    handleStartEdit(row);
                                  }
                                }}
                                className="p-1 rounded bg-[#EEEEEE] hover:bg-[#E5E5E5] text-zinc-600 hover:text-zinc-950 border border-zinc-300/80 shadow-sm transition-colors cursor-pointer"
                                title="Edit row"
                              >
                                <Pencil size={13} />
                              </button>
                              {userRole === "admin" && onBlockRow && (
                                <button
                                  onClick={() => onBlockRow(row)}
                                  className="p-1 rounded bg-[#EEEEEE] hover:bg-amber-50 text-amber-600 hover:text-amber-700 border border-zinc-300/80 shadow-sm transition-colors cursor-pointer"
                                  title="Block user"
                                >
                                  <Ban size={13} />
                                </button>
                              )}
                              {userRole === "admin" && onDeleteRow && (
                                <button
                                  onClick={() => handleDeleteRow(getRowId(row))}
                                  className="p-1 rounded bg-[#EEEEEE] hover:bg-red-50 text-red-600 hover:text-red-700 border border-zinc-300/80 shadow-sm transition-colors cursor-pointer"
                                  title="Delete row"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                    {colOrder.map((colId) => {
                      const col = columns.find((c) => c.id === colId);
                      if (!col) return null;

                      const isCellEditable = isRowEditing && col.id !== "id";

                      return (
                        <td 
                          key={colId}
                          className="py-3 px-4 text-sm text-zinc-800 truncate max-w-[240px]"
                          title={getFormattedTextValue(row, col.accessor)}
                        >
                          {isCellEditable ? (
                            <input
                              type="text"
                              value={editRowData?.[col.accessor] ?? ""}
                              onChange={(e) => setEditRowData((prev: any) => ({
                                ...prev,
                                [col.accessor]: e.target.value
                              }))}
                              className="w-full text-xs bg-[#EEEEEE] border border-zinc-300 rounded px-2 py-1 text-zinc-900 focus:outline-none focus:border-zinc-400 font-semibold"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            (() => {
                              const rawVal = row[col.accessor];
                              const isImgCol = col.id.toLowerCase().includes("image") || col.id.toLowerCase().includes("logo");
                              if (isImgCol) {
                                const valStr = String(rawVal ?? "").trim();
                                if (valStr) {
                                  return (
                                    <button
                                      onClick={() => setSelectedImage(valStr)}
                                      className="p-1.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-950 border border-zinc-300/80 shadow-xs transition-colors cursor-pointer flex items-center justify-center focus:outline-none"
                                      title="View Image"
                                    >
                                      <ImageIcon size={13} />
                                    </button>
                                  );
                                }
                                return <span className="text-xs text-zinc-400 italic">No Image</span>;
                              }
                              return rawVal;
                            })()
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td 
                  colSpan={colOrder.length + (isEditMode ? 1 : 0)}
                  className="py-12 px-4 text-center text-sm text-zinc-400 italic"
                >
                  No matching records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Fixed Sticky Footer */}
      <div className="flex items-center justify-between bg-[#F0F4F9] px-5 py-3.5 border-t border-slate-200 select-none z-10 flex-shrink-0">
        <span className="font-primary text-sm font-bold text-zinc-700 tracking-tight">
          Total {filteredData.length} records
        </span>
        <div className="flex items-center gap-2">
          <CustomButton
            variant="default"
            onClick={exportCSV}
            title="Export data as CSV spreadsheet"
          >
            <FileSpreadsheet size={14} />
            Export to CSV
          </CustomButton>
          <CustomButton
            variant="default"
            onClick={exportPDF}
            title="Export data as printable PDF report"
          >
            <FileText size={14} />
            Export to PDF
          </CustomButton>
        </div>
      </div>

      {/* PDF Column Selection Modal */}
      {isExportModalOpen && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[0.5px] flex items-center justify-center z-30 font-primary">
          <div className="bg-[#EEEEEE] border border-zinc-300 w-80 rounded-lg p-5 shadow-xl flex flex-col gap-4">
            <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">Select Columns to Export</h3>
            <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto pr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {columns.map((col) => (
                <label key={col.id} className="flex items-center gap-2.5 text-xs text-zinc-800 hover:text-zinc-950 cursor-pointer font-medium select-none">
                  <input
                    type="checkbox"
                    checked={!!pdfExportCols[col.id]}
                    onChange={() => setPdfExportCols(prev => ({ ...prev, [col.id]: !prev[col.id] }))}
                    className="w-4 h-4 rounded border-zinc-300 bg-[#EEEEEE] text-zinc-800 focus:ring-zinc-400 accent-zinc-800 cursor-pointer"
                  />
                  {col.header}
                </label>
              ))}
            </div>
            <div className="flex justify-between gap-2.5 pt-2 border-t border-zinc-300/60 mt-1">
              <button
                onClick={() => {
                  const allChecked = Object.values(pdfExportCols).every(Boolean);
                  setPdfExportCols(columns.reduce((acc, col) => ({ ...acc, [col.id]: !allChecked }), {}));
                }}
                className="text-[10px] font-bold text-zinc-600 hover:text-zinc-950 hover:underline cursor-pointer"
              >
                {Object.values(pdfExportCols).every(Boolean) ? "Deselect All" : "Select All"}
              </button>
              <div className="flex gap-2">
                <CustomButton
                  variant="secondary"
                  onClick={() => setIsExportModalOpen(false)}
                >
                  Cancel
                </CustomButton>
                <CustomButton
                  variant="dark"
                  onClick={handleConfirmPDFExport}
                  disabled={!Object.values(pdfExportCols).some(Boolean)}
                  className="disabled:bg-zinc-400 disabled:cursor-not-allowed"
                >
                  Export
                </CustomButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Alert Dialog */}
      <ConfirmDialog
        open={deleteRowId !== null}
        onOpenChange={(open) => { if (!open) setDeleteRowId(null); }}
        title="Delete Audit Log Entry"
        description={`Are you sure you want to delete audit log entry ${deleteRowId}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={handleConfirmDelete}
      />

      {/* Unsaved Changes Confirmation Dialog */}
      <ConfirmDialog
        open={showUnsavedConfirm}
        onOpenChange={setShowUnsavedConfirm}
        title="Unsaved Changes"
        description="You are currently editing a log entry. Discarding will lose all unsaved modifications."
        confirmText="Discard"
        variant="dark"
        onConfirm={() => {
          setEditingRowId(null);
          setEditRowData(null);
          setIsEditMode(false);
          onEditModeChange?.(false);
        }}
      />

      {/* Image Preview Modal Popup */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-tableFadeInOnly p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative max-w-3xl max-h-[85vh] bg-[#EEEEEE] border border-zinc-300 rounded-lg shadow-xl overflow-hidden flex flex-col animate-modalSlideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="h-10 flex items-center justify-between px-4 bg-[#E5E5E5] border-b border-zinc-300">
              <span className="font-bold text-xs text-zinc-700 uppercase tracking-wider select-none">
                Image Preview
              </span>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1 rounded-full hover:bg-zinc-200 text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer focus:outline-none"
                title="Close"
              >
                <X size={14} />
              </button>
            </div>

            {/* Image Container */}
            <div className="p-6 flex items-center justify-center bg-white overflow-auto max-h-[calc(85vh-40px)]">
              <img 
                src={selectedImage} 
                alt="Database Preview" 
                className="max-w-full max-h-[65vh] object-contain rounded border border-zinc-200 shadow-sm"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://placehold.co/400x300?text=Failed+to+Load+Image";
                }}
              />
            </div>
            
            {/* Modal Footer with URL link */}
            <div className="bg-[#E5E5E5] border-t border-zinc-300 px-4 py-2 flex justify-between items-center text-[10px] text-zinc-500 font-mono select-none">
              <span className="truncate max-w-[70%]">{selectedImage}</span>
              <a 
                href={selectedImage} 
                target="_blank" 
                rel="noreferrer" 
                className="text-zinc-600 hover:text-zinc-950 font-bold hover:underline cursor-pointer"
              >
                Open Original ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
