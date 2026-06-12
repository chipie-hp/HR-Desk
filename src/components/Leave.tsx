/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Plus, PlaneTakeoff, ShieldCheck, Download, Coins, Clock, Sparkles } from "lucide-react";
import { DatabaseState, LeaveRequest, Employee } from "../types";
import { Modal } from "./Modals";
import { exportToCSV, calculateOvertimeHours } from "../utils";

interface LeaveProps {
  state: DatabaseState;
  onApplyLeave: (request: Omit<LeaveRequest, "id" | "status">) => void;
  onUpdateEmployee: (id: string, updatedFields: Partial<Employee>) => void;
  onSelectEmployee?: (empId: string, dossierTab?: "overview" | "financials" | "attendance" | "compliance") => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function Leave({
  state,
  onApplyLeave,
  onUpdateEmployee,
  onSelectEmployee,
  showToast,
}: LeaveProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Form states
  const [empId, setEmpId] = useState("");
  const [type, setType] = useState<LeaveRequest["type"]>("Annual Leave");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [calculatedDays, setCalculatedDays] = useState(0);
  const [approver, setApprover] = useState("");

  // Set default employee if available
  useEffect(() => {
    if (state.employees.length > 0 && !empId) {
      setEmpId(state.employees[0].id);
    }
  }, [state.employees, empId]);

  // Handle live days calculations upon date changes
  useEffect(() => {
    if (start && end) {
      const s = new Date(start);
      const e = new Date(end);
      const diffTime = e.getTime() - s.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setCalculatedDays(diffDays > 0 ? diffDays : 0);
    } else {
      setCalculatedDays(0);
    }
  }, [start, end]);

  // Overtime Compensation and Calculator states
  const [otEmpId, setOtEmpId] = useState("");
  const [otHours, setOtHours] = useState("");
  const [isOtModalOpen, setIsOtModalOpen] = useState(false);
  const [isOtDashboardExpanded, setIsOtDashboardExpanded] = useState(false);

  // Set default employee for OT
  useEffect(() => {
    if (state.employees.length > 0 && !otEmpId) {
      setOtEmpId(state.employees[0].id);
    }
  }, [state.employees, otEmpId]);

  // Overtime to Leave Days helper calculations
  const getEmployeeOvertimeStats = (idToQuery: string) => {
    let totalOT = 0;
    Object.values(state.attendance).forEach(day => {
      const record = day[idToQuery];
      if (record && record.status === "Present" && record.outTime) {
        totalOT += calculateOvertimeHours(record.outTime, record.inTime || "06:00", record.status);
      }
    });

    const parsedTotal = parseFloat(totalOT.toFixed(1));
    const emp = state.employees.find(e => e.id === idToQuery);
    const converted = emp?.converted_ot_hours || 0;
    const remaining = Math.max(0, parsedTotal - converted);
    const extraLeave = emp?.extra_leave_days || 0;
    
    return {
      totalOT: parsedTotal,
      converted: parseFloat(converted.toFixed(1)),
      remaining: parseFloat(remaining.toFixed(1)),
      extraLeave: parseFloat(extraLeave.toFixed(1))
    };
  };

  const handleConvertOvertime = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otEmpId) {
      showToast("Please select an employee first.", "error");
      return;
    }
    const { remaining, extraLeave, converted } = getEmployeeOvertimeStats(otEmpId);
    const hoursToConvert = parseFloat(otHours);
    if (!hoursToConvert || hoursToConvert <= 0) {
      showToast("Please enter a valid positive number of hours to convert.", "error");
      return;
    }
    if (hoursToConvert > remaining) {
      showToast(`Requested ${hoursToConvert} hrs exceeds remaining convertible overtime balance of ${remaining} hrs.`, "error");
      return;
    }

    // Compensation logic: 8 hours = 1 leave day
    const addedLeaveDays = parseFloat((hoursToConvert / 8).toFixed(2));
    const newConvertedTotal = parseFloat((converted + hoursToConvert).toFixed(1));
    const newExtraTotal = parseFloat((extraLeave + addedLeaveDays).toFixed(2));

    onUpdateEmployee(otEmpId, {
      converted_ot_hours: newConvertedTotal,
      extra_leave_days: newExtraTotal
    });

    const emp = state.employees.find(x => x.id === otEmpId);
    showToast(`Successfully compensated ${hoursToConvert} overtime hours into +${addedLeaveDays} extra leave days for ${emp ? `${emp.first} ${emp.last}` : otEmpId}.`, "success");
    
