/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Coins, Download, Calendar, ShieldAlert, AlertTriangle, FileWarning } from "lucide-react";
import { DatabaseState, DeductionApproval } from "../types";
import { Modal } from "./Modals";
import { exportToCSV } from "../utils";

interface DeductionsProps {
  state: DatabaseState;
  onApplyDeduction: (deduction: Omit<DeductionApproval, "id">) => void;
  onDeleteDeduction: (id: string) => void;
  onSelectEmployee?: (empId: string, dossierTab?: "overview" | "financials" | "attendance" | "compliance") => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function Deductions({
  state,
  onApplyDeduction,
  onDeleteDeduction,
  onSelectEmployee,
  showToast,
}: DeductionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Form states
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [splitStrategy, setSplitStrategy] = useState<"divide" | "full">("divide");
  const [type, setType] = useState<"Broken Charge" | "Wastage Deduction" | "General Negligence" | "Other Penalty">("Broken Charge");
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!date) {
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [date]);

  // Quick Select Helper routines
  const handleToggleSelectEmployee = (id: string) => {
    setSelectedEmpIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectByDept = (dept: string) => {
    const ids = state.employees.filter(e => e.dept === dept).map(e => e.id);
    setSelectedEmpIds(prev => {
      const combined = new Set([...prev, ...ids]);
      return Array.from(combined);
    });
    showToast(`Selected all designated personnel in ${dept} department.`, "info");
  };

  const handleSelectByPositionKeyword = (keyword: string) => {
    const ids = state.employees
      .filter(e => e.position.toLowerCase().includes(keyword.toLowerCase()))
      .map(e => e.id);
    setSelectedEmpIds(prev => {
      const combined = new Set([...prev, ...ids]);
      return Array.from(combined);
    });
    showToast(`Selected all personnel with matching position containing: "${keyword}".`, "info");
  };

  const handleClearSelection = () => {
    setSelectedEmpIds([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmpIds.length === 0) {
      showToast("Please choose at least one responsible personnel first.", "error");
      return;
    }
    if (amount <= 0) {
      showToast("Deduction amount must be greater than zero.", "error");
      return;
    }
    if (!date) {
      showToast("Please select the infraction date.", "error");
      return;
    }
    if (!reason) {
      showToast("Please specify the context of negligence.", "error");
      return;
    }

    const rawShare = splitStrategy === "divide" ? amount / selectedEmpIds.length : amount;
    const shareAmount = Math.max(1, Math.round(rawShare));

    selectedEmpIds.forEach(id => {
      const empInfo = state.employees.find(x => x.id === id);
      const isMultiple = selectedEmpIds.length > 1;
      const formattedReason = `${type}: ${reason}${isMultiple ? ` (Shared negligence fee splits among ${selectedEmpIds.length} staff - Strategy: ${splitStrategy === "divide" ? "Split Equally" : "Full Cost Each"})` : ""}`;
      
      onApplyDeduction({
        empId: id,
        date,
        reason: formattedReason,
        amount: shareAmount,
      });
    });

    // Reset Form
    setSelectedEmpIds([]);
    setAmount(0);
    setReason("");
    setIsOpen(false);
    showToast(`${type} successfully registered and distributed for ${selectedEmpIds.length} employees.`, "success");
  };

  const handleExport = () => {
    const headers = ["Deduction ID", "Employee", "Date", "Negligence Details", "Amount (MWK)"];
    const rows = state.deductionApprovals.map(d => {
      const emp = state.employees.find(e => e.id === d.empId);
      return [
        d.id,
        emp ? `${emp.first} ${emp.last}` : "Unknown",
        d.date,
        d.reason,
        String(d.amount),
      ];
    });

    exportToCSV(headers, rows, "Hotel_Negligence_Deductions_Audit");
    showToast("Negligence payroll deductions sheet exported.", "success");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Policy banner */}
      <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-6 dark:border-rose-950/30 dark:bg-rose-950/10">
        <div className="flex gap-4 items-start">
          <div className="rounded-xl bg-rose-500/10 p-3 text-rose-600 dark:bg-rose-950/40 dark:text-rose-455">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-wider text-rose-800 dark:text-rose-400">
              Hotel Operational Negligence & Breakage Sweep Policy
            </h4>
            <p className="text-xs text-rose-750 mt-1 leading-relaxed dark:text-slate-400">
              Under compliance protocols, documented damage to property (glassware, tableware, linens, cutlery) or raw material wastage is subject to partial or full reimbursement deductions. This registry handles compliant hotel-floor audit overrides during active pay cycles.
            </p>
          </div>
        </div>
      </div>

      {/* Header and trigger buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800 shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider dark:text-slate-300">
            Deductions Registry Log
          </h3>
          <p className="text-[11px] text-slate-450 mt-0.5">
            Active negligence penalties and breakage audit controls.
          </p>
        </div>
        <div className="flex gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleExport}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-850 transition"
          >
            <Download className="h-4.5 w-4.5 text-slate-500" />
            Export Audit Sheet
          </button>
          <button
            onClick={() => setIsOpen(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition"
          >
            <Plus className="h-4.5 w-4.5" />
            Log Negligence Charge
          </button>
        </div>
      </div>

      {/* Deductions registry table list */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4 text-center">Accrual Date</th>
                <th className="px-6 py-4">Violation / Negligence Context</th>
                <th className="px-6 py-4 text-right">Deducted (MWK)</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {state.deductionApprovals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-slate-400 dark:text-slate-500 leading-relaxed">
                    <p className="font-semibold text-slate-700 dark:text-slate-350">Registry list is currently empty.</p>
                    <p className="text-xs text-slate-450 mt-1">No negligence breakages or food wastage charges are currently pending recovery.</p>
                  </td>
                </tr>
              ) : (
                state.deductionApprovals.map(d => {
                  const emp = state.employees.find(e => e.id === d.empId);
                  
                  // Extract display details
                  let displayType = "Other Negligence";
                  let noteDetails = d.reason;
                  if (d.reason.startsWith("Broken Charge: ")) {
                    displayType = "Broken Charge";
                    noteDetails = d.reason.replace("Broken Charge: ", "");
                  } else if (d.reason.startsWith("Wastage Deduction: ")) {
                    displayType = "Wastage Deduction";
                    noteDetails = d.reason.replace("Wastage Deduction: ", "");
                  } else if (d.reason.startsWith("General Negligence: ")) {
                    displayType = "General Negligence";
                    noteDetails = d.reason.replace("General Negligence: ", "");
                  } else if (d.reason.startsWith("Other Penalty: ")) {
                    displayType = "Other Penalty";
                    noteDetails = d.reason.replace("Other Penalty: ", "");
                  }

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/25 dark:hover:bg-slate-800/10 transition">
                      <td className="px-6 py-4">
                        <div 
                          className="flex items-center gap-3 cursor-pointer group/item"
                          onClick={() => emp && onSelectEmployee && onSelectEmployee(emp.id, "financials")}
                        >
                          {emp ? (
                            <>
                              <img
                                src={emp.photo}
                                alt={emp.first}
                                className="h-8.5 w-8.5 rounded-full object-cover transition group-hover/item:scale-105"
                              />
                              <div>
                                <h4 className="font-bold text-slate-900 dark:text-white transition group-hover/item:text-emerald-500 dark:group-hover/item:text-emerald-400">
                                  {emp.first} {emp.last}
                                </h4>
                                <span className="text-[10px] font-mono text-slate-450 uppercase">
                                  {emp.id} &bull; {emp.position}
                                </span>
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-400 font-medium">Archived Teammate</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-slate-550 dark:text-slate-400">
                        {d.date}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-extrabold uppercase ${
                            displayType === "Broken Charge" 
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                              : displayType === "Wastage Deduction"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
                              : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                          }`}>
                            {displayType}
                          </span>
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-350 max-w-sm break-words">
                            {noteDetails}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        -{d.amount.toLocaleString()} MWK
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => {
                            if (confirm(`Revoke negligence deduction charge of ${d.amount.toLocaleString()} MWK for this employee?`)) {
                              onDeleteDeduction(d.id);
                              showToast("Incident payroll charge successfully revoked.", "info");
                            }
                          }}
                          className="rounded-xl border border-slate-100 p-2 text-rose-500 hover:bg-rose-50 dark:border-slate-800 dark:hover:bg-rose-950/30 transition shadow-sm"
                          title="Revoke Charge"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* MODAL FORM: CREATE OPERATIONS NEG-DEDUCTION */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Log Operational Negligence Charge"
        subtitle="Log breakages, chef ingredient wastage, or property losses to enforce automated monthly paycheck amortization recovery."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* PERSONNEL CHECKBOX MULTI-SELECT PANEL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide dark:text-slate-300">
                Acknowledge Liable Personnel ({selectedEmpIds.length} chosen)
              </label>
              {selectedEmpIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-[10px] font-bold text-rose-500 hover:underline uppercase cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {/* Quick-Batch triggers for Chefs, Head Chefs, Admin, Porters */}
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[9px] font-bold uppercase text-slate-400 self-center px-1">Quick Select:</span>
              <button
                type="button"
                onClick={() => handleSelectByDept("Kitchen")}
                className="rounded-lg bg-white dark:bg-slate-900 border border-slate-150 px-2 py-0.5 text-[10px] font-bold text-slate-705 dark:text-slate-300 hover:bg-rose-50/50 hover:text-rose-600 dark:border-slate-800 transition shadow-sm cursor-pointer"
              >
                + Kitchen Staff
              </button>
              <button
                type="button"
                onClick={() => handleSelectByPositionKeyword("chef")}
                className="rounded-lg bg-white dark:bg-slate-900 border border-slate-150 px-2 py-0.5 text-[10px] font-bold text-slate-705 dark:text-slate-300 hover:bg-rose-50/50 hover:text-rose-600 dark:border-slate-800 transition shadow-sm cursor-pointer"
              >
                + Job: Chefs
              </button>
              <button
                type="button"
                onClick={() => handleSelectByPositionKeyword("porter")}
                className="rounded-lg bg-white dark:bg-slate-900 border border-slate-150 px-2 py-0.5 text-[10px] font-bold text-slate-705 dark:text-slate-300 hover:bg-rose-50/50 hover:text-rose-600 dark:border-slate-800 transition shadow-sm cursor-pointer"
              >
                + Job: Porters
              </button>
              <button
                type="button"
                onClick={() => handleSelectByDept("Administration")}
                className="rounded-lg bg-white dark:bg-slate-900 border border-slate-150 px-2 py-0.5 text-[10px] font-bold text-slate-705 dark:text-slate-300 hover:bg-rose-50/50 hover:text-rose-600 dark:border-slate-800 transition shadow-sm cursor-pointer"
              >
                + Administration
              </button>
              <button
                type="button"
                onClick={() => handleSelectByDept("Operations")}
                className="rounded-lg bg-white dark:bg-slate-900 border border-slate-150 px-2 py-0.5 text-[10px] font-bold text-slate-705 dark:text-slate-300 hover:bg-rose-50/50 hover:text-rose-600 dark:border-slate-800 transition shadow-sm cursor-pointer"
              >
                + Operations
              </button>
            </div>

            {/* Individual filter query */}
            <input
              type="text"
              placeholder="Filter list by teammate name, role or segment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs focus:border-rose-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
            />

            {/* Checkbox Scroller list */}
            <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 divide-y divide-slate-100/50 dark:divide-slate-800">
              {state.employees
                .filter(e => {
                  const query = searchQuery.toLowerCase();
                  return (
                    e.first.toLowerCase().includes(query) ||
                    e.last.toLowerCase().includes(query) ||
                    e.position.toLowerCase().includes(query) ||
                    e.dept.toLowerCase().includes(query) ||
                    e.id.toLowerCase().includes(query)
                  );
                })
                .map(e => {
                  const isChecked = selectedEmpIds.includes(e.id);
                  return (
                    <label
                      key={e.id}
                      className={`flex items-center justify-between px-3 py-2 cursor-pointer transition rounded-lg ${
                        isChecked 
                          ? "bg-rose-500/10 dark:bg-rose-950/20" 
                          : "hover:bg-slate-50 dark:hover:bg-slate-850/45"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectEmployee(e.id)}
                          className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 dark:border-slate-700 h-3.5 w-3.5"
                        />
                        <img src={e.photo} alt={e.first} className="h-6 w-6 rounded-full object-cover border" />
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-white leading-none font-sans">
                            {e.first} {e.last}
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5">
                            {e.position} &bull; {e.dept} ({e.id})
                          </div>
                        </div>
                      </div>
                      <span className="text-[9px] text-slate-450 dark:text-slate-400 font-mono tracking-wider bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase">
                        {e.branch}
                      </span>
                    </label>
                  );
                })}
              {state.employees.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400">No personnel profiles registered yet.</div>
              )}
            </div>
          </div>

          {/* DISTRIBUTION STRATEGY SELECTOR */}
          {selectedEmpIds.length > 1 && (
            <div className="rounded-xl border border-rose-100 bg-rose-50/20 p-4 dark:border-rose-950/30 space-y-2 animate-fade-in">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-rose-850 dark:text-rose-400 uppercase tracking-wide">
                <AlertTriangle className="h-3.5 w-3.5" />
                Distribution Settings (Multi-Liability Management)
              </div>
              <p className="text-[10px] text-slate-550 dark:text-slate-400">
                Determine how the total amount of <strong>{amount.toLocaleString()} MWK</strong> is distributed among the {selectedEmpIds.length} chosen personnel to bare responsibility:
              </p>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setSplitStrategy("divide")}
                  className={`rounded-lg p-2 text-xs font-bold border transition text-center cursor-pointer ${
                    splitStrategy === "divide"
                      ? "bg-rose-500 border-rose-500 text-white shadow-sm"
                      : "bg-white dark:bg-slate-900 border-slate-200 text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:border-slate-800"
                  }`}
                >
                  <p>Split Cost Equally</p>
                  <p className="text-[9px] font-normal opacity-90 font-mono mt-0.5">
                    ~{Math.round(amount / selectedEmpIds.length).toLocaleString()} MWK each
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setSplitStrategy("full")}
                  className={`rounded-lg p-2 text-xs font-bold border transition text-center cursor-pointer ${
                    splitStrategy === "full"
                      ? "bg-rose-500 border-rose-500 text-white shadow-sm"
                      : "bg-white dark:bg-slate-900 border-slate-200 text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:border-slate-800"
                  }`}
                >
                  <p>Apply Full Cost to All</p>
                  <p className="text-[9px] font-normal opacity-90 font-mono mt-0.5">
                    {amount.toLocaleString()} MWK each
                  </p>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide dark:text-slate-350 mb-1">
                Charge Category Area
              </label>
              <select
                required
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-rose-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-101"
              >
                <option value="Broken Charge">Broken Charge (Breakages)</option>
                <option value="Wastage Deduction">Wastage Deduction (Kitchen)</option>
                <option value="General Negligence">General Property Damage</option>
                <option value="Other Penalty">Other Negligence Penalty</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-707 uppercase tracking-wide dark:text-slate-350 mb-1">
                Imposed Charge Cost (MWK)
              </label>
              <input
                type="number"
                required
                placeholder="Cost amount in MWK"
                value={amount === 0 ? "" : amount}
                onChange={(e) => setAmount(e.target.value === "" ? 0 : Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 py-2 px-3.5 text-sm font-mono focus:border-rose-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide dark:text-slate-350 mb-1">
              Occurrence Logging Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-101"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide dark:text-slate-350 mb-1">
              Operational Audit Notes (Context)
            </label>
            <textarea
              required
              rows={3}
              placeholder="E.g., Broke 3 crystal champagne glasses at the restro bar, or raw stock spoilage due to freezer neglect..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-rose-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="border-t border-slate-100 pt-4 flex gap-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-1/2 rounded-xl border border-slate-200 px-4 py-2 hover:bg-slate-50 dark:border-slate-705 dark:text-slate-300 text-sm font-bold"
            >
              Dismiss
            </button>
            <button
              type="submit"
              className="w-1/2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm py-2 shadow-md transition"
            >
              Commit Charge
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
