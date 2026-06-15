/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Plus, Gavel, Calendar, FileText, Download } from "lucide-react";
import { DatabaseState, DisciplinaryRecord } from "../types";
import { Modal } from "./Modals";
import { exportToCSV } from "../utils";

interface DisciplinaryProps {
  state: DatabaseState;
  onAddDisciplinary: (record: Omit<DisciplinaryRecord, "id" | "date">) => void;
  onSelectEmployee?: (empId: string, dossierTab?: "overview" | "financials" | "attendance" | "compliance") => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function Disciplinary({
  state,
  onAddDisciplinary,
  onSelectEmployee,
  showToast,
}: DisciplinaryProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Form states
  const [empId, setEmpId] = useState("");
  const [desc, setDesc] = useState("");
  const [action, setAction] = useState("");

  // Suspension period states
  const [isSuspension, setIsSuspension] = useState(false);
  const [suspensionStart, setSuspensionStart] = useState(() => new Date().toISOString().split("T")[0]);
  const [suspensionEnd, setSuspensionEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 13); // Default 14 days
    return d.toISOString().split("T")[0];
  });

  useEffect(() => {
    if (state.employees.length > 0 && !empId) {
      setEmpId(state.employees[0].id);
    }
  }, [state.employees, empId]);

  // Sync action choice with suspension state
  useEffect(() => {
    if (action === "Suspension") {
      setIsSuspension(true);
    } else {
      setIsSuspension(false);
    }
  }, [action]);

  const selectedEmp = state.employees.find(e => e.id === empId);
  const empSalary = selectedEmp ? selectedEmp.salary : 0;

  // Real-time suspension days and deduction calculations
  let calculatedSuspensionDays = 0;
  let calculatedSuspensionDeduction = 0;
  if (isSuspension && suspensionStart && suspensionEnd) {
    const sDate = new Date(suspensionStart);
    const eDate = new Date(suspensionEnd);
    if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime()) && eDate >= sDate) {
      const diffTime = eDate.getTime() - sDate.getTime();
      calculatedSuspensionDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      calculatedSuspensionDeduction = Math.round((empSalary / 30) * calculatedSuspensionDays);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId || !desc || !action) {
      showToast("Please fully outline infraction specifications.", "error");
      return;
    }

    onAddDisciplinary({
      empId,
      desc,
      action,
      isSuspension,
      suspensionStart: isSuspension ? suspensionStart : undefined,
      suspensionEnd: isSuspension ? suspensionEnd : undefined,
      suspensionDays: isSuspension ? calculatedSuspensionDays : undefined,
      suspensionDeduction: isSuspension ? calculatedSuspensionDeduction : undefined,
    });

    // Reset
    setDesc("");
    setAction("");
    setIsSuspension(false);
    setIsOpen(false);
    showToast("Incident case logged into file registry.", "success");
  };

  const handleExport = () => {
    const headers = ["Teammate Name", "Operational Branch", "Incident Date", "Infraction Details", "Action / Sanction Enforced"];
    const rows = state.disciplinary.map(d => {
      const emp = state.employees.find(e => e.id === d.empId);
      return [
        emp ? `${emp.first} ${emp.last}` : "Unknown Profile",
        emp ? emp.branch : "N/A",
        d.date,
        d.desc,
        d.action
      ];
    });
    exportToCSV(headers, rows, "Disciplinary_Case_Audits");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          Disciplinary Cases & infractions index
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
            Record Action Case
          </button>
        </div>
      </div>

      {/* Main Table details list */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-505 dark:border-slate-800 dark:bg-slate-900/50">
                <th className="px-6 py-4">Employee Details</th>
                <th className="px-6 py-4 text-center">Date Logged</th>
                <th className="px-6 py-4">Infraction Description</th>
                <th className="px-6 py-4">Sanction / Action Enforced</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {state.disciplinary.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-slate-400 dark:text-slate-500">
                    Registry database is currently empty of logged disciplinary actions.
                  </td>
                </tr>
              ) : (
                state.disciplinary.map(d => {
                  const emp = state.employees.find(e => e.id === d.empId);
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10 transition">
                      <td className="px-6 py-4.5">
                        <div 
                          className="flex items-center gap-3 cursor-pointer group/item"
                          onClick={() => emp && onSelectEmployee && onSelectEmployee(emp.id, "compliance")}
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
                        {d.date}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300 leading-relaxed max-w-sm break-words">
                        <div className="text-slate-900 dark:text-slate-200">{d.desc}</div>
                        {d.isSuspension && d.suspensionStart && d.suspensionEnd && (
                          <div className="mt-1.5 text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded inline-flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                            Suspension Period: {d.suspensionStart} to {d.suspensionEnd} ({d.suspensionDays} Days)
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4/5">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold ${
                            d.isSuspension
                              ? "bg-rose-50 border border-rose-100 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-950/20"
                              : "bg-orange-50 border border-orange-100 text-orange-800 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-950/20"
                          }`}>
                            <Gavel className={`h-3.5 w-3.5 ${d.isSuspension ? "text-rose-500" : "text-orange-500"}`} />
                            {d.action}
                          </span>
                          {d.isSuspension && d.suspensionDeduction !== undefined && (
                            <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded">
                              Deducted: MWK {d.suspensionDeduction.toLocaleString()}.00
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORM MODAL: REGISTER DISCIPLINARY */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Record Disciplinary Action Case"
        subtitle="Log corporate compliance warnings or formal warnings issued."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide dark:text-slate-350 mb-1">
              Select Teammate Profile
            </label>
            <select
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            >
              {state.employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.first} {e.last} ({e.id}) - MWK {e.salary.toLocaleString()}/mo
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide dark:text-slate-350 mb-1">
              Infraction Action Details
            </label>
            <textarea
              required
              rows={3}
              placeholder="Provide a detailed log stating the operational infraction event context..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-705 uppercase tracking-wide dark:text-slate-350 mb-1">
              Sanction / Penalty Imposed
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="">Select penalty action...</option>
              <option value="Verbal Consultation">Verbal Consultation</option>
              <option value="Written Warning">First Written Warning</option>
              <option value="Final Warning">Final Written Warning</option>
              <option value="Suspension">Suspension (Auto salary division deduction)</option>
              <option value="Termination">Termination</option>
            </select>
            <input
              type="text"
              placeholder="Or type custom sanction action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
          </div>

          {/* DYNAMIC SUSPENSION RANGE SELECTION */}
          {isSuspension && (
            <div className="p-4 bg-rose-500/5 rounded-xl border border-rose-500/10 space-y-3">
              <h5 className="text-[11px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-rose-500" />
                Configure Suspension Duration Properties
              </h5>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={suspensionStart}
                    onChange={(e) => setSuspensionStart(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-rose-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={suspensionEnd}
                    onChange={(e) => setSuspensionEnd(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-rose-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {selectedEmp && calculatedSuspensionDays > 0 ? (
                <div className="bg-white p-3 rounded-lg border border-rose-100 dark:bg-slate-950 dark:border-slate-900 text-xs text-slate-700 dark:text-slate-300 space-y-1 && block">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500">Monthly Base Salary:</span>
                    <span className="font-bold">MWK {selectedEmp.salary.toLocaleString()}.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500">Division Daily Rate:</span>
                    <span className="font-bold">MWK {Math.round(selectedEmp.salary / 30).toLocaleString()}.00/day</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-500">Suspension Duration:</span>
                    <span className="font-bold text-rose-650 dark:text-rose-400">{calculatedSuspensionDays} Days</span>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-900 pt-1.5 flex justify-between font-black text-slate-900 dark:text-white">
                    <span>Est. Pay Deduction:</span>
                    <span className="text-rose-600 dark:text-rose-400">MWK {calculatedSuspensionDeduction.toLocaleString()}.00</span>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] italic text-rose-500 font-bold">Please select a valid date period range.</p>
              )}
            </div>
          )}

          <div className="border-t border-slate-100 pt-4 flex gap-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-1/2 rounded-xl border border-slate-200 px-4 py-2 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 text-sm font-bold text-slate-700"
            >
              Dismiss
            </button>
            <button
              type="submit"
              className="w-1/2 rounded-xl bg-orange-500 text-white font-bold text-sm py-2 hover:bg-orange-600 transition shadow-md"
            >
              Log Infraction
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
