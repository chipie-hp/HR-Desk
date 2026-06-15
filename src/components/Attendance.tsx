/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Check, 
  CheckSquare, 
  Save, 
  Users, 
  Calendar, 
  AlertCircle, 
  Search, 
  Download, 
  AlertTriangle, 
  UserCheck, 
  UserX, 
  Clock, 
  TrendingUp, 
  FileSpreadsheet,
  Gauge
} from "lucide-react";
import { DatabaseState, AttendanceRecord, AttendanceDatabase, Employee, DeductionApproval, DocumentRecord } from "../types";
import { calculateOvertimeHours, exportToCSV } from "../utils";
import { ConfirmModal, Modal } from "./Modals";

interface AttendanceProps {
  state: DatabaseState;
  onSaveAttendance: (date: string, dayAttendance: { [empId: string]: AttendanceRecord }) => void;
  onUpdateFullAttendance?: (updatedAttendance: AttendanceDatabase) => void;
  onApplyPenalty: (penalty: Omit<DeductionApproval, "id">) => void;
  onSelectEmployee?: (empId: string, dossierTab?: "overview" | "financials" | "attendance" | "compliance") => void;
  onAddDocument?: (doc: Omit<DocumentRecord, "id">) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function Attendance({
  state,
  onSaveAttendance,
  onUpdateFullAttendance,
  onApplyPenalty,
  onSelectEmployee,
  onAddDocument,
  showToast,
}: AttendanceProps) {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [deptFilter, setDeptFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Navigation tab for Shift category view (Day, Night, Off, Absentees)
  const [activeShiftTab, setActiveShiftTab] = useState<"Day" | "Night" | "Off" | "Absentees">("Day");

  // Swap / Exchange Shift controls
  const [isExchangeOpen, setIsExchangeOpen] = useState(false);
  const [exchangeEmpId, setExchangeEmpId] = useState("");
  const [exchangeTargetEmpId, setExchangeTargetEmpId] = useState("");

  // Temporary local ledger state before saving
  const [localAttendance, setLocalAttendance] = useState<{ [empId: string]: AttendanceRecord }>({});

  // Confirmations for statutory penalties sweep
  const [pendingPenalties, setPendingPenalties] = useState<{ employee: Employee; absences: number }[]>([]);
  const [currentPenaltyIndex, setCurrentPenaltyIndex] = useState(-1);
  const [penaltyReason, setPenaltyReason] = useState("Excessive absenteeism");

  // Load ledger on date change representing on-duty rosters
  useEffect(() => {
    const existing = state.attendance[date];
    const newLocal: { [empId: string]: AttendanceRecord } = {};

    state.employees.forEach(emp => {
      if (existing && existing[emp.id]) {
        newLocal[emp.id] = { ...existing[emp.id] };
        if (!newLocal[emp.id].shift) {
          newLocal[emp.id].shift = "Day";
        }
      } else {
        // Fallback or scan active rosters overlapping the date
        let rosterShift: "Day" | "Night" | "Off" = "Day";
        const overlappingRosters = (state.roster || []).filter(r => 
          date >= r.startDate && date <= r.endDate
        );
        for (const roster of overlappingRosters) {
          const assignment = roster.assignments.find(a => a.empId === emp.id);
          if (assignment && assignment.shifts?.[date]) {
            rosterShift = assignment.shifts[date];
            break;
          }
        }

        newLocal[emp.id] = {
          status: rosterShift === "Off" ? "Leave" : "Present",
          inTime: rosterShift === "Night" ? "18:00" : "06:00",
          outTime: rosterShift === "Night" ? "05:00" : "17:00",
          shift: rosterShift,
        };
      }
    });

    setLocalAttendance(newLocal);
  }, [date, state.attendance, state.employees, state.roster]);

  // Dynamic Worked Hours calculator logic (Actual hours between check-in and out, deducting 1 hr lunch if >= 5 hours)
  const calculateWorkedHours = (status: string, inTime: string, outTime: string): number => {
    if (status !== "Present") return 0;
    if (!inTime || !outTime) return 0;

    const [inH, inM] = inTime.split(":").map(Number);
    const [outH, outM] = outTime.split(":").map(Number);

    const inTotalMins = inH * 60 + inM;
    const outTotalMins = outH * 60 + outM;
    const diffMins = outTotalMins - inTotalMins;

    if (diffMins <= 0) return 0;

    let totalHours = diffMins / 60;
    // Deduct standard lunch break of 1 hour if the shift exceeds 5 hours
    if (totalHours >= 5) {
      totalHours -= 1.0;
    }

    return parseFloat(Math.max(0, totalHours).toFixed(1));
  };

  const handleStatusChange = (empId: string, status: AttendanceRecord["status"]) => {
    setLocalAttendance(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        status,
        // Preset check times elegantly if absent/sick/leave
        inTime: status === "Absent" ? "00:00" : status === "Sick" || status === "Leave" ? "00:00" : prev[empId]?.inTime || "06:00",
        outTime: status === "Absent" ? "00:00" : status === "Sick" || status === "Leave" ? "00:00" : prev[empId]?.outTime || "17:00",
        sickSelectedAt: status === "Sick" ? new Date().toISOString() : prev[empId]?.sickSelectedAt,
        autoDeducted: status === "Sick" ? false : prev[empId]?.autoDeducted
      }
    }));
  };

  const handleShiftChange = (empId: string, newShift: "Day" | "Night" | "Off") => {
    setLocalAttendance(prev => {
      const current = prev[empId] || { status: "Present", inTime: "06:00", outTime: "17:00" };
      // Preset default hours for each shift
      let defaultIn = current.inTime;
      let defaultOut = current.outTime;
      if (newShift === "Night") {
        defaultIn = "18:00";
        defaultOut = "05:00";
      } else if (newShift === "Day") {
        defaultIn = "06:00";
        defaultOut = "17:00";
      } else if (newShift === "Off") {
        defaultIn = "00:00";
        defaultOut = "00:00";
      }
      return {
        ...prev,
        [empId]: {
          ...current,
          shift: newShift,
          inTime: defaultIn,
          outTime: defaultOut,
          status: newShift === "Off" ? "Leave" : current.status === "Leave" ? "Present" : current.status
        }
      };
    });
  };

  const initiateExchange = (empId: string) => {
    setExchangeEmpId(empId);
    setExchangeTargetEmpId("");
    setIsExchangeOpen(true);
  };

  const handleConfirmExchange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exchangeEmpId || !exchangeTargetEmpId) return;

    setLocalAttendance(prev => {
      const empARec = prev[exchangeEmpId] || { status: "Present", inTime: "06:00", outTime: "17:00", shift: "Day" };
      const empBRec = prev[exchangeTargetEmpId] || { status: "Present", inTime: "06:00", outTime: "17:00", shift: "Day" };

      const shiftA = empARec.shift || "Day";
      const shiftB = empBRec.shift || "Day";

      // Swapping values between peer employees
      const updatedARec = {
        ...empARec,
        shift: shiftB,
        inTime: shiftB === "Night" ? "18:00" : shiftB === "Day" ? "06:00" : "00:00",
        outTime: shiftB === "Night" ? "05:00" : shiftB === "Day" ? "17:00" : "00:00",
        status: shiftB === "Off" ? "Leave" : empARec.status === "Leave" ? "Present" : empARec.status
      };

      const updatedBRec = {
        ...empBRec,
        shift: shiftA,
        inTime: shiftA === "Night" ? "18:00" : shiftA === "Day" ? "06:00" : "00:00",
        outTime: shiftA === "Night" ? "05:00" : shiftA === "Day" ? "17:00" : "00:00",
        status: shiftA === "Off" ? "Leave" : empBRec.status === "Leave" ? "Present" : empBRec.status
      };

      return {
        ...prev,
        [exchangeEmpId]: updatedARec,
        [exchangeTargetEmpId]: updatedBRec
      };
    });

    const empA = state.employees.find(e => e.id === exchangeEmpId);
    const empB = state.employees.find(e => e.id === exchangeTargetEmpId);
    showToast(`Atomic shift swap confirmed: ${empA?.first || "Staff A"} exchanged with ${empB?.first || "Staff B"}.`, "success");

    setIsExchangeOpen(false);
    setExchangeEmpId("");
    setExchangeTargetEmpId("");
  };

  const handleTimeChange = (empId: string, field: "inTime" | "outTime", value: string) => {
    setLocalAttendance(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        [field]: value,
      }
    }));
  };

  const handleNoteChange = (empId: string, note: string) => {
    setLocalAttendance(prev => ({
      ...prev,
      [empId]: {
        ...prev[empId],
        note
      }
    }));
  };

  const handleMarkAllPresent = () => {
    const updated = { ...localAttendance };
    filteredEmployees.forEach(emp => {
      updated[emp.id] = {
        status: "Present",
        inTime: "06:00",
        outTime: "17:00",
      };
    });
    setLocalAttendance(updated);
    showToast("All visible staff in filtered scope toggled to Present status.", "info");
  };

  const handleSave = () => {
    // Save to global storage State
    onSaveAttendance(date, localAttendance);
    showToast(`Daily attendance ledger successfully saved for date ${date}.`, "success");

    // Launch proactive absence penalty compliance sweep check
    checkPenalties();
  };

  const handleExportAttendance = () => {
    const headers = ["Employee ID", "Employee Name", "Branch Location", "Department Module", "Attendance Date", "Registry Status", "Check-In Time", "Check-Out Time", "Actual Worked Hours", "Overtime (Hrs)"];
    const rows = filteredEmployees.map(emp => {
      const record = localAttendance[emp.id] || { status: "Present", inTime: "06:00", outTime: "17:00" };
      const hours = calculateWorkedHours(record.status, record.inTime, record.outTime);
      const ot = calculateOvertimeHours(record.outTime, record.inTime, record.status);
      return [
        emp.id,
        `${emp.first} ${emp.last}`,
        emp.branch,
        emp.dept,
        date,
        record.status,
        record.inTime,
        record.outTime,
        hours.toFixed(1),
        ot.toFixed(1)
      ];
    });

    exportToCSV(headers, rows, `Corporate_Attendance_Ledger_${date}`);
    showToast(`Attendance spreadsheet table exported for ${date}.`, "success");
  };

  // Automated sweep for employees with 5+ cumulative monthly absences without penalty
  const checkPenalties = () => {
    const activeMonth = date.slice(0, 7); // YYYY-MM
    const matches: { employee: Employee; absences: number }[] = [];

    state.employees.forEach(emp => {
      let absences = 0;
      Object.keys(state.attendance).forEach(historyDate => {
        if (historyDate.startsWith(activeMonth)) {
          if (state.attendance[historyDate]?.[emp.id]?.status === "Absent") {
            absences++;
          }
        }
      });

      // Account for active local edit if it's high
      if (date.startsWith(activeMonth) && localAttendance[emp.id]?.status === "Absent") {
        absences++;
      }

      if (absences >= 5) {
        const alreadyPenalized = state.deductionApprovals.some(
          d => d.empId === emp.id && d.date.startsWith(activeMonth)
        );
        if (!alreadyPenalized) {
          matches.push({ employee: emp, absences });
        }
      }
    });

    if (matches.length > 0) {
      setPendingPenalties(matches);
      setCurrentPenaltyIndex(0);
      setPenaltyReason("Excessive monthly absenteeism (5+ days absent threshold check)");
    }
  };

  const handleConfirmPenalty = () => {
    if (currentPenaltyIndex === -1 || !pendingPenalties[currentPenaltyIndex]) return;
    const item = pendingPenalties[currentPenaltyIndex];

    onApplyPenalty({
      empId: item.employee.id,
      date: date,
      reason: penaltyReason,
      amount: Math.round(item.employee.salary * 0.05), // Statutory 5% penalization deduction
    });

    showToast(`Deduction penalty successfully applied for ${item.employee.first} ${item.employee.last} (5% Salary deduction).`, "success");
    advancePenalties();
  };

  const handleDeclinePenalty = () => {
    showToast(`Bypassed penalty sweep action for ${pendingPenalties[currentPenaltyIndex]?.employee.first || "employee"}.`, "info");
    advancePenalties();
  };

  const advancePenalties = () => {
    if (currentPenaltyIndex < pendingPenalties.length - 1) {
      setCurrentPenaltyIndex(prev => prev + 1);
    } else {
      setPendingPenalties([]);
      setCurrentPenaltyIndex(-1);
    }
  };

  // Automated medical proof sweep for sick leaves
  const runAutoDeductionSweep = () => {
    if (!onUpdateFullAttendance) return;
    let dbUpdated = false;
    const fullAttendanceCopy = JSON.parse(JSON.stringify(state.attendance));

    Object.keys(fullAttendanceCopy).forEach(dateStr => {
      const day = fullAttendanceCopy[dateStr] || {};
      let dayUpdated = false;

      Object.keys(day).forEach(empId => {
        const record = day[empId];
        if (record && record.status === "Sick" && !record.autoDeducted) {
          // Check proof
          const hasProof = state.documents.some(doc => 
            doc.empId === empId && 
            (doc.type === "Health Passport Proof" || 
             doc.type === "Medical Health Assessment Form" || 
             doc.name.toLowerCase().includes("health passport") ||
             doc.name.toLowerCase().includes("medical proof"))
          );

          if (!hasProof) {
            let isOverdue = false;
            // Mode 1: Real-time 48h check based on sickSelectedAt
            if (record.sickSelectedAt) {
              const elapsedMs = Date.now() - new Date(record.sickSelectedAt).getTime();
              isOverdue = elapsedMs >= 48 * 60 * 60 * 1000;
            } else {
              // Mode 2: Calendar date check: if selected view date is >= 2 days in the future relative to the attendance record date
              const recordTime = new Date(dateStr).getTime();
              const currentTime = new Date(date).getTime();
              const diffMs = currentTime - recordTime;
              isOverdue = diffMs >= 48 * 60 * 60 * 1000;
            }

            if (isOverdue) {
              day[empId] = {
                ...record,
                status: "Absent",
                autoDeducted: true
              };
              dayUpdated = true;
              dbUpdated = true;

              const emp = state.employees.find(e => e.id === empId);
              const name = emp ? `${emp.first} ${emp.last}` : empId;
              showToast(`no medical proof was presented for ${name} - auto-deducted as absent.`, "error");
            }
          }
        }
      });

      if (dayUpdated) {
        fullAttendanceCopy[dateStr] = day;
      }
    });

    if (dbUpdated) {
      onUpdateFullAttendance(fullAttendanceCopy);
    }
  };

  // Run the sweep automatically when component parameters or records change
  useEffect(() => {
    runAutoDeductionSweep();
  }, [date, state.documents, state.attendance]);

  const getSickRecordsPendingOrOverdue = () => {
    const list: {
      dateStr: string;
      emp: Employee;
      record: AttendanceRecord;
      isOverdue: boolean;
      hoursPassed: number;
    }[] = [];

    Object.keys(state.attendance).forEach(dateStr => {
      const day = state.attendance[dateStr] || {};
      Object.keys(day).forEach(empId => {
        const record = day[empId];
        if (record && record.status === "Sick") {
          const emp = state.employees.find(e => e.id === empId);
          if (emp) {
            const hasProof = state.documents.some(doc => 
              doc.empId === empId && 
              (doc.type === "Health Passport Proof" || 
               doc.type === "Medical Health Assessment Form" || 
               doc.name.toLowerCase().includes("health passport") ||
               doc.name.toLowerCase().includes("medical proof"))
            );

            if (!hasProof && !record.autoDeducted) {
              let hoursPassed = 0;
              if (record.sickSelectedAt) {
                hoursPassed = (Date.now() - new Date(record.sickSelectedAt).getTime()) / (1000 * 60 * 60);
              } else {
                const diffTime = Math.abs(new Date(date).getTime() - new Date(dateStr).getTime());
                hoursPassed = diffTime / (1000 * 60 * 60);
              }

              const isOverdue = hoursPassed >= 48;

              list.push({
                dateStr,
                emp,
                record,
                isOverdue,
                hoursPassed
              });
            }
          }
        }
      });
    });

    return list;
  };

  const pendingSickAudits = getSickRecordsPendingOrOverdue();

  // Simulation handler to instantly make a record overdue
  const handleSimulateLapse = (dateStr: string, empId: string) => {
    if (!onUpdateFullAttendance) return;
    const fullAttendanceCopy = JSON.parse(JSON.stringify(state.attendance));
    if (fullAttendanceCopy[dateStr]?.[empId]) {
      // Set to 49 hours ago so it behaves exactly as if 48+ hours have lapsed 
      const ancientTime = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();
      fullAttendanceCopy[dateStr][empId].sickSelectedAt = ancientTime;
      onUpdateFullAttendance(fullAttendanceCopy);
      showToast(`Simulated 48-hour time lapse for ${state.employees.find(e => e.id === empId)?.first || empId}. Run sweep or scroll to view!`, "info");
    }
  };

  const handleApproveMedicalReport = (empId: string) => {
    if (!onAddDocument) {
      showToast("Document archiving function is currently unavailable.", "error");
      return;
    }
    const emp = state.employees.find(e => e.id === empId);
    const empName = emp ? `${emp.first} ${emp.last}` : empId;
    
    onAddDocument({
      empId,
      type: "Health Passport Proof",
      name: `Approved Medical Report - Approved on ${new Date().toISOString().split("T")[0]}`
    });
    
    showToast(`Approved medical report and archived details for ${empName}!`, "success");
  };

  const getMedicalProofStatus = (empId: string, recordDate: string, record: AttendanceRecord) => {
    if (record.status !== "Sick") return null;

    const hasProof = state.documents.some(doc => 
      doc.empId === empId && 
      (doc.type === "Health Passport Proof" || 
       doc.type === "Medical Health Assessment Form" || 
       doc.name.toLowerCase().includes("health passport") ||
       doc.name.toLowerCase().includes("medical proof"))
    );

    if (hasProof) {
      return { status: "Verified", label: "Medical Proof Verified", color: "text-emerald-750 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-950/10" };
    }

    let isOverdue = false;
    let remainingText = "";

    if (record.sickSelectedAt) {
      const elapsedMs = Date.now() - new Date(record.sickSelectedAt).getTime();
      const remainingMs = (48 * 60 * 60 * 1000) - elapsedMs;
      if (remainingMs <= 0) {
        isOverdue = true;
      } else {
        const hoursLeft = Math.ceil(remainingMs / (1000 * 60 * 60));
        remainingText = `${hoursLeft}h left`;
      }
    } else {
      // Calendar check
      const recordTime = new Date(recordDate).getTime();
      const currentTime = new Date(date).getTime();
      const diffMs = currentTime - recordTime;
      if (diffMs >= 48 * 60 * 60 * 1000) {
        isOverdue = true;
      } else {
        remainingText = "48h clock active";
      }
    }

    if (isOverdue) {
      return { status: "Overdue", label: "No proof - Overdue", color: "text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-950/10" };
    }

    return { status: "Pending", label: `Awaiting Proof (${remainingText})`, color: "text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:text-amber-455 dark:border-amber-950/10" };
  };

  // Matches text search + branch + department filters
  const filteredEmployees = state.employees.filter(emp => {
    const matchesDept = !deptFilter || emp.dept === deptFilter;
    
    const fullName = `${emp.first} ${emp.last}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery.trim() || fullName.includes(query) || emp.id.toLowerCase().includes(query);

    return matchesDept && matchesSearch;
  });

  // Calculate live stats based on matching local attendance map edits
  const totalInScope = filteredEmployees.length;
  const countPresent = filteredEmployees.filter(e => localAttendance[e.id]?.status === "Present").length;
  const countAbsent = filteredEmployees.filter(e => localAttendance[e.id]?.status === "Absent").length;
  const countSick = filteredEmployees.filter(e => localAttendance[e.id]?.status === "Sick").length;
  const countLeave = filteredEmployees.filter(e => localAttendance[e.id]?.status === "Leave").length;
  const rateCompliance = totalInScope > 0 ? Math.round((countPresent / totalInScope) * 100) : 100;

  // Month-to-date cumulative absence and statutory compliance reports
  const getMonthlyAbsencesReport = () => {
    const activeMonth = date.slice(0, 7); // YYYY-MM
    const report: {
      employee: Employee;
      absences: number;
      penalized: boolean;
      penalizedAmount: number;
      riskLevel: "Critical" | "High" | "Normal";
    }[] = [];

    state.employees.forEach(emp => {
      let absences = 0;
      Object.keys(state.attendance).forEach(historyDate => {
        if (historyDate.startsWith(activeMonth)) {
          if (state.attendance[historyDate]?.[emp.id]?.status === "Absent") {
            absences++;
          }
        }
      });

      const matchedPenalties = state.deductionApprovals.filter(
        d => d.empId === emp.id && d.date.startsWith(activeMonth)
      );
      const penalized = matchedPenalties.length > 0;
      const penalizedAmount = matchedPenalties.reduce((sum, current) => sum + current.amount, 0);

      let riskLevel: "Critical" | "High" | "Normal" = "Normal";
      if (absences >= 5) riskLevel = "Critical";
      else if (absences >= 3) riskLevel = "High";

      if (absences > 0 || penalized) {
        report.push({
          employee: emp,
          absences,
          penalized,
          penalizedAmount,
          riskLevel
        });
      }
    });

    return report.sort((a, b) => b.absences - a.absences);
  };

  const currentAbsenceReportList = getMonthlyAbsencesReport();

  const visibleEmployees = filteredEmployees.filter(emp => {
    const record = localAttendance[emp.id] || { status: "Present", inTime: "06:00", outTime: "17:00", shift: "Day" };
    if (activeShiftTab === "Absentees") {
      return record.status === "Absent";
    }
    return (record.shift || "Day") === activeShiftTab;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 1. INTERACTIVE LIVE COMPLIANCE STATS BOX */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Present KPI */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-450">
            <UserCheck className="h-5.5 w-5.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Present Today
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                {countPresent}
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                / {totalInScope} active
              </span>
            </div>
          </div>
        </div>

        {/* Absences KPI */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
            <UserX className="h-5.5 w-5.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Absences Today
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-white leading-tight">
              {countAbsent}
            </span>
          </div>
        </div>

        {/* Leave/Sick KPI */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-350">
            <Clock className="h-5.5 w-5.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Leave & Sick Today
            </span>
            <div className="flex gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
              <span>{countLeave} LV</span>
              <span className="text-slate-350">&bull;</span>
              <span>{countSick} SK</span>
            </div>
          </div>
        </div>

        {/* Attendance Rate Compliance Graph Metre */}
        <div className="rounded-2xl border border-slate-100 bg-white p-4.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-450">
            <TrendingUp className="h-5.5 w-5.5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Daily Attendance Rate
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-white leading-tight">
              {rateCompliance}%
            </span>
          </div>
        </div>
      </div>

      {/* 2. DATE SELECTS, TEXT SEARCHS, AND ACTIONS RIBBON */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-white p-4 rounded-2xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex flex-wrap gap-3 items-center flex-1">
          {/* Calendar Picker input */}
          <div className="relative shrink-0 w-44">
            <Calendar className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Quick Realtime Text Search */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee by name/ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm font-medium text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Dept filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Departments ({state.employees.length})</option>
            {["Kitchen", "Administration", "Operations", "Finance", "Human Resources"].map((dept) => {
              const count = state.employees.filter(e => e.dept === dept).length;
              return (
                <option key={dept} value={dept}>{dept} ({count})</option>
              );
            })}
          </select>
        </div>

        {/* Action button triggers package */}
        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            onClick={handleExportAttendance}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-705 shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-850 transition"
          >
            <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-500" />
            Export CSV Report
          </button>
          <button
            onClick={handleMarkAllPresent}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-850 transition"
          >
            <CheckSquare className="h-4.5 w-4.5 text-slate-500" />
            Mark All Present
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-600 transition"
          >
            <Save className="h-4.5 w-4.5" />
            Save Daily Ledger
          </button>
        </div>
      </div>

      {/* MEDICAL PROOF VERIFICATION ALERT BOX */}
      {pendingSickAudits.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50/40 p-5 dark:border-red-950/25 dark:bg-rose-950/10 space-y-3.5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-650 dark:bg-red-950/40 dark:text-red-400">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-red-800 dark:text-red-400">
                Medical Compliance Guard: Health Passport Proof Outstanding
              </h4>
              <p className="text-xs text-red-600/90 dark:text-red-350/90 mt-0.5">
                The employees listed below have been marked as <strong>Sick</strong> on their attendance record. They are granted a <strong>48-hour Grace Period</strong> to submit a Health Passport as medical proof. If no proof is submitted, contract terms mandate automatic deduction as <strong>Absent</strong>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pendingSickAudits.map(({ dateStr, emp, record, isOverdue, hoursPassed }) => {
              const hoursLeft = Math.max(0, 48 - hoursPassed);
              const timerLabel = isOverdue 
                ? "OVERDUE (Converts to Absent)" 
                : `${Math.floor(hoursLeft)} hours remaining`;

              return (
                <div 
                  key={`${dateStr}-${emp.id}`}
                  className={`rounded-xl border p-3.5 flex flex-col justify-between ${
                    isOverdue 
                      ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-950/40" 
                      : "bg-white border-slate-150 dark:bg-slate-900 dark:border-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <img src={emp.photo} alt={emp.first} className="h-8 w-8 rounded-full object-cover" />
                    <div>
                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                        {emp.first} {emp.last}
                      </h5>
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest block">
                        Record Date: {dateStr}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/60 pt-2.5">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-slate-500">Grace Status:</span>
                      <span className={isOverdue ? "text-red-600 uppercase font-black" : "text-amber-600 font-bold"}>
                        {timerLabel}
                      </span>
                    </div>

                    <div className="flex gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => handleApproveMedicalReport(emp.id)}
                        className="flex-1 text-[10px] font-black rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 py-1.5 transition text-center px-1"
                        title="Tick/approve medical report as presented"
                      >
                        ✓ Approve Report
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSimulateLapse(dateStr, emp.id)}
                        className="text-[10px] font-black rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 p-1.5 transition text-center shrink-0"
                        title="Forward time to test auto-deduction instantly"
                      >
                        ⚡ Simulate 48h
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. MAIN ATTENDANCE REGISTER DATA TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        
        {/* SHIFT-LEVEL NAVIGATION PILLS & TABS */}
        <div className="flex border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
          {[
            { id: "Day", label: "☀️ Day Shift", color: "border-amber-500 text-amber-600 dark:text-amber-450" },
            { id: "Night", label: "🌙 Night Shift", color: "border-indigo-500 text-indigo-600 dark:text-indigo-400" },
            { id: "Off", label: "🏝️ Off Duty", color: "border-sky-500 text-sky-600 dark:text-sky-400" },
            { id: "Absentees", label: "🚨 Absentees List", color: "border-rose-500 text-rose-600 dark:text-rose-405" },
          ].map((tab) => {
            const isActive = activeShiftTab === tab.id;
            
            // Calculate active counts in this status/shift category
            const count = filteredEmployees.filter(emp => {
              const record = localAttendance[emp.id] || { status: "Present", shift: "Day" };
              if (tab.id === "Absentees") {
                return record.status === "Absent";
              }
              return (record.shift || "Day") === tab.id;
            }).length;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveShiftTab(tab.id as any)}
                className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition duration-200 cursor-pointer ${
                  isActive 
                    ? `${tab.color} bg-white dark:bg-slate-900 bg-opacity-100` 
                    : "border-transparent text-slate-400 hover:text-slate-650 hover:border-slate-200 dark:text-slate-500 dark:hover:text-slate-300"
                }`}
              >
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    isActive ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-100" : "bg-slate-200/50 text-slate-550 dark:bg-slate-950 dark:text-slate-400"
                  }`}>
                    {count}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                <th className="px-6 py-4">Employee Details</th>
                <th className="px-6 py-4">Shift & Swap</th>
                <th className="px-6 py-4">Registry Status</th>
                <th className="px-6 py-4">Shift In-Time</th>
                <th className="px-6 py-4">Shift Out-Time</th>
                <th className="px-6 py-4 text-center">Actual Worked Hours</th>
                <th className="px-6 py-4 text-center whitespace-nowrap">Overtime Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {visibleEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 dark:text-slate-500 font-semibold">
                    No employees found on {activeShiftTab === "Absentees" ? "Absentees List" : `${activeShiftTab} Shift`} matching matches.
                  </td>
                </tr>
              ) : (
                visibleEmployees.map(emp => {
                  const record = localAttendance[emp.id] || { status: "Present", inTime: "06:00", outTime: "17:00", shift: "Day" };
                  
                  // Compute dynamic hours
                  const workedHours = calculateWorkedHours(record.status, record.inTime, record.outTime);
                  const overtimeHours = calculateOvertimeHours(record.outTime, record.inTime, record.status);

                  // Warnings triggers
                  const isLateArrival = record.status === "Present" && record.inTime > "06:15";
                  const isEarlyDeparture = record.status === "Present" && record.outTime !== "00:00" && record.outTime < "17:00";

                  const badgeColors = {
                    Present: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400",
                    Absent: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400",
                    Sick: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-400",
                    Leave: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/30 dark:bg-sky-950/20 dark:text-sky-400",
                    Other: "border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-900/30 dark:bg-purple-950/20 dark:text-purple-400",
                  };

                  const statusLeftBorder = {
                    Present: "border-l-4 border-l-emerald-500",
                    Absent: "border-l-4 border-l-rose-500",
                    Sick: "border-l-4 border-l-amber-500",
                    Leave: "border-l-4 border-l-sky-500",
                    Other: "border-l-4 border-l-purple-500",
                  };

                  return (
                    <tr 
                      key={emp.id} 
                      className={`hover:bg-slate-50/20 dark:hover:bg-slate-800/10 transition pb-2 ${statusLeftBorder[record.status]}`}
                    >
                      {/* Person Details panel */}
                      <td className="px-6 py-4.5">
                        <div 
                          className="flex items-center gap-3 cursor-pointer group/item"
                          onClick={() => onSelectEmployee && onSelectEmployee(emp.id, "attendance")}
                        >
                          <img
                            src={emp.photo}
                            alt={emp.first}
                            className="h-9 w-9 rounded-full object-cover shadow-inner ring-1 ring-slate-100 dark:ring-slate-800 transition duration-150 group-hover/item:scale-105"
                          />
                          <div>
                            <h4 className="font-bold text-slate-850 dark:text-white leading-tight transition group-hover/item:text-emerald-500 dark:group-hover/item:text-emerald-400">
                              {emp.first} {emp.last}
                            </h4>
                            <span className="font-mono text-[10px] text-slate-450 dark:text-slate-500 uppercase tracking-widest block mt-0.5">
                              {emp.id} &bull; {emp.branch}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Active Shift Selection & Swap action */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 max-w-[130px]">
                          <select
                            value={record.shift || "Day"}
                            onChange={(e) => handleShiftChange(emp.id, e.target.value as "Day" | "Night" | "Off")}
                            className={`rounded-xl border px-2 py-1 text-xs font-black focus:outline-none focus:ring-1 focus:ring-indigo-500 transition cursor-pointer ${
                              record.shift === "Night"
                                ? "border-indigo-250 bg-indigo-50/70 text-indigo-800 dark:border-indigo-900/40 dark:bg-indigo-950/25 dark:text-indigo-400"
                                : record.shift === "Off"
                                ? "border-sky-250 bg-sky-50/70 text-sky-800 dark:border-sky-900/40 dark:dark:bg-sky-950/25 dark:text-sky-400"
                                : "border-amber-250 bg-amber-50/70 text-amber-805 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-400"
                            }`}
                          >
                            <option value="Day">☀️ Day Shift</option>
                            <option value="Night">🌙 Night Shift</option>
                            <option value="Off">🏝️ Off Duty</option>
                          </select>
                          
                          <button
                            type="button"
                            onClick={() => initiateExchange(emp.id)}
                            className="inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-[10px] font-black text-indigo-700 py-1.5 border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/30 dark:text-indigo-400 transition cursor-pointer"
                          >
                            ⇄ Swap Roster
                          </button>
                        </div>
                      </td>

                      {/* Dropdown status classification toggle */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5 max-w-[155px]">
                          <select
                            value={record.status}
                            onChange={(e) => handleStatusChange(emp.id, e.target.value as AttendanceRecord["status"])}
                            className={`rounded-xl border px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 transition cursor-pointer ${badgeColors[record.status]}`}
                          >
                            <option value="Present">Present</option>
                            <option value="Absent">Absent</option>
                            <option value="Sick">Sick Leave</option>
                            <option value="Leave">On Leave</option>
                            <option value="Other">Other</option>
                          </select>
                          
                          {record.status === "Sick" && (() => {
                            const proofStatus = getMedicalProofStatus(emp.id, date, record);
                            if (proofStatus) {
                              const isUnverified = proofStatus.status !== "Verified";
                              return (
                                <div className="flex flex-col gap-1 inline-flex">
                                  <span className={`inline-flex items-center justify-center rounded-lg px-2 py-0.5 border text-[9px] font-black leading-none uppercase ${proofStatus.color}`}>
                                    {proofStatus.label}
                                  </span>
                                  {isUnverified && (
                                    <button
                                      type="button"
                                      onClick={() => handleApproveMedicalReport(emp.id)}
                                      className="text-left text-[9px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-bold underline transition pl-1"
                                    >
                                      ✓ Approve Report
                                    </button>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {record.status === "Other" && (
                            <input
                              type="text"
                              placeholder="Reason / Notes..."
                              value={record.note || ""}
                              onChange={(e) => handleNoteChange(emp.id, e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 mt-1 focus:border-purple-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                            />
                          )}
                          
                          {record.status === "Absent" && record.autoDeducted && (
                            <span className="inline-flex items-center justify-center rounded-lg bg-red-100 border border-red-200 px-2 py-0.5 text-[9.5px] font-black text-red-700 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-950/20 uppercase leading-none text-center">
                              No Med Proof Presented
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Check-In Picker inside column with Late arrival detection label text */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <input
                            type="time"
                            disabled={record.status !== "Present"}
                            value={record.inTime}
                            onChange={(e) => handleTimeChange(emp.id, "inTime", e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono font-bold text-slate-700 disabled:opacity-30 focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 w-24"
                          />
                          {isLateArrival && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 dark:text-amber-500">
                              <AlertTriangle className="h-2.5 w-2.5 shrink-0 animate-bounce" />
                              Late Arrival
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Check-Out Picker inside column with Early departure detection label text */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <input
                            type="time"
                            disabled={record.status !== "Present"}
                            value={record.outTime}
                            onChange={(e) => handleTimeChange(emp.id, "outTime", e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono font-bold text-slate-700 disabled:opacity-30 focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 w-24"
                          />
                          {isEarlyDeparture && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-500 dark:text-rose-400">
                              <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                              Early Departure
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Calculated Worked Hours including lunch subtraction */}
                      <td className="px-6 py-4 text-center">
                        <span className="font-mono font-black text-slate-700 dark:text-slate-200 text-sm">
                          {record.status === "Present" ? workedHours.toFixed(1) : "0.0"}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 block tracking-tight mt-0.5">
                          {record.status === "Leave" ? "Paid Leave" : record.status === "Sick" ? "Sick Leave" : "Actual Work"}
                        </span>
                      </td>

                      {/* Overtime Hrs Column details */}
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold leading-none ${
                          overtimeHours > 0 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-450 dark:border-emerald-950/20" 
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        }`}>
                          {overtimeHours > 0 ? `+${overtimeHours} hrs` : "None"}
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

      {/* 4. PROACTIVE SWEEP AUDIT & CUMULATIVE MONTH ABSENCE CHART */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2.5 mb-5 border-b border-slate-50 dark:border-slate-800/50 pb-4">
          <Gauge className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
          <div>
            <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider dark:text-slate-105 leading-none">
              Cumulative Month-to-Date Absences & Penalty Audit
            </h3>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tracking-tight mt-1">
              Active tracking metrics for statutory 5% salary deduction penalty sweep.
            </p>
          </div>
        </div>

        {currentAbsenceReportList.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-410 dark:text-slate-500">
            Excellent! No employees have logged absences or statutory penalties in the current month cycle.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {currentAbsenceReportList.map(report => {
              const { employee, absences, penalized, penalizedAmount, riskLevel } = report;
              
              const riskMeta = {
                Critical: {
                  bg: "bg-rose-50 border-rose-100 dark:bg-rose-950/40 dark:border-rose-950/40",
                  text: "text-rose-600 dark:text-rose-400",
                  badge: "bg-rose-500 text-white",
                  label: "Penalty Threshold Triggered"
                },
                High: {
                  bg: "bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-950/30",
                  text: "text-amber-600 dark:text-amber-400",
                  badge: "bg-amber-500 text-white",
                  label: "High Risk of Sanction"
                },
                Normal: {
                  bg: "bg-slate-50 border-slate-100 dark:bg-slate-900 dark:border-slate-800",
                  text: "text-slate-600 dark:text-slate-400",
                  badge: "bg-slate-500 text-white",
                  label: "Compliance Monitored"
                }
              }[riskLevel];

              return (
                <div 
                  key={employee.id} 
                  className={`rounded-xl border p-4 flex flex-col justify-between transition ${riskMeta.bg}`}
                >
                  <div className="flex items-start justify-between mb-3.5">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={employee.photo}
                        alt={employee.first}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-slate-850 dark:text-white">
                          {employee.first} {employee.last}
                        </h4>
                        <span className="text-[9px] font-mono text-slate-450 dark:text-slate-500">
                          {employee.id} &bull; {employee.branch}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase ${riskMeta.badge}`}>
                      {riskLevel}
                    </span>
                  </div>

                  <div className="space-y-1.5 border-t border-slate-100/30 dark:border-slate-800/20 pt-3">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-500 dark:text-slate-400">Month Absences:</span>
                      <span className={riskMeta.text}>{absences} days absent</span>
                    </div>

                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-500 dark:text-slate-400">Statutory Status:</span>
                      <span className={`${riskMeta.text} font-extrabold`}>{riskMeta.label}</span>
                    </div>

                    <div className="flex justify-between text-[11px] font-bold border-t border-slate-101/10 pt-1.5 mt-1.5">
                      <span className="text-slate-600 dark:text-slate-400">Penalized this month:</span>
                      {penalized ? (
                        <span className="text-rose-500 dark:text-rose-400">
                          Applied (MWK {penalizedAmount.toLocaleString()})
                        </span>
                      ) : (
                        <span className="text-emerald-500 dark:text-emerald-450 font-black">
                          {absences >= 5 ? "Pending Save action" : "Compliant"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. STANDARD SYSTEM DEDUCTIONS PENALTY SWEEP POPUP */}
      {currentPenaltyIndex !== -1 && pendingPenalties[currentPenaltyIndex] && (
        <ConfirmModal
          isOpen={true}
          type="warning"
          title="Absence Penalty Sweep Action Required"
          message={`System detected that ${pendingPenalties[currentPenaltyIndex].employee.first} ${pendingPenalties[currentPenaltyIndex].employee.last} has logged ${pendingPenalties[currentPenaltyIndex].absences} cumulative absences in the active month cycle. Enforce the statutory 5% salary penalty deduction?`}
          onConfirm={handleConfirmPenalty}
          onCancel={handleDeclinePenalty}
          confirmText="Enforce Penalty"
          cancelText="Bypass Action"
        />
      )}

      {/* 6. SHIFT SWAP / ROSTER EXCHANGE DIALOG */}
      <Modal
        isOpen={isExchangeOpen}
        onClose={() => {
          setIsExchangeOpen(false);
          setExchangeEmpId("");
          setExchangeTargetEmpId("");
        }}
        title="Exchange Shift & Swap Assignments"
        subtitle="Swap the shift, check-in schedules, and calendar status between two employees atomically."
        maxWidthClass="max-w-md"
      >
        {(() => {
          const mainEmp = exchangeEmpId ? state.employees.find(e => e.id === exchangeEmpId) : null;
          const mainRec = exchangeEmpId ? localAttendance[exchangeEmpId] : null;
          const currentShiftLabel = mainRec?.shift || "Day";

          // Peer employees available to swap with
          const peerEmployees = state.employees.filter(e => e.id !== exchangeEmpId && !e.isTerminated);

          return (
            <form onSubmit={handleConfirmExchange} className="space-y-4">
              {mainEmp && (
                <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100/50 dark:bg-indigo-950/20 dark:border-indigo-900/30">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Originating Peer</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <img src={mainEmp.photo} alt={mainEmp.first} referrerPolicy="no-referrer" className="h-9 w-9 rounded-full object-cover" />
                    <div>
                      <h4 className="font-bold text-slate-850 dark:text-white leading-tight">
                        {mainEmp.first} {mainEmp.last}
                      </h4>
                      <p className="text-[10px] text-slate-450 mt-0.5">
                        Currently: <strong className="text-indigo-600 dark:text-indigo-400 font-extrabold uppercase">{currentShiftLabel} Shift</strong>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide dark:text-slate-350 mb-1">
                  Exchange Assignments With Peer:
                </label>
                <select
                  required
                  value={exchangeTargetEmpId}
                  onChange={(e) => setExchangeTargetEmpId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-505 cursor-pointer"
                >
                  <option value="">Select teammate to swap shifts with...</option>
                  {peerEmployees.map(peer => {
                    const peerRec = localAttendance[peer.id] || { shift: "Day" };
                    const peerShift = peerRec.shift || "Day";
                    return (
                      <option key={peer.id} value={peer.id}>
                        {peer.first} {peer.last} (Shift: {peerShift} &bull; ID: {peer.id})
                      </option>
                    );
                  })}
                </select>
                <p className="text-[10px] text-indigo-400/95 dark:text-indigo-350 mt-2 font-medium">
                  &bull; Confirming this action will automatically swap their on-duty status, calendar shift designations, and default hours.
                </p>
              </div>

              <div className="flex gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsExchangeOpen(false);
                    setExchangeEmpId("");
                    setExchangeTargetEmpId("");
                  }}
                  className="w-1/2 rounded-xl border border-slate-200 px-4 py-2 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 text-xs font-bold transition text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!exchangeTargetEmpId}
                  className="w-1/2 rounded-xl bg-indigo-600 transition hover:bg-indigo-700 disabled:opacity-40 py-2.5 text-xs font-bold text-white shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Confirm Shift Swap
                </button>
              </div>
            </form>
          );
        })()}
      </Modal>
    </div>
  );
}
