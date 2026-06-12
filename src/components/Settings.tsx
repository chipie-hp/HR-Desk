/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { Plus, Trash2, Sliders, Database, UploadCloud, ShieldAlert, BadgeInfo } from "lucide-react";
import { DatabaseState, SystemConfig } from "../types";

interface SettingsProps {
  state: DatabaseState;
  onUpdateConfig: (config: SystemConfig) => void;
  onAddBranch: (name: string) => void;
  onRemoveBranch: (name: string) => void;
  onRestoreDatabase: (restoredState: DatabaseState) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function Settings({
  state,
  onUpdateConfig,
  onAddBranch,
  onRemoveBranch,
  onRestoreDatabase,
  showToast,
}: SettingsProps) {
  const [newBranch, setNewBranch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic configuration binds
  const handleConfigChange = (field: keyof SystemConfig, value: number) => {
    onUpdateConfig({
      ...state.config,
      [field]: value,
    });
  };

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranch.trim()) return;

    if (state.branches.includes(newBranch.trim())) {
      showToast("Branch already exists under databases.", "error");
      return;
    }

    onAddBranch(newBranch.trim());
    setNewBranch("");
    showToast(`Branch "${newBranch.trim()}" added.`, "success");
  };

  const handleBackup = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
      const dlAnchorElem = document.createElement("a");
      dlAnchorElem.setAttribute("href", dataStr);
      dlAnchorElem.setAttribute("download", `CCASH_HR_Database_React_Backup.json`);
      dlAnchorElem.style.display = "none";
      document.body.appendChild(dlAnchorElem);
      dlAnchorElem.click();
      document.body.removeChild(dlAnchorElem);
      showToast("Local backup saved successfully.", "success");
    } catch (err) {
      showToast("Backup calculation crashed.", "error");
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result === "string") {
          const parsed = JSON.parse(result);
          // Simple validation structure check
          if (Array.isArray(parsed.employees) && typeof parsed.config === "object") {
            onRestoreDatabase(parsed as DatabaseState);
            showToast("Database successfully restored from JSON backup file.", "success");
          } else {
            showToast("Invalid JSON schema structure.", "error");
          }
        }
      } catch (err) {
        showToast("Stalled parsing backup file.", "error");
      }
    };
    reader.readAsText(file);
  };

  const [wipeBranch, setWipeBranch] = useState("all");
  const [wipeCategories, setWipeCategories] = useState({
    employees: true,
    attendance: true,
    leave: true,
    financials: true,
    compliance: true,
    documents: true,
  });
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [confirmValue, setConfirmValue] = useState("");

  const executeWipe = () => {
    if (confirmValue.trim().toUpperCase() !== "WIPE") {
      showToast("Verification text does not match. Action aborted.", "error");
      return;
    }

    // Collect active employee IDs for the target branch
    const employeesOfBranch = state.employees.filter(
      emp => wipeBranch === "all" || emp.branch === wipeBranch
    );
    const empIdsToWipe = new Set(employeesOfBranch.map(emp => emp.id));

    // Construct the new state
    const newState = { ...state };

    if (wipeCategories.employees) {
      newState.employees = state.employees.filter(emp => !empIdsToWipe.has(emp.id));
    }

    if (wipeCategories.attendance) {
      const updatedAttendance = { ...state.attendance };
      if (wipeBranch === "all") {
        newState.attendance = {};
      } else {
        Object.keys(updatedAttendance).forEach(dateStr => {
          const dayRecord = { ...updatedAttendance[dateStr] };
          Object.keys(dayRecord).forEach(empId => {
            if (empIdsToWipe.has(empId)) {
              delete dayRecord[empId];
            }
          });
          updatedAttendance[dateStr] = dayRecord;
        });
        newState.attendance = updatedAttendance;
      }
    }

    if (wipeCategories.leave) {
      newState.leave = state.leave.filter(l => !empIdsToWipe.has(l.empId));
    }

    if (wipeCategories.financials) {
      newState.loans = state.loans.filter(l => !empIdsToWipe.has(l.empId));
      newState.advances = state.advances.filter(a => !empIdsToWipe.has(a.empId));
      newState.deductionApprovals = state.deductionApprovals.filter(d => !empIdsToWipe.has(d.empId));
      newState.payroll = state.payroll.filter(p => !empIdsToWipe.has(p.id));
    }

    if (wipeCategories.compliance) {
      newState.disciplinary = state.disciplinary.filter(d => !empIdsToWipe.has(d.empId));
    }

    if (wipeCategories.documents) {
      newState.documents = state.documents.filter(d => !empIdsToWipe.has(d.empId));
    }

    onRestoreDatabase(newState);
    setShowWipeConfirm(false);
    setConfirmValue("");
    showToast(
      `Irreversible wipe executed for ${
        wipeBranch === "all" ? "all branches" : wipeBranch
      } datasets.`,
      "success"
    );
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      {/* Parameter Cards Grid list */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2.5 mb-6">
          <Sliders className="h-5 w-5 text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-805 uppercase tracking-wider">
            Corporate tax / statutory parameters
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {/* PAYE Flat rate % */}
          <div>
            <label className="block text-xs font-bold text-slate-650 uppercase tracking-wider dark:text-slate-350 mb-1.5">
              PAYE Income Tax flat rate (%)
            </label>
            <input
              type="number"
              value={state.config.paye === 0 ? "" : state.config.paye}
              onChange={(e) => handleConfigChange("paye", e.target.value === "" ? 0 : Number(e.target.value))}
              className="w-full rounded-xl border border-slate-205 py-2 px-3.5 text-sm font-mono focus:border-emerald-500 focus:outline-none dark:bg-slate-950 dark:border-slate-800 dark:text-slate-101"
            />
          </div>

          {/* National Pension % */}
          <div>
            <label className="block text-xs font-bold text-slate-650 uppercase tracking-wider dark:text-slate-350 mb-1.5">
              National Pension Contribution (%)
            </label>
            <input
              type="number"
              value={state.config.pension === 0 ? "" : state.config.pension}
              onChange={(e) => handleConfigChange("pension", e.target.value === "" ? 0 : Number(e.target.value))}
              className="w-full rounded-xl border border-slate-205 py-2 px-3.5 text-sm font-mono focus:border-emerald-500 focus:outline-none dark:bg-slate-950 dark:border-slate-800 dark:text-slate-101"
            />
          </div>

          {/* Overtime multiplier Factor */}
          <div>
            <label className="block text-xs font-bold text-slate-650 uppercase tracking-wider dark:text-slate-350 mb-1.5">
              Overtime Factor (standard x factor)
            </label>
            <input
              type="number"
              step="0.1"
              value={state.config.ot_rate === 0 ? "" : state.config.ot_rate}
              onChange={(e) => handleConfigChange("ot_rate", e.target.value === "" ? 0 : Number(e.target.value))}
              className="w-full rounded-xl border border-slate-205 py-2 px-3.5 text-sm font-mono focus:border-emerald-500 focus:outline-none dark:bg-slate-950 dark:border-slate-800 dark:text-slate-101"
            />
          </div>

          {/* Daily Absence deduction MWK amount */}
          <div>
            <label className="block text-xs font-bold text-slate-650 uppercase tracking-wider dark:text-slate-350 mb-1.5">
              Daily absence deduction rate (MWK)
            </label>
            <input
              type="number"
              value={state.config.daily_absent_deduction === 0 ? "" : state.config.daily_absent_deduction}
              onChange={(e) => handleConfigChange("daily_absent_deduction", e.target.value === "" ? 0 : Number(e.target.value))}
              className="w-full rounded-xl border border-slate-205 py-2 px-3.5 text-sm font-mono focus:border-emerald-500 focus:outline-none dark:bg-slate-950 dark:border-slate-800 dark:text-slate-101"
            />
          </div>

          {/* Annual leave ent */}
          <div>
            <label className="block text-xs font-bold text-slate-650 uppercase tracking-wider dark:text-slate-350 mb-1.5">
              Standard Annual Leave Days (yearly)
            </label>
            <input
              type="number"
              value={state.config.leave_days === 0 ? "" : state.config.leave_days}
              onChange={(e) => handleConfigChange("leave_days", e.target.value === "" ? 0 : Number(e.target.value))}
              className="w-full rounded-xl border border-slate-205 py-2 px-3.5 text-sm font-mono focus:border-emerald-500 focus:outline-none dark:bg-slate-950 dark:border-slate-800 dark:text-slate-101"
            />
          </div>
        </div>
      </div>

      {/* Dynamic Branch allocation managers */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Create and remove branches */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-805 uppercase tracking-wider mb-5">
            Regional Branch Location Registers
          </h3>

          <form onSubmit={handleCreateBranch} className="flex gap-2.5 mb-5.5">
            <input
              type="text"
              required
              placeholder="e.g. Zomba Branch"
              value={newBranch}
              onChange={(e) => setNewBranch(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 py-2 px-3.5 text-sm focus:border-emerald-500 focus:outline-none dark:bg-slate-950 dark:border-slate-800 dark:text-slate-105"
            />
            <button
              type="submit"
              className="rounded-xl bg-emerald-500 text-white text-xs font-bold px-4 hover:bg-emerald-600 transition shrink-0"
            >
              Add Branch
            </button>
          </form>

          {/* List existing branches */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-52 overflow-y-auto rounded-xl border border-slate-100 dark:border-slate-800">
            {state.branches.map(br => (
              <div key={br} className="flex items-center justify-between py-2.5 px-4 bg-slate-50/50 dark:bg-slate-950/20">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {br}
                </span>
                <button
                  type="button"
                  disabled={br === "Main Branch"}
                  onClick={() => onRemoveBranch(br)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 disabled:opacity-30 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Local database backups and restore panel */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-805 uppercase tracking-wider mb-4">
              Local backup engine storage
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Generate offline localized state backups anytime, or restore full production ledger indexes using JSON backups.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleBackup}
              className="w-full rounded-xl bg-sky-55 hover:bg-sky-600 bg-sky-505 bg-sky-600 text-white py-2.5 text-sm font-bold shadow transition flex items-center justify-center gap-2"
            >
              <Database className="h-4.5 w-4.5" />
              Backup Local Storage
            </button>
            <button
              onClick={handleUploadClick}
              className="w-full rounded-xl border border-slate-200 text-slate-700 py-2.5 text-sm font-bold hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-850 transition flex items-center justify-center gap-2"
            >
              <UploadCloud className="h-4.5 w-4.5" />
              Restore Database JSON
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleRestore}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Administrative Clearing System control */}
      <div className="rounded-2xl border border-red-200 bg-red-50/5 p-6 shadow-sm dark:border-red-950/20 dark:bg-rose-950/5">
        <div className="flex items-center gap-2.5 mb-4 text-red-600 dark:text-red-400">
          <ShieldAlert className="h-5 w-5" />
          <h3 className="text-sm font-semibold uppercase tracking-wider">
            Administrative Desk Data Wiping Control
          </h3>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          Wipe and format specific branches or whole organization categories. <strong>Warning: Wiped data is permanently deleted from offline local memory.</strong>
        </p>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-5 mb-5 animate-fade-in">
          {/* Target Branch selection */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider dark:text-slate-400 mb-2">
              1. Choose Branch Target boundary
            </label>
            <select
              value={wipeBranch}
              onChange={(e) => setWipeBranch(e.target.value)}
              className="w-full rounded-xl border border-slate-205 bg-white py-2 px-3.5 text-sm font-bold focus:border-red-500 focus:outline-none dark:bg-slate-950 dark:border-slate-800 dark:text-slate-101"
            >
              <option value="all">All Branches (Whole Organization)</option>
              {state.branches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Categories select checkboxes */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider dark:text-slate-400 mb-2.5">
              2. Select categories to wipe
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.keys(wipeCategories).map(catKey => {
                const labelMap: Record<string, string> = {
                  employees: "Employees Portfolios",
                  attendance: "Attendance Records",
                  leave: "Leave Requests",
                  financials: "Financials (Loans/Advances/Negligences)",
                  compliance: "Disciplinary Logbook",
                  documents: "Documents Vault",
                };
                return (
                  <label key={catKey} className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={wipeCategories[catKey as keyof typeof wipeCategories]}
                      onChange={(e) => setWipeCategories(prev => ({ ...prev, [catKey]: e.target.checked }))}
                      className="rounded text-red-600 focus:ring-red-55 accent-red-600 h-3.5 w-3.5"
                    />
                    <span>{labelMap[catKey] || catKey}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Trigger / Confirm Section */}
        {!showWipeConfirm ? (
          <button
            type="button"
            onClick={() => {
              // Ensure at least one category is checked
              const noneSelected = Object.values(wipeCategories).every(v => !v);
              if (noneSelected) {
                showToast("Please select at least one database category to wipe.", "error");
                return;
              }
              setShowWipeConfirm(true);
            }}
            className="rounded-xl bg-red-600 text-white font-bold text-xs py-2.5 px-5 hover:bg-red-700 transition"
          >
            ⚠️ Erase Selected Datasets
          </button>
        ) : (
          <div className="bg-red-50 dark:bg-rose-950/20 rounded-xl p-4 border border-red-100 dark:border-red-900/10 space-y-3.5 max-w-md animate-fade-in">
            <p className="text-xs font-bold text-red-800 dark:text-red-400">
              Type the word <span className="underline font-black text-sm select-all">WIPE</span> into the verification box below to authorize permanent deletion of database:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter WIPE here"
                value={confirmValue}
                onChange={(e) => setConfirmValue(e.target.value)}
                className="flex-1 rounded-lg border border-red-300 bg-white py-1.5 px-3 text-xs font-black uppercase text-red-700 focus:outline-none focus:ring-1 focus:ring-red-500 dark:bg-slate-950 dark:border-rose-950"
              />
              <button
                type="button"
                onClick={executeWipe}
                className="rounded-lg bg-red-700 text-white font-black text-xs px-4 hover:bg-red-800 transition shadow animate-pulse"
              >
                Confirm Wipe
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowWipeConfirm(false);
                  setConfirmValue("");
                }}
                className="rounded-lg border border-slate-300 text-slate-600 font-bold text-xs px-3 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
