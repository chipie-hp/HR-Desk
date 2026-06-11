/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Plus, Coins, Calendar, Loader, Download } from "lucide-react";
import { DatabaseState, SalaryAdvance } from "../types";
import { Modal } from "./Modals";
import { exportToCSV } from "../utils";

interface AdvancesProps {
  state: DatabaseState;
  onIssueAdvance: (advance: Omit<SalaryAdvance, "id" | "date">) => void;
  onSelectEmployee?: (empId: string, dossierTab?: "overview" | "financials" | "attendance" | "compliance") => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function Advances({
  state,
  onIssueAdvance,
  onSelectEmployee,
  showToast,
}: AdvancesProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Form states
  const [empId, setEmpId] = useState("");
  const [amount, setAmount] = useState(50000);

  useEffect(() => {
    if (state.employees.length > 0 && !empId) {
      setEmpId(state.employees[0].id);
    }
  }, [state.employees, empId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId || amount <= 0) {
      showToast("Please specify a valid numeric amount.", "error");
      return;
    }

    onIssueAdvance({
      empId,
      amount,
    });

    // Reset
    setAmount(50000);
    setIsOpen(false);
    showToast("Mid-month advance sum issued successfully.", "success");
  };

  const handleExport = () => {
    const headers = ["Employee", "Branch", "Issued Date", "Advance Amount (MWK)", "Recovery Schedule"];
    const rows = state.advances.map(a => {
      const emp = state.employees.find(e => e.id === a.empId);
      return [
        emp ? `${emp.first} ${emp.last}` : "Unknown Profile",
        emp ? emp.branch : "N/A",
        a.date,
        String(a.amount),
        "Subtracted on Next Payroll Calculation Run"
      ];
    });
    exportToCSV(headers, rows, "Salary_Advances_Issued");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          Mid-Month Salary Advances Matrix
        </h3>
        <div className="flex gap-2.5">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-855 transition"
          >
            <Download className="h-4.5 w-4.5 text-slate-500" />
            Export CSV
          </button>
          <button
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-600 transition"
          >
            <Plus className="h-4.5 w-4.5" />
            Issue Advance
          </button>
        </div>
      </div>

      {/* Grid of issued advances */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4 text-center">Date Issued</th>
                <th className="px-6 py-4 text-right">Advance Amount (MWK)</th>
                <th className="px-6 py-4 text-center">Settlement Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {state.advances.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-slate-400 dark:text-slate-500">
                    No active salary advances logged in current monthly cycle.
                  </td>
                </tr>
              ) : (
                state.advances.map(adv => {
                  const emp = state.employees.find(e => e.id === adv.empId);
                  return (
                    <tr key={adv.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10 transition">
                      <td className="px-6 py-4.5">
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
                                  {emp.id} &bull; {emp.branch}
                                </span>
                              </div>
                            </>
                          ) : (
                            <span className="text-slate-400 font-medium">Archived Teammate</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-slate-550 dark:text-slate-450">
                        {adv.date}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-extrabold text-rose-600 dark:text-rose-455">
                        {adv.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-slate-500">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-410 leading-none">
                          <Loader className="h-3 w-3 animate-spin text-slate-405 shrink-0" />
                          Recovered on Run
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORM MODAL: DISBURSE ADVANCE */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Issue Mid-Month Cash Advance"
        subtitle="Issue an advance up to 50% of the employee's base salary."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-705 uppercase tracking-wide dark:text-slate-350 mb-1">
              Select Teammate Profile
            </label>
            <select
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-101"
            >
              {state.employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.first} {e.last} ({e.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide dark:text-slate-300 mb-1">
              Requested Advance Sum (MWK)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 font-mono text-xs text-slate-400">
                MWK
              </span>
              <input
                type="number"
                required
                value={amount === 0 ? "" : amount}
                onChange={(e) => setAmount(e.target.value === "" ? 0 : Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 py-2 pl-14 pr-4 text-sm font-mono focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 flex gap-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-1/2 rounded-xl border border-slate-200 px-4 py-2 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 text-sm font-bold"
            >
              Dismiss
            </button>
            <button
              type="submit"
              className="w-1/2 rounded-xl bg-emerald-500 py-2 text-sm font-bold text-white shadow-md hover:bg-emerald-600 transition"
            >
              Authorize Payout
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
