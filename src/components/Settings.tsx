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
    </div>
  );
}
