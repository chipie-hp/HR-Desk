/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Plus, Coins, ShieldCheck, Download, DollarSign, Wallet } from "lucide-react";
import { DatabaseState, Loan } from "../types";
import { Modal } from "./Modals";
import { exportToCSV } from "../utils";

interface LoansProps {
  state: DatabaseState;
  onRecordLoan: (loan: Omit<Loan, "id" | "paid">) => void;
  onPayOffLoan: (empId: string) => void;
  onSelectEmployee?: (empId: string, dossierTab?: "overview" | "financials" | "attendance" | "compliance") => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function Loans({
  state,
  onRecordLoan,
  onPayOffLoan,
  onSelectEmployee,
  showToast,
}: LoansProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Form states
  const [empId, setEmpId] = useState("");
  const [amount, setAmount] = useState(300000);
  const [months, setMonths] = useState(12);

  useEffect(() => {
    if (state.employees.length > 0 && !empId) {
      setEmpId(state.employees[0].id);
    }
  }, [state.employees, empId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId || amount <= 0 || months <= 0) {
      showToast("Please provide positive numerical outputs.", "error");
      return;
    }

    onRecordLoan({
      empId,
      amount,
      months,
    });

    // Reset
    setAmount(300000);
    setMonths(12);
    setIsOpen(false);
    showToast("Loan facility disbursed to selected teammate.", "success");
  };

  const handlePayOff = (loan: Loan) => {
    onPayOffLoan(loan.empId);
    showToast(`Outstanding loan facility fully amortized.`, "success");
  };

  const handleExport = () => {
    const headers = ["Employee", "Branch", "Principal Amount", "Installment Tenure", "Paid Amount", "Outstanding Balance Due"];
    const rows = state.loans.map(l => {
      const emp = state.employees.find(e => e.id === l.empId);
      return [
        emp ? `${emp.first} ${emp.last}` : "Unknown Profile",
        emp ? emp.branch : "N/A",
        String(l.amount),
        `${l.months} months`,
        String(l.paid),
        String(l.amount - l.paid)
      ];
    });
    exportToCSV(headers, rows, "Active_Loans_Ledger");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          Employee Outstanding Loans Ledger
        </h3>
        <div className="flex gap-2.5">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition"
          >
            <Download className="h-4.5 w-4.5 text-slate-500" />
            Export CSV
          </button>
          <button
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-600 transition"
          >
            <Plus className="h-4.5 w-4.5" />
            Record Loan
          </button>
        </div>
      </div>

      {/* Grid summarizing Loan volumes outstanding */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4 text-right">Principal sum (MWK)</th>
                <th className="px-6 py-4 text-center">Installments tenure</th>
                <th className="px-6 py-4 text-right">Paid to date (MWK)</th>
                <th className="px-6 py-4 text-right">Outstanding balance (MWK)</th>
                <th className="px-6 py-4 text-center">Amortization actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {state.loans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 dark:text-slate-500">
                    No active loan facilities initialized in databases.
                  </td>
                </tr>
              ) : (
                state.loans.map(l => {
                  const emp = state.employees.find(e => e.id === l.empId);
                  const isAmortized = l.paid >= l.amount;

                  return (
                    <tr key={l.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10 transition">
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
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {l.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-550 dark:text-slate-400">
                        {l.months} Mos
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {l.paid.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-rose-600 dark:text-rose-450">
                        {(l.amount - l.paid).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isAmortized ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-350 leading-none">
                            <ShieldCheck className="h-3 w-3" />
                            Paid off
                          </span>
                        ) : (
                          <button
                            onClick={() => handlePayOff(l)}
                            className="rounded-xl border border-emerald-500 hover:bg-emerald-50 text-emerald-600 px-3 py-1 text-xs font-bold transition focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950/20"
                          >
                            Pay rest off
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORM MODAL: DISBURSE LANDING */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Disburse Loan Facility"
        subtitle="Provision a region-approved low interest facility amortized monthly."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-705 uppercase tracking-wide dark:text-slate-300 mb-1">
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
              Principal Balance Sum (MWK)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 font-mono text-sm text-slate-400">
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

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide dark:text-slate-300 mb-1">
              Amortization Tenure (Months)
            </label>
            <input
              type="number"
              required
              value={months === 0 ? "" : months}
              onChange={(e) => setMonths(e.target.value === "" ? 0 : Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
            />
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
              Disburse principal
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
