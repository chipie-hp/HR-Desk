/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Calendar,
  Clock,
  Sun,
  Moon,
  XCircle,
  Printer,
  Plus,
  Trash2,
  UserCheck,
  UserX,
  FileText,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Info
} from "lucide-react";
import { DatabaseState, Employee, RosterEntry, RosterAssignment } from "../types";

interface RosterProps {
  state: DatabaseState;
  onSaveRoster: (roster: RosterEntry) => void;
  onDeleteRoster: (rosterId: string) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
  selectedBranch: string;
}

// Simple date parser / formatter
const formatDateString = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  } catch {
    return dateStr;
  }
};

const getDatesInRange = (startStr: string, endStr: string) => {
  const dates: string[] = [];
  try {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const current = new Date(start);
    let iter = 0;
    while (current <= end && iter < 32) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
      iter++;
    }
  } catch (err) {
    console.error(err);
  }
  return dates;
};

export default function Roster({
  state,
  onSaveRoster,
  onDeleteRoster,
  showToast,
  selectedBranch,
}: RosterProps) {
  // Main view state
  const [activeRosterId, setActiveRosterId] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);

  // New Roster builder temporary state
  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState(() => {
    // Default to the 15th of current month
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-15`;
  });
  const [newEnd, setNewEnd] = useState(() => {
    // Default to 21st of current month (7 days range)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-21`;
  });

  // Local grid assignments state while editing a roster profile
  const [localAssignments, setLocalAssignments] = useState<RosterAssignment[]>([]);
  
  // Spotlight date for dashboard duty inspection
  const [spotlightDate, setSpotlightDate] = useState<string>("");

  // Filter candidates under currently active branch
  const branchEmployees = state.employees.filter(emp => !emp.isTerminated && (selectedBranch === "all" || emp.branch === selectedBranch));
  const activeRosters = (state.roster || []).filter(r => selectedBranch === "all" || r.branch === selectedBranch);

  // Default select first available roster
  useEffect(() => {
    if (activeRosters.length > 0 && !activeRosterId) {
      setActiveRosterId(activeRosters[0].id);
    }
  }, [activeRosters, activeRosterId]);

  // Loaded Active Roster
  const currentRoster = activeRosters.find(r => r.id === activeRosterId);

  // Load/synchronize spotlight date when current roster changes
  useEffect(() => {
    if (currentRoster) {
      setSpotlightDate(currentRoster.startDate);
    } else {
      setSpotlightDate("");
    }
  }, [currentRoster]);

  // Preset roster assignments helper
  const handlePresetAssignments = (pattern: "all-day" | "all-night" | "alternating" | "weekends-off", dates: string[]) => {
    const fresh: RosterAssignment[] = branchEmployees.map((emp, empIdx) => {
      const shifts: { [d: string]: "Day" | "Night" | "Off" } = {};
      dates.forEach((dStr, dIdx) => {
        const dObj = new Date(dStr);
        const isWeekend = dObj.getDay() === 0 || dObj.getDay() === 6; // Sun = 0, Sat = 6

        if (pattern === "weekends-off" && isWeekend) {
          shifts[dStr] = "Off";
        } else if (pattern === "all-day") {
          shifts[dStr] = "Day";
        } else if (pattern === "all-night") {
          shifts[dStr] = "Night";
        } else if (pattern === "alternating") {
          // Alternative pattern based on index combination
          shifts[dStr] = (empIdx + dIdx) % 2 === 0 ? "Day" : "Night";
        } else {
          // Default present weekend template
          shifts[dStr] = isWeekend ? "Off" : "Day";
        }
      });
      return { empId: emp.id, shifts };
    });
    setLocalAssignments(fresh);
    showToast(`Roster draft populated using ${pattern.replace('-', ' ')} template!`, "info");
  };

  // Switch on single cell ClickCycle
  const cycleShift = (empId: string, dateStr: string) => {
    setLocalAssignments(prev => prev.map(asg => {
      if (asg.empId === empId) {
        const cur = asg.shifts[dateStr] || "Day";
        let next: "Day" | "Night" | "Off" = "Day";
        if (cur === "Day") next = "Night";
        else if (cur === "Night") next = "Off";
        else next = "Day";
        return {
          ...asg,
          shifts: { ...asg.shifts, [dateStr]: next }
        };
      }
      return asg;
    }));
  };

  // Start designing a roster
  const handleInitCreateForm = () => {
    setIsCreating(true);
    setNewName(`Shift Roster Plan - ${new Date(newStart).toLocaleDateString("en-GB", { month: "short", year: "2-digit" })}`);
    const dates = getDatesInRange(newStart, newEnd);
    
    // Default assignment initial profiles
    const initial: RosterAssignment[] = branchEmployees.map((emp) => {
      const shifts: { [d: string]: "Day" | "Night" | "Off" } = {};
      dates.forEach(d => {
        // Default weekends (Sat/Sun) to Off, weekdays to Day
        const dayOfWeek = new Date(d).getDay();
        shifts[d] = (dayOfWeek === 0 || dayOfWeek === 6) ? "Off" : "Day";
      });
      return { empId: emp.id, shifts };
    });
    setLocalAssignments(initial);
  };

  const handleSaveDraft = () => {
    if (!newName.trim()) {
      showToast("Roster plan requires a descriptive title reference.", "error");
      return;
    }
    const dates = getDatesInRange(newStart, newEnd);
    if (dates.length === 0) {
      showToast("Invalid date coverage period.", "error");
      return;
    }

    const built: RosterEntry = {
      id: "RST-" + Date.now(),
      name: newName,
      startDate: newStart,
      endDate: newEnd,
      branch: selectedBranch !== "all" ? selectedBranch : (state.branches[0] || "Main Branch"),
      assignments: localAssignments
    };

    onSaveRoster(built);
    setActiveRosterId(built.id);
    setIsCreating(false);
    showToast("Operational duty roster published successfully!", "success");
  };

  // Generate a premium print dialog frame triggers
  const handleTriggerPrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Pop-up blocked! Please allow popups to open print-ready layout window.", "error");
      return;
    }

    if (!currentRoster) return;

    const rosterDates = getDatesInRange(currentRoster.startDate, currentRoster.endDate);
    
    // Build HTML tables
    let tableRowsHtml = "";
    currentRoster.assignments.forEach(asg => {
      const emp = state.employees.find(e => e.id === asg.empId);
      if (!emp) return;

      let colsHtml = `
        <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">
          ${emp.first} ${emp.last}
          <div style="font-size: 10px; color: #64748b; font-weight: normal;">${emp.position} | ${emp.dept}</div>
        </td>
      `;

      rosterDates.forEach(d => {
        const sh = asg.shifts[d] || "Off";
        let color = "#0f172a";
        let bg = "#f8fafc";
        if (sh === "Day") {
          bg = "#ecfdf5";
          color = "#065f46";
        } else if (sh === "Night") {
          bg = "#f5f3ff";
          color = "#5b21b6";
        } else if (sh === "Off") {
          bg = "#fef2f2";
          color = "#991b1b";
        }

        colsHtml += `
          <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center; font-weight: 800; background: ${bg}; color: ${color}; font-size: 11px;">
            ${sh.toUpperCase()}
          </td>
        `;
      });

      tableRowsHtml += `<tr>${colsHtml}</tr>`;
    });

    let headerColumnsHtml = `<th style="padding: 12px; border: 1px solid #e2e8f0; background: #f1f5f9; text-align: left; font-size: 11px; color: #475569;">Staff Teammate</th>`;
    rosterDates.forEach(d => {
      const formatted = formatDateString(d);
      const dayName = new Date(d).toLocaleDateString("en-GB", { weekday: "short" });
      headerColumnsHtml += `
        <th style="padding: 12px; border: 1px solid #e2e8f0; background: #f1f5f9; text-align: center; font-size: 11px; color: #475569;">
          <div>${dayName.toUpperCase()}</div>
          <div style="font-size: 9px; opacity: 0.8;">${formatted}</div>
        </th>
      `;
    });

    // Simple printable wrapper
    printWindow.document.write(`
      <html>
        <head>
          <title>Active Duty Shift Roster - ${currentRoster.name}</title>
          <style>
            body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #1e293b; background: white; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
            .badge { display: inline-block; background: #0f172a; color: white; font-size: 10px; padding: 4px 10px; border-radius: 9999px; font-weight: bold; text-transform: uppercase; margin-bottom: 15px; }
            h1 { margin: 0 0 8px 0; font-size: 24px; text-transform: uppercase; tracking: -0.5px; }
            .meta { font-size: 12px; color: #64748b; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .foot { margin-top: 60px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; border-t: 1px dashed #e2e8f0; padding-top: 20px; }
            .sign { border-top: 1px solid #64748b; width: 220px; text-align: center; padding-top: 8px; font-size: 11px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <span class="badge">${currentRoster.branch}</span>
            <h1>Operations Shift Roster Sheet</h1>
            <div class="meta">
              <strong>Roster run profile:</strong> ${currentRoster.name} | 
              <strong>Active period:</strong> ${currentRoster.startDate} to ${currentRoster.endDate}
            </div>
          </div>

          <table>
            <thead>
              <tr>${headerColumnsHtml}</tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <div style="margin-top: 100px; display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">System printed time: ${new Date().toLocaleString()}</div>
              <div style="font-size: 10px; color: #94a3b8;">Corporate HR & Command Administration Dashboard</div>
            </div>
            <div class="sign">
              Unit Supervisor Authorization Signature
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Spotlights analysis
  const spotlightDayOfWeek = spotlightDate ? new Date(spotlightDate).toLocaleDateString("en-GB", { weekday: "long" }) : "";
  const spotlightAssignments = currentRoster ? currentRoster.assignments.map(asg => {
    const emp = state.employees.find(e => e.id === asg.empId);
    const shStr = asg.shifts[spotlightDate] || "Off";
    return { emp, shift: shStr };
  }).filter(item => item.emp !== undefined) : [];

  const onDutyDay = spotlightAssignments.filter(a => a.shift === "Day");
  const onDutyNight = spotlightAssignments.filter(a => a.shift === "Night");
  const offDuty = spotlightAssignments.filter(a => a.shift === "Off");

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-900">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-5 w-5 text-emerald-500" />
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 dark:text-slate-500 font-bold">
              Shift Scheduling Terminal
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Workforce Shifts & Roster Builder
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-600 transition"
            >
              <Plus className="h-4 w-4" />
              CREATE REGISTRY ROSTER
            </button>
          )}
        </div>
      </div>

      {/* CREATION WORKSPACE DRAWER / BOARD */}
      {isCreating && (
        <div className="rounded-2xl border-2 border-emerald-500/20 bg-emerald-500/[0.02] p-6 space-y-6 dark:border-emerald-500/10">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <Sparkles className="h-4.5 w-4.5 animate-pulse" />
              </span>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                  Configure Duty Shift Parameters
                </h3>
                <p className="text-[11px] text-slate-500 uppercase font-mono mt-0.5">
                  Roster assignments draft builder for branch workspace
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCreating(false)}
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 transition"
              >
                Cancel Draft
              </button>
              <button
                onClick={handleSaveDraft}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-600 transition"
              >
                Publish Roster
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                Draft Sheet Description
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Description, e.g. Operations May Week 3 Roster"
                className="w-full rounded-xl border border-slate-250 bg-white p-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                Shift Period start
              </label>
              <input
                type="date"
                value={newStart}
                onChange={(e) => {
                  setNewStart(e.target.value);
                  setNewName(`Shift Roster Plan - ${new Date(e.target.value).toLocaleDateString("en-GB", { month: "short", year: "2-digit" })}`);
                }}
                className="w-full rounded-xl border border-slate-250 bg-white p-3 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                Shift Period end
              </label>
              <input
                type="date"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="w-full rounded-xl border border-slate-250 bg-white p-3 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="bg-slate-100 p-3 rounded-xl dark:bg-slate-900/60 flex items-center justify-between flex-wrap gap-2.5">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-450 uppercase flex items-center gap-1">
              <Info className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              Tip: Set date range above & then click on draft grid blocks to cycle through: Day (D) → Night (N) → Off (O)
            </span>
            <button
              onClick={handleInitCreateForm}
              className="text-[11px] font-extrabold uppercase px-3 py-1.5 bg-slate-200 text-slate-700 dark:bg-slate-850 dark:text-slate-300 rounded-lg hover:bg-slate-300 cursor-pointer transition-colors"
            >
              Regenerate grid rows
            </button>
          </div>

          {/* Quick presets list */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mr-2">
              Populate Draft Patterns:
            </span>
            {[
              { id: "all-day", label: "all day shift", pattern: "all-day" },
              { id: "all-night", label: "all night shift", pattern: "all-night" },
              { id: "alternating", label: "alternating roster", pattern: "alternating" },
              { id: "weekends-off", label: "Standard Workdays (Weekends Off)", pattern: "weekends-off" },
            ].map(pres => (
              <button
                key={pres.id}
                onClick={() => handlePresetAssignments(pres.pattern as any, getDatesInRange(newStart, newEnd))}
                className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600 shadow-sm hover:bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 cursor-pointer"
              >
                {pres.label.toUpperCase()}
              </button>
            ))}
          </div>

          {/* SPREADSHEET-LIKE EDIT GRID */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4 text-xs font-black uppercase text-slate-500 dark:text-slate-400 w-52 shrink-0 sticky left-0 bg-slate-50 dark:bg-slate-900 z-10">
                      Staff Member
                    </th>
                    {getDatesInRange(newStart, newEnd).map(d => {
                      const dayName = new Date(d).toLocaleDateString("en-GB", { weekday: "short" });
                      return (
                        <th key={d} className="p-4 text-xs font-black uppercase text-slate-500 dark:text-slate-400 text-center min-w-[70px]">
                          <div>{dayName.toUpperCase()}</div>
                          <div className="text-[9px] opacity-60 mt-0.5">{formatDateString(d)}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-900">
                  {branchEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={getDatesInRange(newStart, newEnd).length + 1} className="py-12 text-center text-slate-400">
                        No employees registered in this branch workspace to schedule.
                      </td>
                    </tr>
                  ) : (
                    branchEmployees.map(emp => {
                      const empAsg = localAssignments.find(a => a.empId === emp.id);
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                          <td className="p-4 font-bold text-xs sticky left-0 bg-white dark:bg-slate-950 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                            <span className="block text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {emp.first} {emp.last}
                            </span>
                            <span className="block text-[10px] text-slate-400 font-medium whitespace-nowrap">
                              {emp.position}
                            </span>
                          </td>
                          {getDatesInRange(newStart, newEnd).map(d => {
                            const curShift = empAsg?.shifts[d] || "Off";
                            let cellStyle = "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-450";
                            let icon = <XCircle className="h-3 w-3 shrink-0" />;

                            if (curShift === "Day") {
                              cellStyle = "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-500/25";
                              icon = <Sun className="h-3 w-3 shrink-0" />;
                            } else if (curShift === "Night") {
                              cellStyle = "bg-purple-500/10 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400 border border-purple-500/25";
                              icon = <Moon className="h-3 w-3 shrink-0" />;
                            }

                            return (
                              <td key={d} className="p-2 text-center align-middle">
                                <button
                                  type="button"
                                  onClick={() => cycleShift(emp.id, d)}
                                  className={`w-full flex flex-col items-center justify-center p-2 rounded-xl text-[10px] font-extrabold cursor-pointer transition ${cellStyle}`}
                                >
                                  {icon}
                                  <span className="mt-1 font-mono">{curShift.toUpperCase()}</span>
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* HISTORIC PLANS LIST & ACTIVE INSPECTOR */}
      {!isCreating && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: ROSTERS DIRECTORY ARCHIVE */}
          <div className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl border border-slate-150 bg-white p-5 dark:border-slate-900 dark:bg-slate-900/60 shadow-sm">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">
                Shift Roster Archive Runs
              </h3>

              {activeRosters.length === 0 ? (
                <div className="py-12 text-center">
                  <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-xs text-slate-400 font-semibold uppercase leading-none">No Published Roster Runs</p>
                  <button
                    onClick={() => setIsCreating(true)}
                    className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500 hover:underline uppercase"
                  >
                    Draft First Roster →
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeRosters.map(rt => (
                    <div
                      key={rt.id}
                      onClick={() => setActiveRosterId(rt.id)}
                      className={`group flex items-center justify-between p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 ${
                        activeRosterId === rt.id
                          ? "bg-slate-900 border-slate-900 text-white dark:bg-slate-950 dark:border-slate-800"
                          : "bg-slate-50/50 hover:bg-slate-50 border-slate-100 hover:border-slate-200 dark:bg-slate-950/20 dark:border-slate-900 dark:hover:bg-slate-900"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <h4 className="text-xs font-bold truncate leading-snug">
                          {rt.name}
                        </h4>
                        <div className={`text-[10px] font-mono mt-1 ${activeRosterId === rt.id ? "text-slate-300" : "text-slate-400"}`}>
                          📅 {formatDateString(rt.startDate)} to {formatDateString(rt.endDate)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Remove roster run "${rt.name}"?`)) {
                              onDeleteRoster(rt.id);
                              showToast("Roster deleted from registry.", "info");
                              if (activeRosterId === rt.id) {
                                setActiveRosterId("");
                              }
                            }
                          }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            activeRosterId === rt.id
                              ? "text-slate-400 hover:text-rose-400 hover:bg-white/10"
                              : "text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: MAIN ROSTER GRID SHEETS VIEW & DAY INSPECTOR */}
          <div className="lg:col-span-8 space-y-6">
            {!currentRoster ? (
              <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center dark:border-slate-900 dark:bg-slate-900/20">
                <FileText className="h-10 w-10 text-slate-300 mx-auto mb-4" />
                <h4 className="text-sm font-extrabold uppercase text-slate-500 dark:text-slate-450 mb-1">
                  No Active Roster Profile selected
                </h4>
                <p className="text-xs text-slate-410 leading-relaxed max-w-xs mx-auto">
                  Click on an archived schedule on the left panel or compile a new weekly shift sheet above.
                </p>
              </div>
            ) : (
              <>
                {/* GRID WORKBOARD VIEW */}
                <div className="rounded-2xl border border-slate-100 bg-white p-6 dark:border-slate-900 dark:bg-slate-900 shadow-sm space-y-6">
                  
                  {/* Title details & export button bars */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-50 pb-4 dark:border-slate-800/60">
                    <div>
                      <div className="inline-flex items-center gap-1 rounded bg-slate-900 px-2 py-0.5 text-[9px] font-bold text-white dark:bg-slate-800 uppercase tracking-widest mb-1">
                        Active Roster Registry
                      </div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase">
                        {currentRoster.name}
                      </h3>
                      <p className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wider">
                        Active Coverage: {currentRoster.startDate} → {currentRoster.endDate}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleTriggerPrint}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-250 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 shadow-sm hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-350 transition cursor-pointer"
                      >
                        <Printer className="h-4 w-4" />
                        PRINT / SAVE PDF ROSTER
                      </button>
                    </div>
                  </div>

                  {/* Period Calendar Trackbar */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3.5">
                      Inspect Shifts Day-by-Day (Click to Filter lists below)
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                      {getDatesInRange(currentRoster.startDate, currentRoster.endDate).map(d => {
                        const dayObj = new Date(d);
                        const isTodayActive = spotlightDate === d;
                        const dayLabel = dayObj.toLocaleDateString("en-GB", { weekday: "short" });
                        
                        // Count duty shifts for preview metrics
                        const dayStats = currentRoster.assignments.map(a => a.shifts[d] || "Off");
                        const activeCount = dayStats.filter(s => s !== "Off").length;

                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setSpotlightDate(d)}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl transition cursor-pointer ${
                              isTodayActive
                                ? "bg-emerald-500 border border-emerald-500 text-white shadow-md shadow-emerald-500/10"
                                : "bg-slate-50 hover:bg-slate-100 border border-slate-150 text-slate-800 dark:bg-slate-950 dark:border-slate-850 dark:text-slate-300 dark:hover:bg-slate-900"
                            }`}
                          >
                            <span className="text-[10px] font-black uppercase tracking-wide">{dayLabel}</span>
                            <span className="text-xs font-extrabold mt-1">{formatDateString(d)}</span>
                            <span className={`text-[8px] mt-1.5 rounded-full px-1.5 dark:bg-opacity-50 font-semibold leading-tight capitalize ${
                              isTodayActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}>
                              {activeCount} On Duty
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* STATIC VIEW SHEET PREVIEW GRID */}
                  <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/20">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
                            <th className="p-3 text-left font-bold text-[10px] uppercase text-slate-400 dark:text-slate-550 w-44 shrink-0">Employee</th>
                            {getDatesInRange(currentRoster.startDate, currentRoster.endDate).map(d => (
                              <th key={d} className="p-3 text-center font-bold text-[10px] uppercase text-slate-400 dark:text-slate-550 min-w-[50px]">
                                {formatDateString(d)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 dark:divide-slate-900 text-xs">
                          {currentRoster.assignments.map(asg => {
                            const emp = state.employees.find(e => e.id === asg.empId);
                            if (!emp) return null;
                            return (
                              <tr key={asg.empId} className="hover:bg-white dark:hover:bg-slate-900/40">
                                <td className="p-3 font-semibold text-slate-755 dark:text-slate-200">
                                  {emp.first} {emp.last}
                                </td>
                                {getDatesInRange(currentRoster.startDate, currentRoster.endDate).map(d => {
                                  const shiftObj = asg.shifts[d] || "Off";
                                  let cellBg = "bg-slate-100/50 text-slate-400 dark:bg-slate-900/40 dark:text-slate-600";
                                  if (shiftObj === "Day") {
                                    cellBg = "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-100/10 dark:text-emerald-450 font-bold";
                                  } else if (shiftObj === "Night") {
                                    cellBg = "bg-purple-500/10 text-purple-600 dark:bg-purple-100/10 dark:text-purple-450 font-bold";
                                  }
                                  return (
                                    <td key={d} className="p-2 text-center whitespace-nowrap">
                                      <span className={`inline-block rounded-lg px-2 py-0.5 text-[10px] tracking-wide font-mono ${cellBg}`}>
                                        {shiftObj === "Day" ? "☀️ DAY" : shiftObj === "Night" ? "🌙 NIGHT" : "🛌 OFF"}
                                      </span>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* DETAILED DAILY INSPECTOR SPOTLIGHT DASHBOARD */}
                {spotlightDate && (
                  <div className="rounded-2xl border border-slate-100 bg-white p-6 dark:border-slate-900 dark:bg-slate-900 shadow-sm space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-4 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4.5 w-4.5 text-emerald-500" />
                        <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          Active Duty Sheet: {spotlightDayOfWeek.toUpperCase()} | {formatDateString(spotlightDate)}
                        </h4>
                      </div>
                      <span className="font-mono text-[9px] uppercase font-bold bg-slate-100 text-slate-550 dark:bg-slate-950 dark:text-slate-400 px-2 py-0.5 rounded">
                        Shift details report
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* COLUMN 1: DAY SHIFT */}
                      <div className="rounded-xl bg-emerald-500/[0.02] border border-emerald-500/10 p-4 space-y-4">
                        <div className="flex items-center gap-2 border-b border-emerald-500/10 pb-2">
                          <Sun className="h-4 w-4 text-emerald-555" />
                          <h5 className="text-xs font-black text-emerald-800 dark:text-emerald-350 uppercase">
                            Day Duty ({onDutyDay.length})
                          </h5>
                        </div>

                        {onDutyDay.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic dark:text-slate-500">No employees assigned to day shift.</p>
                        ) : (
                          <div className="space-y-2.5">
                            {onDutyDay.map(({ emp }) => (
                              <div key={emp?.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-100 dark:bg-slate-950/40 dark:border-slate-850">
                                <img
                                  src={emp?.photo}
                                  alt=""
                                  className="h-6 w-6 rounded-full bg-slate-100 shrink-0 select-none referrerPolicy='no-referrer'"
                                />
                                <div className="min-w-0">
                                  <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate leading-none">
                                    {emp?.first} {emp?.last}
                                  </div>
                                  <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 leading-none mt-0.5 block truncate">
                                    {emp?.position}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* COLUMN 2: NIGHT SHIFT */}
                      <div className="rounded-xl bg-purple-500/[0.02] border border-purple-500/10 p-4 space-y-4">
                        <div className="flex items-center gap-2 border-b border-purple-500/10 pb-2">
                          <Moon className="h-4 w-4 text-purple-555" />
                          <h5 className="text-xs font-black text-purple-800 dark:text-purple-350 uppercase">
                            Night Duty ({onDutyNight.length})
                          </h5>
                        </div>

                        {onDutyNight.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic dark:text-slate-500">No employees assigned to night shift.</p>
                        ) : (
                          <div className="space-y-2.5">
                            {onDutyNight.map(({ emp }) => (
                              <div key={emp?.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-100 dark:bg-slate-950/40 dark:border-slate-850">
                                <img
                                  src={emp?.photo}
                                  alt=""
                                  className="h-6 w-6 rounded-full bg-slate-100 shrink-0 select-none referrerPolicy='no-referrer'"
                                />
                                <div className="min-w-0">
                                  <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate leading-none">
                                    {emp?.first} {emp?.last}
                                  </div>
                                  <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 leading-none mt-0.5 block truncate">
                                    {emp?.position}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* COLUMN 3: OFF DAYS */}
                      <div className="rounded-xl bg-red-500/[0.02] border border-red-500/10 p-4 space-y-4">
                        <div className="flex items-center gap-2 border-b border-red-500/10 pb-2">
                          <UserX className="h-4 w-4 text-red-555" />
                          <h5 className="text-xs font-black text-rose-800 dark:text-rose-350 uppercase">
                            Scheduled Off ({offDuty.length})
                          </h5>
                        </div>

                        {offDuty.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic dark:text-slate-500">No employees on off schedule.</p>
                        ) : (
                          <div className="space-y-2.5">
                            {offDuty.map(({ emp }) => (
                              <div key={emp?.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-100 dark:bg-slate-950/40 dark:border-slate-850">
                                <img
                                  src={emp?.photo}
                                  alt=""
                                  className="h-6 w-6 rounded-full bg-slate-100 shrink-0 select-none referrerPolicy='no-referrer'"
                                />
                                <div className="min-w-0">
                                  <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate leading-none">
                                    {emp?.first} {emp?.last}
                                  </div>
                                  <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 leading-none mt-0.5 block truncate">
                                    {emp?.position}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