    // Reset
    setOtHours("");
    setIsOtModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId || !start || !end || !approver) {
      showToast("Please fully define dates & authorize manager agent.", "error");
      return;
    }

    onApplyLeave({
      empId,
      type,
      start,
      end,
      days: calculatedDays,
      by: approver,
    });

    // Reset
    setStart("");
    setEnd("");
    setApprover("");
    setCalculatedDays(0);
    setIsOpen(false);
    showToast("Leave request authorized successfully.", "success");
  };

  const handleExport = () => {
    const headers = ["Employee", "Branch", "Classification Type", "Starts", "Ends", "Total Days", "Authorized Manager"];
    const rows = state.leave.map(l => {
      const emp = state.employees.find(e => e.id === l.empId);
      return [
        emp ? `${emp.first} ${emp.last}` : "Unknown Profile",
        emp ? emp.branch : "N/A",
        l.type,
        l.start,
        l.end,
        String(l.days),
        l.by
      ];
    });
    exportToCSV(headers, rows, "Leave_Ledger_Authorized");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          Leave Booking & tracking system
        </h3>
        <div className="flex gap-2.5">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-850 transition"
          >
            <Download className="h-4.5 w-4.5 text-slate-500" />
            Export CSV
          </button>
          <button
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-600 transition"
          >
            <Plus className="h-4.5 w-4.5" />
            Apply Leave
          </button>
        </div>
      </div>

      {/* OVERTIME TO LEAVE COMPENSATION BOARD */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <button
          type="button"
          onClick={() => setIsOtDashboardExpanded(!isOtDashboardExpanded)}
          className="w-full flex items-center justify-between p-5 text-left bg-gradient-to-r from-emerald-50/50 to-teal-50/25 dark:from-slate-850 dark:to-slate-800/10 transition hover:bg-emerald-50/80 dark:hover:bg-slate-800"
        >
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-emerald-500/15 p-2 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-850 dark:text-white">
                Overtime-to-Leave Compensation system
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Automatically convert logged overtime hours into accrued annual leave days.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-100/60 dark:bg-emerald-950/40 px-3 py-1 rounded-lg">
            {isOtDashboardExpanded ? "Hide Calculator" : "Show Calculator"}
          </span>
        </button>

        {isOtDashboardExpanded && (
          <div className="p-6 border-t border-slate-100 dark:border-slate-800/80 space-y-6">
            {/* Rule card explaining calculations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl bg-slate-50 border border-slate-150 p-4 dark:bg-slate-910 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-450">
                  <Clock className="h-3.5 w-3.5 text-emerald-500" />
                  Exchange standard
                </div>
                <p className="text-lg font-black font-mono text-slate-800 dark:text-white">8 OT Hours = 1 Day</p>
                <p className="text-[11px] text-slate-505 dark:text-slate-400">Standard legal conversion formula for holiday comp.</p>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-150 p-4 dark:bg-slate-910 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-450">
                  <Coins className="h-3.5 w-3.5 text-emerald-505" />
                  Benefits
                </div>
                <p className="text-lg font-black font-mono text-slate-800 dark:text-white">No salary reduction</p>
                <p className="text-[11px] text-slate-505 dark:text-slate-400">Toggles teammate annual holiday allowance dynamically.</p>
              </div>

              <div className="rounded-xl bg-emerald-500/5 border border-emerald-100/80 p-4 dark:border-emerald-950/20 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-emerald-650 dark:text-emerald-450 animate-pulse">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                  Fast Compensation
                </div>
                <button
                  type="button"
                  onClick={() => setIsOtModalOpen(true)}
                  className="w-full text-center rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2 shadow-sm transition cursor-pointer"
                >
                  Configure Compensation
                </button>
                <p className="text-[10px] text-slate-450 text-center">Process specific overtime hours manually.</p>
              </div>
            </div>

            {/* Overtime Ledger */}
            <div className="space-y-2">
              <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-450">
                Staff Overtime Balance Sheets
              </h5>
              <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-910/20">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 text-[10px] font-bold uppercase text-slate-500">
                        <th className="px-5 py-3">Representative Teammate</th>
                        <th className="px-5 py-3 text-center">Total OT Earned</th>
                        <th className="px-5 py-3 text-center">Already Converted</th>
                        <th className="px-5 py-3 text-center">Remaining Convertible</th>
                        <th className="px-5 py-3 text-center bg-emerald-50/30 dark:bg-emerald-950/10">Extra Leave Gained</th>
                        <th className="px-5 py-3 text-center">Quick Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {state.employees.map(emp => {
                        const { totalOT, converted, remaining, extraLeave } = getEmployeeOvertimeStats(emp.id);
                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/10 transition">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2.5">
                                <img src={emp.photo} alt={emp.first} className="h-7 w-7 rounded-full object-cover border border-slate-200 dark:border-slate-800" />
                                <div>
                                  <div className="font-bold text-slate-800 dark:text-white">{emp.first} {emp.last}</div>
                                  <div className="text-[9px] text-slate-400 tracking-wider uppercase">{emp.id} &bull; {emp.position}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">{totalOT} hrs</td>
                            <td className="px-5 py-3 text-center font-mono font-semibold text-slate-450">{converted} hrs</td>
                            <td className="px-5 py-3 text-center font-mono font-black text-slate-800 dark:text-white">
                              {remaining > 0 ? (
                                <span className="rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5">{remaining} hrs</span>
                              ) : (
                                <span className="text-slate-400">0.0</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-center font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/10 dark:bg-emerald-950/5">
                              {extraLeave > 0 ? `+${extraLeave} Days` : "None"}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <button
                                type="button"
                                disabled={remaining <= 0}
                                onClick={() => {
                                  setOtEmpId(emp.id);
                                  setOtHours(remaining.toString());
                                  setIsOtModalOpen(true);
                                }}
                                className="rounded px-2.5 py-1 text-[10px] font-bold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 hover:dark:bg-slate-650 transition disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                Convert
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leave Registry main list */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Leave Classification</th>
                <th className="px-6 py-4 text-center">Calendar Span Range</th>
                <th className="px-6 py-4 text-center">Accrued days</th>
                <th className="px-6 py-4">Authorizer Approver</th>
                <th className="px-6 py-4">Approval State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {state.leave.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 dark:text-slate-500">
                    No authorized leave requests currently logged in index.
                  </td>
                </tr>
              ) : (
                state.leave.map(lv => {
                  const emp = state.employees.find(e => e.id === lv.empId);
                  return (
                    <tr key={lv.id} className="hover:bg-slate-50/15 dark:hover:bg-slate-800/10 transition">
                      <td className="px-6 py-4.5">
                        <div 
                          className="flex items-center gap-3 cursor-pointer group/item"
                          onClick={() => emp && onSelectEmployee && onSelectEmployee(emp.id, "attendance")}
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
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100/80 px-3 py-1 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
                          <PlaneTakeoff className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                          {lv.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-slate-650 dark:text-slate-350">
                        {lv.start} <span className="text-slate-350 mx-1">to</span> {lv.end}
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-slate-900 dark:text-white">
                        {lv.days}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-600 dark:text-slate-400">
                        {lv.by}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 leading-none">
                          <ShieldCheck className="h-3 w-3" />
                          Approved
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

      {/* FORM MODAL: BOOK LEAVE */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Apply Leave Authorization"
        subtitle="Book vacations, sick intervals or unpaid leave periods for staff."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide dark:text-slate-300 mb-1">
              Select Employee
            </label>
            <select
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
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
              Leave Classification Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LeaveRequest["type"])}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
            >
              <option value="Annual Leave">Annual Leave</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Compassionate Leave">Compassionate Leave</option>
              <option value="Maternity Leave">Maternity Leave</option>
              <option value="Unpaid Leave">Unpaid Leave</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Start Date
              </label>
              <input
                type="date"
                required
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                End Date
              </label>
              <input
                type="date"
                required
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-550 uppercase mb-1">
                Days to Deduct
              </label>
              <input
                type="number"
                readOnly
                value={calculatedDays}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-500 dark:bg-slate-910 dark:border-slate-800 dark:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide dark:text-slate-300 mb-1">
                Authorized Manager
              </label>
              <input
                type="text"
                required
                placeholder="Manager full name"
                value={approver}
                onChange={(e) => setApprover(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
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
              Process Leave
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL FORM: OVERTIME COMPENSATION CONVERT */}
      <Modal
        isOpen={isOtModalOpen}
        onClose={() => setIsOtModalOpen(false)}
        title="Compensate Overtime with Leave Days"
        subtitle="Deduct available overtime hours from teammate balances to credit supplementary annual leave allowance (8 Hours = 1 Day)."
      >
        <form onSubmit={handleConvertOvertime} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide dark:text-slate-300 mb-1">
              Personnel Profile
            </label>
            <select
              value={otEmpId}
              onChange={(e) => {
                setOtEmpId(e.target.value);
                // Auto populate all remaining OT hours
                const { remaining } = getEmployeeOvertimeStats(e.target.value);
                setOtHours(remaining.toString());
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
            >
              {state.employees.map(e => {
                const { remaining } = getEmployeeOvertimeStats(e.id);
                return (
                  <option key={e.id} value={e.id}>
                    {e.first} {e.last} ({e.id}) - Balance: {remaining} hrs
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Hours to Convert
              </label>
              <input
                type="number"
                step="0.1"
                required
                min="0.1"
                placeholder="E.g., 8.0"
                value={otHours}
                onChange={(e) => setOtHours(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide dark:text-slate-300 mb-1">
                Accrued Leave Days
              </label>
              <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-emerald-600 dark:bg-slate-950 dark:border-slate-800 dark:text-emerald-400 font-black font-mono">
                {otHours && parseFloat(otHours) > 0 
                  ? `+${parseFloat((parseFloat(otHours) / 8).toFixed(2))} Days`
                  : "+0.00 Days"
                }
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 flex gap-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsOtModalOpen(false)}
              className="w-1/2 rounded-xl border border-slate-200 px-4 py-2 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 text-sm font-bold"
            >
              Dismiss
            </button>
            <button
              type="submit"
              className="w-1/2 rounded-xl bg-emerald-500 py-2 text-sm font-bold text-white shadow-md hover:bg-emerald-600 transition"
            >
              Execute Credit
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
