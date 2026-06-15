/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Grid, 
  FileSpreadsheet, 
  Download, 
  Trash2, 
  Eye, 
  X,
  UserCheck2,
  AlertCircle,
  Calendar,
  Layers,
  FileText,
  DollarSign,
  TrendingUp,
  Coins,
  ShieldAlert,
  Clock,
  Briefcase,
  User,
  Heart,
  CheckCircle2,
  Info,
  ChevronRight,
  ListFilter,
  XCircle,
  AlertTriangle,
  Printer,
} from "lucide-react";
import { jsPDF } from "jspdf";
import { Employee, DatabaseState } from "../types";
import { Modal } from "./Modals";
import { exportToCSV, parseCSVInput, capitalizeString, getAvatarUrl } from "../utils";

interface EmployeesProps {
  state: DatabaseState;
  onAddEmployee: (employee: Omit<Employee, "id">) => void;
  onRemoveEmployee: (id: string) => void;
  onRemoveEmployees?: (ids: string[]) => void;
  onUpdateEmployee: (id: string, updatedFields: Partial<Employee>) => void;
  onAddBatch: (branch: string, csvLines: string[][]) => void;
  targetDossierTab?: "overview" | "financials" | "attendance" | "compliance";
  onClearTargetDossierTab?: () => void;
  externalProfileEmployeeId?: string;
  onClearExternalProfileEmployeeId?: () => void;
  isDossierOnly?: boolean;
  selectedBranch?: string;
}

type TabType = "overview" | "financials" | "attendance" | "compliance";

const liveCapitalize = (val: string): string => {
  return val.replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
};

const calculateOneYearExpiry = (startDateStr: string): string => {
  if (!startDateStr) return "";
  const d = new Date(startDateStr);
  if (isNaN(d.getTime())) return "";
  d.setFullYear(d.getFullYear() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function Employees({
  state,
  onAddEmployee,
  onRemoveEmployee,
  onRemoveEmployees,
  onUpdateEmployee,
  onAddBatch,
  targetDossierTab,
  onClearTargetDossierTab,
  externalProfileEmployeeId,
  onClearExternalProfileEmployeeId,
  isDossierOnly = false,
  selectedBranch = "all",
}: EmployeesProps) {
  // Navigation & View layout
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Filters state
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [posFilter, setPosFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Active" | "Terminated" | "">("Active");

  // Selection state
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);

  // Contract Termination states
  const [isTerminateOpen, setIsTerminateOpen] = useState(false);
  const [termEmpId, setTermEmpId] = useState<string>(""); // if empty, it represents bulk termination
  const [termReason, setTermReason] = useState("Resigned");
  const [termDate, setTermDate] = useState(new Date().toISOString().split("T")[0]);
  const [termNotes, setTermNotes] = useState("");

  // Contract Renewal states
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [renewEmpId, setRenewEmpId] = useState<string>("");
  const [renewStartDate, setRenewStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [renewEndDate, setRenewEndDate] = useState("");
  const [renewSalaryValue, setRenewSalaryValue] = useState(0);

  useEffect(() => {
    if (renewEmpId) {
      const emp = state.employees.find(e => e.id === renewEmpId);
      if (emp) {
        setRenewSalaryValue(emp.salary);
        // Default new contract end date to 1 year after current end date (or 1 year from today if current end is lapsed)
        const currentEnd = new Date(emp.cend);
        const today = new Date();
        const baseDate = isNaN(currentEnd.getTime()) || currentEnd < today ? today : currentEnd;
        const newEnd = new Date(baseDate);
        newEnd.setFullYear(newEnd.getFullYear() + 1);
        setRenewEndDate(newEnd.toISOString().split("T")[0]);
        // Default start date of renewal to today or current expiry base
        const newStart = new Date(baseDate);
        setRenewStartDate(newStart.toISOString().split("T")[0]);
      }
    }
  }, [renewEmpId, state.employees]);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [profileEmployee, setProfileEmployee] = useState<Employee | null>(null);
  
  // Profile Detail Tabs
  const [activeDossierTab, setActiveDossierTab] = useState<TabType>("overview");
  const [isEditDossierMode, setIsEditDossierMode] = useState(false);

  useEffect(() => {
    if (targetDossierTab && profileEmployee) {
      setActiveDossierTab(targetDossierTab);
      onClearTargetDossierTab?.();
    }
  }, [targetDossierTab, profileEmployee]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const activeEl = document.querySelector(`[data-dossier-tab="${activeDossierTab}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        });
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [activeDossierTab, profileEmployee]);

  useEffect(() => {
    if (externalProfileEmployeeId) {
      const emp = state.employees.find(e => e.id === externalProfileEmployeeId);
      if (emp) {
        openProfile(emp);
      }
      onClearExternalProfileEmployeeId?.();
    }
  }, [externalProfileEmployeeId, state.employees]);

  // Form states (Add)

  const handleDownloadDossierHTML = (emp: Employee) => {
    // 1. Gather all attendance
    const empAttendanceLogs: { date: string; status: string; inTime: string; outTime: string; note?: string }[] = [];
    if (state.attendance) {
      Object.keys(state.attendance).forEach(dateStr => {
        const record = state.attendance[dateStr]?.[emp.id];
        if (record) {
          empAttendanceLogs.push({
            date: dateStr,
            status: record.status,
            inTime: record.inTime,
            outTime: record.outTime,
            note: record.note,
          });
        }
      });
    }
    // Sort descending by date
    empAttendanceLogs.sort((a, b) => b.date.localeCompare(a.date));

    // 2. Leave Requests
    const empLeaveRequests = state.leave ? state.leave.filter(l => l.empId === emp.id) : [];

    // 3. Loans
    const empLoans = state.loans ? state.loans.filter(l => l.empId === emp.id) : [];

    // 4. Disciplinary Warnings
    const empDisciplinary = state.disciplinary ? state.disciplinary.filter(d => d.empId === emp.id) : [];

    // Format individual attendance rows
    const attendanceRowsHTML = empAttendanceLogs.length > 0 
      ? empAttendanceLogs.map(log => `
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${log.date}</td>
          <td>
            <span class="badge badge-${log.status.toLowerCase()}">${log.status}</span>
          </td>
          <td style="font-family: monospace;">${log.status === "Present" ? log.inTime : "-"}</td>
          <td style="font-family: monospace;">${log.status === "Present" ? log.outTime : "-"}</td>
          <td style="color: #64748b; font-style: italic;">${log.note || "-"}</td>
        </tr>
      `).join("")
      : '<tr><td colspan="5" style="color: #94a3b8; text-align: center; padding: 20px;">No attendance logs filed for this teammate.</td></tr>';

    // Format leaves
    const leaveRowsHTML = empLeaveRequests.length > 0
      ? empLeaveRequests.map(l => `
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${l.start} to ${l.end}</td>
          <td style="font-weight: bold; color: #0284c7;">${l.type}</td>
          <td style="font-weight: bold; text-align: center;">${l.days} Days</td>
          <td>
            <span class="badge" style="background-color: ${l.status === "Approved" ? "#dcfce7" : l.status === "Pending" ? "#fef3c7" : "#fee2e2"}; color: ${l.status === "Approved" ? "#166534" : l.status === "Pending" ? "#92400e" : "#991b1b"}; font-weight: bold;">
              ${l.status}
            </span>
          </td>
        </tr>
      `).join("")
      : '<tr><td colspan="4" style="color: #94a3b8; text-align: center; padding: 20px;">No leave requests filed.</td></tr>';

    // Format loans
    const loansRowsHTML = empLoans.length > 0
      ? empLoans.map(l => `
        <tr>
          <td style="font-family: monospace; font-weight: bold;">MWK ${l.amount.toLocaleString()}.00</td>
          <td style="font-family: monospace;">${l.months} Months</td>
          <td style="font-family: monospace; font-weight: bold; color: #166534;">MWK ${l.paid.toLocaleString()}.00</td>
          <td style="font-weight: bold; color: #166534;">ACTIVE AMORTIZATION</td>
        </tr>
      `).join("")
      : '<tr><td colspan="4" style="color: #94a3b8; text-align: center; padding: 20px;">No active loans.</td></tr>';

    // Format disciplinary
    const complianceRowsHTML = empDisciplinary.length > 0
      ? empDisciplinary.map(d => `
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${d.date}</td>
          <td>
            <span class="badge" style="background-color: #fee2e2; color: #991b1b; font-weight: bold;">
              ${d.action}
            </span>
          </td>
          <td style="font-weight: bold;">${d.desc}</td>
          <td style="color: #64748b; font-family: monospace; font-size: 10px;">${d.id}</td>
        </tr>
      `).join("")
      : '<tr><td colspan="4" style="color: #94a3b8; text-align: center; padding: 20px;">Teammate dossier is fully clean. No compliance warnings filed.</td></tr>';

    const dossierHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Corporate Dossier - ${emp.first} ${emp.last}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      background-color: #f1f5f9;
      padding: 40px 20px;
      margin: 0;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    .dossier-container {
      max-width: 850px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 45px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
    }
    .action-row {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 25px;
    }
    .print-button {
      background-color: #0f172a;
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      transition: background-color 0.15s ease-in-out;
    }
    .print-button:hover {
      background-color: #1e293b;
    }
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .title-block {
      margin: 0;
    }
    .title-block h1 {
      font-size: 18px;
      font-weight: 900;
      margin: 0;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: -0.01em;
    }
    .title-block p {
      font-size: 12px;
      color: #059669;
      margin: 4px 0 0 0;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .badge-dossier {
      background-color: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .section-title {
      font-size: 13.5px;
      font-weight: 800;
      text-transform: uppercase;
      color: #0f172a;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 35px;
      margin-bottom: 15px;
      letter-spacing: 0.05em;
    }
    .meta-grid {
      display: grid;
      grid-template-cols: repeat(3, 1fr);
      gap: 14px;
      margin-bottom: 25px;
    }
    .meta-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 12px 14px;
      border-radius: 8px;
    }
    .meta-label {
      font-size: 12px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 700;
      letter-spacing: 0.04em;
      margin-bottom: 4px;
    }
    .meta-value {
      font-size: 13.5px;
      font-weight: 600;
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    th {
      background-color: #f8fafc;
      border-bottom: 2px solid #cbd5e1;
      color: #475569;
      font-weight: 700;
      text-align: left;
      padding: 10px 12px;
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 0.03em;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 12px;
      color: #334155;
    }
    .badge {
      display: inline-block;
      font-size: 12px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .badge-present { background-color: #dcfce7; color: #15803d; }
    .badge-absent { background-color: #fee2e2; color: #b91c1c; }
    .badge-sick { background-color: #fef3c7; color: #b45309; }
    .badge-leave { background-color: #e0f2fe; color: #0369a1; }
    .badge-other { background-color: #f3e8ff; color: #7e22ce; }
    
    @media print {
      body {
        background-color: #ffffff;
        padding: 0;
      }
      .print-button {
        display: none;
      }
      .dossier-container {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="dossier-container">
    <div class="action-row">
      <button class="print-button" onclick="window.print()">Print Dossier Report</button>
    </div>

    <div class="header-container">
      <div class="title-block">
        <h1>${emp.first} ${emp.last}</h1>
        <p>Official Corporate Teammate Dossier & Compliance Records</p>
      </div>
      <div class="badge-dossier">REF ID: ${emp.id}</div>
    </div>

    <div class="section-title">Corporate Allocation Details</div>
    <div class="meta-grid">
      <div class="meta-box">
        <div class="meta-label">Unique Ref ID</div>
        <div class="meta-value" style="font-family: monospace;">${emp.id}</div>
      </div>
      <div class="meta-box">
        <div class="meta-label">Assigned Department</div>
        <div class="meta-value">${emp.dept}</div>
      </div>
      <div class="meta-box">
        <div class="meta-label">Regional Location / Branch</div>
        <div class="meta-value">${emp.branch}</div>
      </div>
      <div class="meta-box">
        <div class="meta-label">Position Assignment</div>
        <div class="meta-value">${emp.position}</div>
      </div>
      <div class="meta-box">
        <div class="meta-label">Gender Classification</div>
        <div class="meta-value">${emp.gender || "Female"}</div>
      </div>
      <div class="meta-box">
        <div class="meta-label">Monthly Gross Salary</div>
        <div class="meta-value" style="font-family: monospace; color: #166534;">MWK ${emp.salary.toLocaleString()}.00</div>
      </div>
      <div class="meta-box">
        <div class="meta-label">Standing Status</div>
        <div class="meta-value">${emp.isTerminated ? '<span style="color: #ef4444; font-weight: 800;">TERMINATED</span>' : '<span style="color: #10b981; font-weight: 800;">ACTIVE IN SERVICE</span>'}</div>
      </div>
      <div class="meta-box">
        <div class="meta-label">Contract Commencement</div>
        <div class="meta-value" style="font-family: monospace;">${emp.cstart || "-"}</div>
      </div>
      <div class="meta-box">
        <div class="meta-label">Contract Expiry</div>
        <div class="meta-value" style="font-family: monospace;">${emp.cend || "-"}</div>
      </div>
    </div>

    <div class="section-title">1. Attendance Registry & Absence Notes</div>
    <table>
      <thead>
        <tr>
          <th>Date Logged</th>
          <th>Status</th>
          <th>Check-In</th>
          <th>Check-Out</th>
          <th>Absence Note / Excuse details</th>
        </tr>
      </thead>
      <tbody>
        ${attendanceRowsHTML}
      </tbody>
    </table>

    <div class="section-title">2. Leave & Vacation Ledger Requests</div>
    <table>
      <thead>
        <tr>
          <th>Leave Duration</th>
          <th>Leave Classification</th>
          <th style="text-align: center;">Days Deducted</th>
          <th>Request Status</th>
        </tr>
      </thead>
      <tbody>
        ${leaveRowsHTML}
      </tbody>
    </table>

    <div class="section-title">3. Compliance Action warnings & Disciplinary Logbook</div>
    <table>
      <thead>
        <tr>
          <th>Incident Date</th>
          <th>Severity Tier</th>
          <th>Incident Description</th>
          <th>Standing Status</th>
        </tr>
      </thead>
      <tbody>
        ${complianceRowsHTML}
      </tbody>
    </table>

    <div class="section-title">4. Amortization Loan Repayments</div>
    <table>
      <thead>
        <tr>
          <th>Principal Amount</th>
          <th>Assigned Term</th>
          <th>Aggregate Paid</th>
          <th>Standing Approved</th>
        </tr>
      </thead>
      <tbody>
        ${loansRowsHTML}
      </tbody>
    </table>

    <footer style="margin-top: 60px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 15px;">
      Corporate Dossier generated certifying system index records &bull; ${new Date().toLocaleDateString()}
    </footer>
  </div>
</body>
</html>`;

    const blob = new Blob([dossierHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Dossier_${emp.first}_${emp.last}_Report.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const printWindow = window.open();
    if (printWindow) {
      printWindow.document.write(dossierHTML);
      printWindow.document.close();
    }
  };

  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newGender, setNewGender] = useState("Male");
  const [newPosition, setNewPosition] = useState("");
  const [newDept, setNewDept] = useState<Employee["dept"]>("Kitchen");
  const [newBranch, setNewBranch] = useState("");
  const [newSalary, setNewSalary] = useState(250000);
  const [newCStart, setNewCStart] = useState("");
  const [newCEnd, setNewCEnd] = useState("");

  // Batch states
  const [batchBranch, setBatchBranch] = useState("");
  const [batchText, setBatchText] = useState("");

  // Temp inline edits state
  const [editFirst, setEditFirst] = useState("");
  const [editLast, setEditLast] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [editDept, setEditDept] = useState<Employee["dept"]>("Operations");
  const [editBranch, setEditBranch] = useState("");
  const [editSalary, setEditSalary] = useState(0);
  const [editNational, setEditNational] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editCStart, setEditCStart] = useState("");
  const [editCEnd, setEditCEnd] = useState("");

  // Autofill salary helpers based on position averages
  const handlePositionChange = (pos: string) => {
    setNewPosition(pos);
    const peers = state.employees.filter(e => e.position === pos);
    if (peers.length > 0) {
      const average = peers.reduce((sum, e) => sum + e.salary, 0) / peers.length;
      setNewSalary(Math.round(average));
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const firstClean = newFirst.trim();
    const lastClean = newLast.trim();
    if (!firstClean || !lastClean) return;

    const positionToUse = newPosition.trim() || "Staff";
    const branchToUse = newBranch.trim() || (selectedBranch !== "all" ? selectedBranch : (state.branches[0] || "Main Branch"));

    onAddEmployee({
      first: capitalizeString(firstClean),
      last: capitalizeString(lastClean),
      gender: newGender,
      position: capitalizeString(positionToUse),
      dept: newDept,
      branch: branchToUse,
      salary: Number(newSalary) || 250000,
      national: "",
      cstart: newCStart || new Date().toISOString().split("T")[0],
      cend: newCEnd || new Date(Date.now() + 365 * 24 * 60 * 60 * 1056).toISOString().split("T")[0],
      photo: getAvatarUrl(newGender, firstClean)
    });

    // Reset
    setNewFirst("");
    setNewLast("");
    setNewGender("Male");
    setNewPosition("");
    setNewSalary(250000);
    setNewCStart("");
    setNewCEnd("");
    setIsAddOpen(false);
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchText.trim()) return;
    const branch = batchBranch || state.branches[0] || "Main Branch";
    const rawLines = parseCSVInput(batchText);
    
    onAddBatch(branch, rawLines);
    setBatchText("");
    setIsBatchOpen(false);
  };

  const handleTerminateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatePayload = {
      isTerminated: true,
      terminationDate: termDate,
      terminationReason: `${termReason}${termNotes.trim() ? `: ${termNotes.trim()}` : ""}`,
      cend: termDate
    };

    if (termEmpId) {
      onUpdateEmployee(termEmpId, updatePayload);
    } else {
      const activeSelections = selectedEmpIds.filter(id => {
        const emp = state.employees.find(e => e.id === id);
        return emp && !emp.isTerminated;
      });

      activeSelections.forEach(id => {
        onUpdateEmployee(id, updatePayload);
      });
      setSelectedEmpIds([]);
    }

    setTermEmpId("");
    setTermReason("Resigned");
    setTermNotes("");
    setTermDate(new Date().toISOString().split("T")[0]);
    setIsTerminateOpen(false);
  };

  const handleRenewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewEmpId || !renewStartDate || !renewEndDate) return;

    onUpdateEmployee(renewEmpId, {
      cstart: renewStartDate,
      cend: renewEndDate,
      salary: renewSalaryValue,
      isTerminated: false,
    });

    // Sync active profile view details instantly
    if (profileEmployee && profileEmployee.id === renewEmpId) {
      setProfileEmployee(prev => {
        if (!prev) return null;
        return {
          ...prev,
          cstart: renewStartDate,
          cend: renewEndDate,
          salary: renewSalaryValue,
          isTerminated: false,
        };
      });
    }

    setIsRenewOpen(false);
    setRenewEmpId("");
  };

  const handleExport = () => {
    const headers = ["ID", "First Name", "Last Name", "Gender", "Branch", "Department", "Position", "Salary (MWK)", "National ID", "Contract Start", "Contract End"];
    const rows = filtered.map(e => [
      e.id,
      e.first,
      e.last,
      e.gender || "Other",
      e.branch,
      e.dept,
      e.position,
      String(e.salary),
      e.national || "N/A",
      e.cstart || "N/A",
      e.cend || "N/A"
    ]);
    exportToCSV(headers, rows, "HR_Desk_Employee_Registry");
  };

  const openProfile = (emp: Employee) => {
    setProfileEmployee(emp);
    setEditFirst(emp.first);
    setEditLast(emp.last);
    setEditPosition(emp.position);
    setEditDept(emp.dept);
    setEditBranch(emp.branch);
    setEditSalary(emp.salary);
    setEditNational(emp.national || "");
    setEditGender(emp.gender || "Female");
    setEditCStart(emp.cstart || "");
    setEditCEnd(emp.cend || "");
    setIsEditDossierMode(false);
    if (targetDossierTab) {
      setActiveDossierTab(targetDossierTab);
      onClearTargetDossierTab?.();
    } else {
      setActiveDossierTab("overview");
    }
  };

  const saveDossierEdits = () => {
    if (profileEmployee) {
      onUpdateEmployee(profileEmployee.id, {
        first: capitalizeString(editFirst),
        last: capitalizeString(editLast),
        position: editPosition,
        dept: editDept,
        branch: editBranch,
        salary: Number(editSalary),
        national: editNational,
        gender: editGender,
        cstart: editCStart,
        cend: editCEnd,
        photo: getAvatarUrl(editGender, editFirst)
      });

      // Synchronize modal state so user sees changed values in summary tabs immediately
      setProfileEmployee(prev => prev ? {
        ...prev,
        first: capitalizeString(editFirst),
        last: capitalizeString(editLast),
        position: editPosition,
        dept: editDept,
        branch: editBranch,
        salary: Number(editSalary),
        national: editNational,
        gender: editGender,
        cstart: editCStart,
        cend: editCEnd,
        photo: getAvatarUrl(editGender, editFirst)
      } : null);

      setIsEditDossierMode(false);
    }
  };

  // CALCULATE ACTIVE METRICS FROM DATABASE STATE for selected or overall lists
  const filtered = state.employees.filter(emp => {
    const q = search.toLowerCase();
    const matchesSearch = 
      emp.first.toLowerCase().includes(q) || 
      emp.last.toLowerCase().includes(q) || 
      emp.id.toLowerCase().includes(q);
    const matchesDept = !deptFilter || emp.dept === deptFilter;
    const matchesPos = !posFilter || emp.position === posFilter;
    
    const isTerm = !!emp.isTerminated;
    const matchesStatus = 
      !statusFilter || 
      (statusFilter === "Active" && !isTerm) || 
      (statusFilter === "Terminated" && isTerm);
    
    return matchesSearch && matchesDept && matchesPos && matchesStatus;
  });

  const uniquePositions = Array.from(new Set(state.employees.map(e => e.position)));

  // Global HR Desk summary KPI details calculated on the fly
  const totalEmployees = state.employees.length;
  const femaleCount = state.employees.filter(e => e.gender === "Female").length;
  const maleCount = state.employees.filter(e => e.gender === "Male").length;
  const otherCount = totalEmployees - femaleCount - maleCount;
  
  const getDaysRemainingValue = (endDateStr: string) => {
    if (!endDateStr) return 0;
    const end = new Date(endDateStr);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const contractExpiriesSoonCount = state.employees.filter(e => {
    const remaining = getDaysRemainingValue(e.cend);
    return remaining >= 0 && remaining <= 90;
  }).length;

  const expiredContractsCount = state.employees.filter(e => {
    const remaining = getDaysRemainingValue(e.cend);
    return remaining < 0;
  }).length;

  const monthlyBasePayrollExpenditure = state.employees.reduce((sum, e) => sum + e.salary, 0);

  // PROFILE AUXILIARY CALCULATIONS FOR INTER-MODULE VISIBILITY
  const getLeaveStats = (empId: string) => {
    const employee = state.employees.find(e => e.id === empId);
    const extra = employee?.extra_leave_days || 0;
    const allowed = (state.config.leave_days || 21) + extra;
    
    // Auto-detect any days marked as "Other" in attendance database and count them as auto-deducted leave days
    let otherAttendanceDays = 0;
    if (state.attendance) {
      Object.keys(state.attendance).forEach(dateStr => {
        const day = state.attendance[dateStr] || {};
        if (day[empId]?.status === "Other") {
          otherAttendanceDays++;
        }
      });
    }

    const taken = state.leave
      .filter(l => l.empId === empId && l.status === "Approved")
      .reduce((sum, l) => sum + Number(l.days), 0) + otherAttendanceDays;
    const pending = state.leave
      .filter(l => l.empId === empId && l.status === "Pending")
      .reduce((sum, l) => sum + Number(l.days), 0);
    return { allowed, taken, otherAttendanceDays, remaining: Math.max(0, allowed - taken), pending };
  };

  const getAttendanceBreakdown = (empId: string) => {
    let present = 0;
    let absent = 0;
    let sick = 0;
    let onLeave = 0;

    Object.values(state.attendance).forEach(day => {
      const record = day[empId];
      if (record) {
        if (record.status === "Present") present++;
        if (record.status === "Absent") absent++;
        if (record.status === "Sick") sick++;
        if (record.status === "Leave") onLeave++;
      }
    });

    const totalDays = present + absent + sick + onLeave;
    const attendanceRate = totalDays > 0 ? Math.round((present / totalDays) * 100) : 100;
    return { present, absent, sick, onLeave, totalDays, attendanceRate };
  };

  const getLoansSummary = (empId: string) => {
    const employeeLoans = state.loans.filter(l => l.empId === empId);
    const totalPrincipal = employeeLoans.reduce((sum, l) => sum + l.amount, 0);
    const totalSettled = employeeLoans.reduce((sum, l) => sum + l.paid, 0);
    const remainingBalance = totalPrincipal - totalSettled;
    return { employeeLoans, totalPrincipal, totalSettled, remainingBalance };
  };

  const getAdvancesSummary = (empId: string) => {
    const employeeAdvances = state.advances.filter(a => a.empId === empId);
    const totalAdvances = employeeAdvances.reduce((sum, a) => sum + a.amount, 0);
    return { employeeAdvances, totalAdvances };
  };

  const getEmployeeComplianceCount = (empId: string) => {
    const warnings = state.disciplinary.filter(d => d.empId === empId);
    const documents = state.documents.filter(doc => doc.empId === empId);
    return { warnings, documents };
  };

  return (
    <>
      {!isDossierOnly && (
        <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* SECTION 1: SYSTEM VISITATION KPI STRIP */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Headcount */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-4">
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <User className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-450 uppercase tracking-wider">Teammate Registry</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mt-1">
              {totalEmployees} <span className="text-sm font-medium text-slate-400">active</span>
            </h3>
            <div className="mt-1 flex gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
              <span>{femaleCount} F</span> &bull; <span>{maleCount} M</span> &bull; <span>{otherCount} T</span>
            </div>
          </div>
        </div>

        {/* Contract Count & Risk Warning */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-4">
          <div className="rounded-xl bg-amber-50 p-3 text-amber-500 dark:bg-amber-950/40 dark:text-amber-400">
            <Calendar className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-450 uppercase tracking-wider">Maturity Controls</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mt-1">
              {contractExpiriesSoonCount} <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">expires &lt; 90 days</span>
            </h3>
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-tight mt-1">
              {expiredContractsCount} expired agreements unresolved
            </p>
          </div>
        </div>

        {/* Estimated Payroll Expenditure Sum */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-4">
          <div className="rounded-xl bg-purple-50 p-3 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-450 uppercase tracking-wider">Gross Payroll Commitment</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mt-1 font-mono">
              MWK {monthlyBasePayrollExpenditure.toLocaleString()}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">
              Monthly baseline commitment estimation
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: SEARCH FILTER CONSOLE & UTILITY TOOLBAR */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-white p-4.5 rounded-2xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex flex-1 flex-wrap gap-3 items-center">
          
          {/* Quick Search string ID or full Name */}
          <div className="relative w-full sm:max-w-xs shrink-0">
            <Search className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by ID, name, keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10.5 pr-4 text-xs font-semibold text-slate-800 shadow-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Department dropdown filters */}
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300"
            >
              <option value="">All Departments ({state.employees.length})</option>
              {["Kitchen", "Administration", "Operations", "Finance", "Human Resources"].map((dept) => {
                const count = state.employees.filter(e => e.dept === dept).length;
                return (
                  <option key={dept} value={dept}>
                    {dept} ({count})
                  </option>
                );
              })}
            </select>

            {/* Position specialized drop downs filters */}
            <select
              value={posFilter}
              onChange={(e) => setPosFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm dark:bg-slate-950 dark:border-slate-805 dark:text-slate-300"
            >
              <option value="">All Positions ({state.employees.length})</option>
              {uniquePositions.map(p => {
                const count = state.employees.filter(e => e.position === p).length;
                return (
                  <option key={p} value={p}>
                    {p} ({count})
                  </option>
                );
              })}
            </select>

            {/* Employment Status selective dropdown filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setSelectedEmpIds([]);
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm dark:bg-slate-950 dark:border-slate-805 dark:text-slate-300"
            >
              <option value="">All Statuses ({state.employees.length})</option>
              <option value="Active">Active ({state.employees.filter(e => !e.isTerminated).length})</option>
              <option value="Terminated">Terminated ({state.employees.filter(e => !!e.isTerminated).length})</option>
            </select>
          </div>
        </div>

        {/* View mode toggle and export action panel */}
        <div className="flex flex-wrap gap-2.5 items-center justify-end border-t border-slate-100 pt-3 lg:border-t-0 lg:pt-0 dark:border-slate-800">
          
          {/* Toggle View layout List / Grid */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-950 mr-2">
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-lg p-1.5 transition ${viewMode === "list" ? "bg-white text-slate-800 shadow-xs dark:bg-slate-900 dark:text-white" : "text-slate-400 hover:text-slate-600"}`}
              title="Table view list"
            >
              <ListFilter className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-lg p-1.5 transition ${viewMode === "grid" ? "bg-white text-slate-800 shadow-xs dark:bg-slate-900 dark:text-white" : "text-slate-400 hover:text-slate-600"}`}
              title="Bento Grid view dashboard"
            >
              <Grid className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => {
              setNewBranch(selectedBranch !== "all" ? selectedBranch : (state.branches[0] || ""));
              setIsAddOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-600 transition"
          >
            <Plus className="h-4 w-4" />
            New Teammate
          </button>
          
          <button
            onClick={() => {
              setBatchBranch(selectedBranch !== "all" ? selectedBranch : (state.branches[0] || ""));
              setIsBatchOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-850 transition"
          >
            <Grid className="h-4 w-4 text-slate-450" />
            Batch Entry
          </button>

          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-850 transition"
          >
            <Download className="h-4 w-4 text-slate-450" />
            Export CSV
          </button>
        </div>
      </div>

      {/* SECTION 2.5: BULK ACTIONS CONTROLLER */}
      {selectedEmpIds.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-slate-900 px-5 py-4 text-white shadow-lg border border-slate-800 dark:bg-black/50 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-800 p-2 text-emerald-400">
              <UserCheck2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold">{selectedEmpIds.length} Selected Teammates</p>
              <p className="text-[11px] text-slate-400">Apply bulk operations onto the selected subset.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {state.employees.some(e => selectedEmpIds.includes(e.id) && !e.isTerminated) ? (
              <button
                type="button"
                onClick={() => {
                  setTermEmpId(""); // Bulk indicators
                  setTermReason("Resigned");
                  setTermNotes("");
                  setTermDate(new Date().toISOString().split("T")[0]);
                  setIsTerminateOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-slate-950 transition"
              >
                <XCircle className="h-4 w-4" />
                Bulk Terminate Contracts
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                if (onRemoveEmployees) {
                  onRemoveEmployees(selectedEmpIds);
                } else {
                  selectedEmpIds.forEach(id => onRemoveEmployee(id));
                }
                setSelectedEmpIds([]);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white transition"
            >
              <Trash2 className="h-4 w-4" />
              Bulk Delete Profiles
            </button>

            <button
              type="button"
              onClick={() => setSelectedEmpIds([])}
              className="rounded-xl border border-slate-705 bg-slate-800 text-slate-300 hover:bg-slate-700 px-4 py-2 text-xs font-bold transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* SECTION 3: CONDITIONAL VIEW RENDERER (TABLE OR GRID) */}
      {viewMode === "list" ? (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-550 dark:border-slate-800 dark:bg-slate-900/50">
                  <th className="px-4 py-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && filtered.every(e => selectedEmpIds.includes(e.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const allFilteredIds = filtered.map(item => item.id);
                          setSelectedEmpIds(allFilteredIds);
                        } else {
                          setSelectedEmpIds([]);
                        }
                      }}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer h-4 w-4"
                    />
                  </th>
                  <th className="px-6 py-4">Serial ID</th>
                  <th className="px-6 py-4">Avatar</th>
                  <th className="px-6 py-4">Full Name</th>
                  <th className="px-6 py-4">Operational Branch</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Position Title</th>
                  <th className="px-6 py-4 text-right">Base Salary (MWK)</th>
                  <th className="px-6 py-4">Operational Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center text-slate-400 dark:text-slate-550">
                      No registered teammates matched current selected search variables.
                    </td>
                  </tr>
                ) : (
                  filtered.map(emp => {
                    // Check live leave bounds activity status
                    const isOnLeave = state.leave.some(
                      l => l.empId === emp.id && 
                      new Date().toISOString().split("T")[0] >= l.start && 
                      new Date().toISOString().split("T")[0] <= l.end &&
                      l.status === "Approved"
                    );

                    const contractAlert = getDaysRemainingValue(emp.cend) < 30;

                    return (
                      <tr
                        key={emp.id}
                        onClick={() => openProfile(emp)}
                        className={`group cursor-pointer hover:bg-slate-50/50 transition duration-150 dark:hover:bg-slate-850/20 ${
                          selectedEmpIds.includes(emp.id) ? "bg-emerald-50/30 dark:bg-emerald-950/10" : ""
                        }`}
                      >
                        <td className="px-4 py-4.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedEmpIds.includes(emp.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedEmpIds(prev => [...prev, emp.id]);
                              } else {
                                setSelectedEmpIds(prev => prev.filter(id => id !== emp.id));
                              }
                            }}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer h-4 w-4"
                          />
                        </td>
                        <td className="px-6 py-4.5 font-mono text-xs font-semibold text-slate-600 dark:text-slate-400">
                          {emp.id}
                        </td>
                        <td className="px-6 py-4.5">
                          <img
                            src={emp.photo || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop`}
                            alt={emp.first}
                            referrerPolicy="no-referrer"
                            className="h-10 w-10 rounded-full object-cover shadow-inner ring-2 ring-slate-100 dark:ring-slate-800"
                          />
                        </td>
                        <td className="px-6 py-4.5">
                          <div className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-550 transition-colors">
                            {emp.first} {emp.last}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">Gender: {emp.gender || "Other"}</div>
                        </td>
                        <td className="px-6 py-4.5 font-medium text-slate-650 dark:text-slate-300">
                          {emp.branch}
                        </td>
                        <td className="px-6 py-4.5">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-650 dark:bg-slate-950 dark:text-slate-400">
                            {emp.dept}
                          </span>
                        </td>
                        <td className="px-6 py-4.5 font-semibold text-slate-700 dark:text-slate-300">
                          {emp.position}
                        </td>
                        <td className="px-6 py-4.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {emp.salary.toLocaleString()}
                        </td>
                        <td className="px-6 py-4.5">
                          <div className="flex flex-col gap-1">
                            {emp.isTerminated ? (
                              <span className="inline-flex items-center gap-1 self-start rounded-full bg-rose-100/80 text-rose-800 px-2.5 py-0.5 text-xs font-bold leading-none dark:bg-rose-950/40 dark:text-rose-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                                Terminated
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 self-start rounded-full px-2.5 py-0.5 text-xs font-bold leading-none ${
                              isOnLeave 
                                ? "bg-orange-100/80 text-orange-850 dark:bg-orange-950/40 dark:text-orange-350" 
                                : "bg-emerald-100/85 text-emerald-850 dark:bg-emerald-950/40 dark:text-emerald-350"
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${isOnLeave ? "bg-orange-600 animate-pulse" : "bg-emerald-500"}`} />
                                {isOnLeave ? "On Leave" : "Active"}
                              </span>
                            )}
                            
                            {!emp.isTerminated && contractAlert && (
                              <span className="text-[9px] font-extrabold text-amber-500 flex items-center gap-0.5">
                                <AlertTriangle className="h-3 w-3" /> Contract Renewal Close
                              </span>
                            )}
                            {emp.isTerminated && emp.terminationDate && (
                              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-550">
                                Date: {emp.terminationDate}
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
      ) : (
        /* Bento Grid Style View with highly visual detail cards */
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.length === 0 ? (
            <div className="col-span-full py-20 text-center rounded-2xl border border-dashed border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-550">
              No registered teammates matched current selected search variables.
            </div>
          ) : (
            filtered.map(emp => {
              const isOnLeave = state.leave.some(
                l => l.empId === emp.id && 
                new Date().toISOString().split("T")[0] >= l.start && 
                new Date().toISOString().split("T")[0] <= l.end &&
                l.status === "Approved"
              );

              const daysRemaining = getDaysRemainingValue(emp.cend);
              const complianceCount = getEmployeeComplianceCount(emp.id);

              return (
                <div
                  key={emp.id}
                  onClick={() => openProfile(emp)}
                  className={`group relative cursor-pointer overflow-hidden rounded-2xl border p-5 shadow-sm hover:shadow-md transition dark:bg-slate-900 ${
                    selectedEmpIds.includes(emp.id) 
                      ? "border-emerald-500 ring-2 ring-emerald-500/20" 
                      : emp.isTerminated
                        ? "border-rose-100 dark:border-rose-950/30 bg-rose-50/20 dark:bg-rose-950/5"
                        : "border-slate-100 dark:border-slate-800"
                  }`}
                >
                  {/* Floating checkbox */}
                  <div className="absolute top-4 left-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedEmpIds.includes(emp.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEmpIds(prev => [...prev, emp.id]);
                        } else {
                          setSelectedEmpIds(prev => prev.filter(id => id !== emp.id));
                        }
                      }}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer h-4 w-4"
                    />
                  </div>

                  {/* Floating ID badge */}
                  <span className="absolute top-4 right-4 font-mono text-[10px] font-extrabold text-slate-400">
                    {emp.id}
                  </span>

                  <div className="flex items-start gap-4 pl-6">
                    <img
                      src={emp.photo || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop`}
                      alt={emp.first}
                      referrerPolicy="no-referrer"
                      className="h-14 w-14 rounded-full object-cover shadow-md ring-2 ring-slate-100 dark:ring-slate-800"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-550 transition-colors truncate">
                        {emp.first} {emp.last}
                      </h4>
                      <p className="text-xs font-semibold text-slate-550 dark:text-slate-400 truncate mt-0.5">
                        {emp.position}
                      </p>
                      
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-650 dark:bg-slate-950 dark:text-slate-400">
                          {emp.dept}
                        </span>
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                          {emp.branch}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Operational indicators metrics */}
                  <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-50 pt-4 dark:border-slate-800/60">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Base Salary</p>
                      <p className="font-mono text-xs font-bold text-slate-800 dark:text-white mt-0.5">
                        MWK {emp.salary.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Leave / Contract</p>
                      <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className={`h-2 w-2 rounded-full ${emp.isTerminated ? "bg-rose-500 animate-pulse" : isOnLeave ? "bg-orange-500" : "bg-emerald-500"}`} />
                        <span className="text-[11px] font-bold">
                          {emp.isTerminated ? "Terminated" : isOnLeave ? "On Leave" : "Active"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contract expiration flag status */}
                  <div className="mt-4 flex items-center justify-between text-[11px] bg-slate-50 rounded-xl px-3 py-2 dark:bg-slate-950/60">
                    <span className="text-slate-450 font-semibold">{emp.isTerminated ? "Terminated on:" : "Contract end:"}</span>
                    {emp.isTerminated ? (
                      <span className="text-rose-500 dark:text-rose-400 font-bold">{emp.terminationDate || "N/A"}</span>
                    ) : daysRemaining < 0 ? (
                      <span className="text-rose-600 dark:text-rose-400 font-extrabold flex items-center gap-1.5">
                        Expired!
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenewEmpId(emp.id);
                            setIsRenewOpen(true);
                          }}
                          className="px-2 py-0.5 rounded bg-emerald-500 hover:bg-emerald-600 text-[9px] text-white font-black uppercase tracking-wide cursor-pointer transition shadow"
                        >
                          Renew
                        </button>
                      </span>
                    ) : daysRemaining <= 90 ? (
                      <span className="text-amber-600 dark:text-amber-400 font-extrabold flex items-center gap-1.5">
                        {daysRemaining} days left
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenewEmpId(emp.id);
                            setIsRenewOpen(true);
                          }}
                          className="px-2 py-0.5 rounded bg-emerald-500 hover:bg-emerald-600 text-[9px] text-white font-black uppercase tracking-wide cursor-pointer transition shadow"
                        >
                          Extend
                        </button>
                      </span>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-300 font-bold">{emp.cend}</span>
                    )}
                  </div>

                  {/* Icons row with count and quick deletion triggers */}
                  <div className="mt-3.5 pt-2.5 border-t border-slate-50/40 flex items-center justify-between dark:border-slate-800/30">
                    <div className="flex gap-2.5 text-[10px] font-bold text-slate-450 uppercase">
                      <span>📂 {complianceCount.documents.length} Files</span>
                      <span>⚠️ {complianceCount.warnings.length} Warnings</span>
                    </div>

                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openProfile(emp);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {!emp.isTerminated ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTermEmpId(emp.id);
                            setTermReason("Resigned");
                            setTermNotes("");
                            setTermDate(new Date().toISOString().split("T")[0]);
                            setIsTerminateOpen(true);
                          }}
                          className="rounded-lg p-1.5 text-amber-500 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40"
                          title="Terminate contract"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveEmployee(emp.id);
                        }}
                        className="rounded-lg p-1.5 text-rose-450 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MODAL 1: REGISTER NEW TEAMMATE INDIVIDUAL */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Teammate Registry Induction"
        subtitle="Provide core administrative profiles parameters to index a new team sheet."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-750 uppercase tracking-wide dark:text-slate-350 mb-1">
                First Name
              </label>
              <input
                type="text"
                required
                placeholder="Alinafe"
                value={newFirst}
                onChange={(e) => setNewFirst(liveCapitalize(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-750 uppercase tracking-wide dark:text-slate-350 mb-1">
                Last Name
              </label>
              <input
                type="text"
                required
                placeholder="Phiri"
                value={newLast}
                onChange={(e) => setNewLast(liveCapitalize(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-755 uppercase tracking-wide mb-1">
                Gender Identification
              </label>
              <select
                value={newGender}
                onChange={(e) => setNewGender(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-750 uppercase tracking-wide dark:text-slate-350 mb-1">
                Department
              </label>
              <select
                value={newDept}
                onChange={(e) => setNewDept(e.target.value as Employee["dept"])}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
              >
                <option value="Operations">Operations</option>
                <option value="Kitchen">Kitchen</option>
                <option value="Administration">Administration</option>
                <option value="Finance">Finance</option>
                <option value="Human Resources">Human Resources</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-750 uppercase tracking-wide dark:text-slate-350 mb-1">
                Branch Assignment
              </label>
              <select
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
              >
                <option value="">Choose active branch</option>
                {state.branches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-750 uppercase tracking-wide dark:text-slate-350 mb-1">
                Operational Position Title
              </label>
              <select
                value={newPosition}
                onChange={(e) => handlePositionChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
              >
                <option value="">Select or write below...</option>
                <option value="Head Chef">Head Chef</option>
                <option value="Chef">Chef</option>
                <option value="Porter">Porter</option>
                <option value="Waiter">Waiter</option>
                <option value="Waitress">Waitress</option>
                <option value="Administrator">Administrator</option>
                <option value="Finance Lead">Finance Lead</option>
                <option value="Human Resources Executive">Human Resources Executive</option>
              </select>
              <input
                type="text"
                placeholder="Or specify custom title"
                value={newPosition}
                onChange={(e) => setNewPosition(liveCapitalize(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-750 uppercase tracking-wide dark:text-slate-350 mb-1">
                Base Monthly Salary (MWK)
              </label>
              <input
                type="number"
                required
                value={newSalary === 0 ? "" : newSalary}
                onChange={(e) => setNewSalary(e.target.value === "" ? 0 : Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pb-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">
                Contract Start Date
              </label>
              <input
                type="date"
                value={newCStart}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewCStart(val);
                  if (val) {
                    setNewCEnd(calculateOneYearExpiry(val));
                  }
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1">
                Contract Expiry Date
              </label>
              <input
                type="date"
                value={newCEnd}
                onChange={(e) => setNewCEnd(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 flex gap-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="w-1/2 rounded-xl border border-slate-200 px-4 py-2 hover:bg-slate-50 dark:border-slate-750 dark:text-slate-300 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-1/2 rounded-xl bg-emerald-500 py-2 text-sm font-bold text-white shadow-md hover:bg-emerald-600 transition"
            >
              Induct Employee
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: BATCH STAFF UPLOAD (CSV EXTRAS) */}
      <Modal
        isOpen={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        title="Batch Staff upload"
        subtitle="Induct an entire list of operational staff records instantly using standard CSV commas data parsing."
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleBatchSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide dark:text-slate-300 mb-1">
              Select Branch Assignment Scope
            </label>
            <select
              value={batchBranch}
              onChange={(e) => setBatchBranch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
            >
              {state.branches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide dark:text-slate-350 mb-1 font-mono text-[10px]">
              DATA LINES (Format: First Name, Last Name, Position Title, Salary Number)
            </label>
            <textarea
              required
              rows={8}
              placeholder="Blessings, Phiri, Chef, 450000&#10;Tadala, Chimwaza, Waitress, 280000"
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3.5 font-mono text-xs focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="rounded-xl bg-amber-500/10 p-4 text-xs text-amber-800 flex gap-2.5 items-start dark:text-amber-400">
            <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Standard Line Parser:</p>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                Supply one teammate profile on each line with fields segregated with a comma. The Capital naming converter will align typography inputs on submit.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 flex gap-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsBatchOpen(false)}
              className="w-1/2 rounded-xl border border-slate-200 px-4 py-2 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-1/2 rounded-xl bg-emerald-500 py-2 text-sm font-bold text-white shadow-md hover:bg-emerald-600 transition"
            >
              Inject Teammates Batch
            </button>
          </div>
        </form>
      </Modal>
        </div>
      )}

      {/* MODAL 3: ADVANCED 360-DEGREE TEAMMATE DOSSIER AND FINANCIAL CALCULATOR */}
      <Modal
        isOpen={profileEmployee !== null}
        onClose={() => setProfileEmployee(null)}
        title="Teammate Administrative Dossier"
        subtitle="360° corporate view, compliance registry, and reactive pension/tax deduction paycheck estimates."
        maxWidthClass="max-w-4xl"
      >
        {profileEmployee && (() => {
          const leave = getLeaveStats(profileEmployee.id);
          const att = getAttendanceBreakdown(profileEmployee.id);
          const loans = getLoansSummary(profileEmployee.id);
          const adv = getAdvancesSummary(profileEmployee.id);
          const comp = getEmployeeComplianceCount(profileEmployee.id);
          
          const daysRemaining = getDaysRemainingValue(profileEmployee.cend);
          const isExpired = daysRemaining < 0;

          // Compute Estimations Paycheck Breakdown dynamically on active Config definitions
          const base = profileEmployee.salary;
          const payePct = state.config.paye || 30;
          const pensionPct = state.config.pension || 5;

          const estPaye = parseFloat(((base * payePct) / 100).toFixed(0));
          const estPension = parseFloat(((base * pensionPct) / 100).toFixed(0));
          
          // Loan expected deduction standard (Loan base / term)
          const estLoanDeduction = loans.employeeLoans.reduce((sum, ln) => {
            const expectPaid = Math.round(ln.amount / ln.months);
            const remaining = ln.amount - ln.paid;
            return sum + Math.min(expectPaid, remaining);
          }, 0);

          // Absenteeism penalty computed values
          const absentDeductionAmt = att.absent * (state.config.daily_absent_deduction || 5000);

          // Disciplinary deductions or dynamic deduction approvals
          const penaltiesDeductionAmt = state.deductionApprovals
            .filter(d => d.empId === profileEmployee.id)
            .reduce((sum, d) => sum + d.amount, 0);

          const totalDeductionsSum = estPaye + estPension + estLoanDeduction + adv.totalAdvances + absentDeductionAmt + penaltiesDeductionAmt;
          const netSalaryReceived = Math.max(0, base - totalDeductionsSum);

          return (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* LEFT PROFILE CARD (ID Badge context) */}
              <div className="md:col-span-4 border-b border-slate-100 pb-5 md:border-b-0 md:border-r md:pb-0 md:pr-6 dark:border-slate-800">
                <div className="flex flex-col items-center text-center">
                  <div className="relative">
                    <img
                      src={profileEmployee.photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop"}
                      alt={profileEmployee.first}
                      referrerPolicy="no-referrer"
                      className="h-24 w-24 rounded-full object-cover shadow-md ring-4 ring-slate-100 dark:ring-slate-800"
                    />
                    <span className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white dark:border-slate-900 ${
                      state.leave.some(l => l.empId === profileEmployee.id && new Date().toISOString().split("T")[0] >= l.start && new Date().toISOString().split("T")[0] <= l.end && l.status === "Approved")
                        ? "bg-orange-500 animate-ping"
                        : "bg-emerald-500"
                    }`} />
                  </div>

                  <h3 className="text-lg font-black text-slate-900 dark:text-white mt-4">
                    {profileEmployee.first} {profileEmployee.last}
                  </h3>
                  
                  <p className="font-mono text-xs font-bold text-slate-450 uppercase tracking-widest mt-1">
                    ID: {profileEmployee.id}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1 justify-center">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-650 dark:bg-slate-950 dark:text-slate-400">
                      {profileEmployee.dept}
                    </span>
                    <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                      {profileEmployee.branch}
                    </span>
                  </div>

                  {/* Contract alert bar */}
                  <div className="mt-4 w-full bg-slate-50 rounded-xl p-3 text-xs dark:bg-slate-950/50">
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-400">Contract Standing</span>
                      <span className={isExpired ? "text-rose-500 font-extrabold" : daysRemaining < 90 ? "text-amber-500 font-extrabold" : "text-emerald-500"}>
                        {isExpired ? "Expired" : `${daysRemaining} days left`}
                      </span>
                    </div>

                    <div className="mt-1 text-slate-450 text-[10px] flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" /> Expiry: {profileEmployee.cend}
                      </div>
                      <button
                        type="button"
                        disabled={!isExpired}
                        onClick={() => {
                          setRenewEmpId(profileEmployee.id);
                          setIsRenewOpen(true);
                        }}
                        className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shadow-sm transition ${
                          isExpired 
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer" 
                            : "bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500"
                        }`}
                      >
                        Renew
                      </button>
                    </div>
                  </div>

                  {/* Vault Compliance checklist summary widget */}
                  <div className="mt-4 w-full text-left space-y-2">
                    <h5 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Compliance Checklist</h5>
                    
                    <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-350">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className={`h-3.5 w-3.5 ${profileEmployee.national ? "text-emerald-500" : "text-slate-300"}`} />
                        National ID Ref
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">{profileEmployee.national || "MISSING"}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-350">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className={`h-3.5 w-3.5 ${comp.documents.length > 0 ? "text-emerald-500" : "text-slate-300"}`} />
                        Contract Files
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">{comp.documents.filter(d => d.type === "Employment Contract File" || d.type.includes("Contract")).length > 0 ? "ARCHIVED" : "EMPTY"}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-350">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className={`h-3.5 w-3.5 ${comp.warnings.length === 0 ? "text-emerald-500" : "text-amber-500 animate-pulse"}`} />
                        Inviolable Integrity
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {comp.warnings.length} warning{comp.warnings.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Profile Edit Toggle button */}
                  <div className="mt-6 w-full">
                    {!isEditDossierMode ? (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadDossierHTML(profileEmployee)}
                          className="w-full text-center rounded-xl bg-slate-900 hover:bg-slate-850 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-white py-2 text-xs font-black shadow-md transition flex items-center justify-center gap-1.5"
                        >
                          <Printer className="h-4 w-4" />
                          View / Print Dossier Report
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditFirst(profileEmployee.first);
                            setEditLast(profileEmployee.last);
                            setEditPosition(profileEmployee.position);
                            setEditDept(profileEmployee.dept);
                            setEditBranch(profileEmployee.branch);
                            setEditSalary(profileEmployee.salary);
                            setEditNational(profileEmployee.national || "");
                            setEditGender(profileEmployee.gender || "Female");
                            setEditCStart(profileEmployee.cstart || "");
                            setEditCEnd(profileEmployee.cend || "");
                            setIsEditDossierMode(true);
                          }}
                          className="w-full text-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:border-slate-755 dark:text-slate-300 transition"
                        >
                          Modify Profile Records
                        </button>
                        
                        {!profileEmployee.isTerminated ? (
                          <button
                            type="button"
                            onClick={() => {
                              setTermEmpId(profileEmployee.id);
                              setTermReason("Resigned");
                              setTermNotes("");
                              setTermDate(new Date().toISOString().split("T")[0]);
                              setIsTerminateOpen(true);
                            }}
                            className="w-full text-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 py-2 text-xs font-bold transition flex items-center justify-center gap-1.5"
                          >
                            <XCircle className="h-4 w-4" />
                            Terminate Contract
                          </button>
                        ) : (
                          <div className="w-full bg-rose-50/50 border border-rose-100/50 text-rose-700 dark:bg-rose-955/10 dark:border-rose-900/30 dark:text-rose-400 p-2.5 rounded-xl text-left text-xs font-medium">
                            <p className="font-bold uppercase text-[9px] tracking-wider text-rose-500">Employment Terminated</p>
                            <p className="mt-0.5 font-bold">{profileEmployee.terminationReason || "N/A"}</p>
                            <p className="text-[10px] mt-0.5 opacity-80">Effective Date: {profileEmployee.terminationDate || "N/A"}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditDossierMode(false)}
                          className="w-1/2 text-center rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:bg-slate-950 dark:text-slate-400 transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={saveDossierEdits}
                          className="w-1/2 text-center rounded-xl bg-emerald-500 py-2 text-xs font-bold text-white hover:bg-emerald-600 shadow-md transition"
                        >
                          Save Profile
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* RIGHT DOSSIER TABS CONTAINER */}
              <div className="md:col-span-8 flex flex-col h-full min-h-[480px]">
                
                {/* Visual tabs control switch bar */}
                <div className="flex gap-1 border-b border-slate-100 dark:border-slate-800 shrink-0 mb-4 overflow-x-auto scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <button
                    onClick={() => setActiveDossierTab("overview")}
                    data-dossier-tab="overview"
                    className={`pb-2 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${activeDossierTab === "overview" ? "border-emerald-500 text-emerald-650 dark:text-emerald-400" : "border-transparent text-slate-450 hover:text-slate-700"}`}
                  >
                    Dossier Information
                  </button>
                  <button
                    onClick={() => setActiveDossierTab("financials")}
                    data-dossier-tab="financials"
                    className={`pb-2 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${activeDossierTab === "financials" ? "border-emerald-500 text-emerald-650 dark:text-emerald-400" : "border-transparent text-slate-450 hover:text-slate-700"}`}
                  >
                    Pay Slip Ledger Calculator
                  </button>
                  <button
                    onClick={() => setActiveDossierTab("attendance")}
                    data-dossier-tab="attendance"
                    className={`pb-2 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${activeDossierTab === "attendance" ? "border-emerald-500 text-emerald-650 dark:text-emerald-400" : "border-transparent text-slate-450 hover:text-slate-700"}`}
                  >
                    Leave & Time Tracker
                  </button>
                  <button
                    onClick={() => setActiveDossierTab("compliance")}
                    data-dossier-tab="compliance"
                    className={`pb-2 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${activeDossierTab === "compliance" ? "border-emerald-500 text-emerald-650 dark:text-emerald-400" : "border-transparent text-slate-450 hover:text-slate-700"}`}
                  >
                    Compliance Warnings ({comp.warnings.length})
                  </button>
                </div>

                {/* Tab content space */}
                <div className="flex-1 overflow-y-auto pr-1">
                  
                  {/* TAB A: OVERVIEW / EDIT DETAILS */}
                  {activeDossierTab === "overview" && (
                    <div className="space-y-4">
                      {!isEditDossierMode ? (
                        /* Read Only View */
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          
                          <div className="bg-slate-50 rounded-xl p-3.5 dark:bg-slate-950/60">
                            <h6 className="text-[10px] text-slate-400 font-bold uppercase mb-1">Full Legal Name</h6>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">
                              {profileEmployee.first} {profileEmployee.last}
                            </p>
                          </div>

                          <div className="bg-slate-50 rounded-xl p-3.5 dark:bg-slate-950/60">
                            <h6 className="text-[10px] text-slate-400 font-bold uppercase mb-1">Gender Position Allocation</h6>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">
                              {profileEmployee.gender || "Female"}
                            </p>
                          </div>

                          <div className="bg-slate-50 rounded-xl p-3.5 dark:bg-slate-950/60">
                            <h6 className="text-[10px] text-slate-400 font-bold uppercase mb-1">Contract Position Title</h6>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">
                              {profileEmployee.position}
                            </p>
                          </div>

                          <div className="bg-slate-50 rounded-xl p-3.5 dark:bg-slate-950/60">
                            <h6 className="text-[10px] text-slate-400 font-bold uppercase mb-1">Corporate Department</h6>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">
                              {profileEmployee.dept}
                            </p>
                          </div>

                          <div className="bg-slate-50 rounded-xl p-3.5 dark:bg-slate-950/60">
                            <h6 className="text-[10px] text-slate-400 font-bold uppercase mb-1">Operational Assignation Branch</h6>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">
                              {profileEmployee.branch}
                            </p>
                          </div>

                          <div className="bg-slate-50 rounded-xl p-3.5 dark:bg-slate-950/60">
                            <h6 className="text-[10px] text-slate-400 font-bold uppercase mb-1">National ID Document Number</h6>
                            <p className="text-sm font-mono font-bold text-slate-805 dark:text-white">
                              {profileEmployee.national || "N/A — Not Stored"}
                            </p>
                          </div>

                          <div className="bg-slate-50 rounded-xl p-3.5 dark:bg-slate-950/60">
                            <h6 className="text-[10px] text-slate-400 font-bold uppercase mb-1">Contract Commencement Start</h6>
                            <p className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-slate-400" /> {profileEmployee.cstart || "N/A"}
                            </p>
                          </div>

                          <div className="bg-slate-50 rounded-xl p-3.5 dark:bg-slate-950/60">
                            <h6 className="text-[10px] text-slate-400 font-bold uppercase mb-1">Contract Official Termination date</h6>
                            <p className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-slate-400" /> {profileEmployee.cend || "N/A"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* Complete Editable Form Input State */
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-extrabold uppercase text-slate-450 mb-1">First Name</label>
                              <input
                                type="text"
                                value={editFirst}
                                onChange={(e) => setEditFirst(liveCapitalize(e.target.value))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold uppercase text-slate-450 mb-1">Last Name</label>
                              <input
                                type="text"
                                value={editLast}
                                onChange={(e) => setEditLast(liveCapitalize(e.target.value))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-extrabold uppercase text-slate-450 mb-1">Gender</label>
                              <select
                                value={editGender}
                                onChange={(e) => setEditGender(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                              >
                                <option value="Female">Female</option>
                                <option value="Male">Male</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold uppercase text-slate-450 mb-1">National ID</label>
                              <input
                                type="text"
                                value={editNational}
                                onChange={(e) => setEditNational(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-extrabold uppercase text-slate-450 mb-1">Department</label>
                              <select
                                value={editDept}
                                onChange={(e) => setEditDept(e.target.value as Employee["dept"])}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                              >
                                <option value="Operations">Operations</option>
                                <option value="Kitchen">Kitchen</option>
                                <option value="Administration">Administration</option>
                                <option value="Finance">Finance</option>
                                <option value="Human Resources">Human Resources</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold uppercase text-slate-450 mb-1">Branch</label>
                              <select
                                value={editBranch}
                                onChange={(e) => setEditBranch(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                              >
                                {state.branches.map(b => (
                                  <option key={b} value={b}>{b}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-extrabold uppercase text-slate-450 mb-1">Job Title</label>
                              <input
                                type="text"
                                value={editPosition}
                                onChange={(e) => setEditPosition(liveCapitalize(e.target.value))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold uppercase text-slate-450 mb-1">Base Monthly Salary (MWK)</label>
                              <input
                                type="number"
                                value={editSalary === 0 ? "" : editSalary}
                                onChange={(e) => setEditSalary(e.target.value === "" ? 0 : Number(e.target.value))}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 dark:border-slate-850">
                            <div>
                              <label className="block text-[10px] font-extrabold uppercase text-slate-450 mb-1">Commence Start</label>
                              <input
                                type="date"
                                value={editCStart}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setEditCStart(val);
                                  if (val) {
                                    setEditCEnd(calculateOneYearExpiry(val));
                                  }
                                }}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold uppercase text-slate-450 mb-1">Termination Expiry</label>
                              <input
                                type="date"
                                value={editCEnd}
                                onChange={(e) => setEditCEnd(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB B: PAY SLIP DYNAMIC CALCULATION */}
                  {activeDossierTab === "financials" && (
                    <div className="space-y-5">
                      
                      {/* Estimate Net salary overview visual box */}
                      <div className="rounded-2xl bg-slate-950 p-5 text-white shadow-md relative overflow-hidden flex items-center justify-between dark:bg-slate-950/80">
                        <div className="absolute right-0 top-0 translate-x-12 -translate-y-4 opacity-10">
                          <DollarSign className="h-44 w-44" />
                        </div>
                        <div>
                          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Calculated Estimated Monthly Net Salary</p>
                          <h2 className="text-3xl font-black mt-1 font-mono tracking-tight text-white leading-none">
                            MWK {netSalaryReceived.toLocaleString()}
                          </h2>
                          <p className="text-[10px] text-slate-400 font-semibold mt-1.5 uppercase">
                            Gross Contract base: MWK {base.toLocaleString()}
                          </p>
                        </div>
                        <span className="rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                          Live Simulate
                        </span>
                      </div>

                      {/* Paycheck breakdown items list */}
                      <div>
                        <h5 className="text-[10px] font-bold uppercase text-slate-450 tracking-wider mb-2.5">Monthly Pay Slip Items Breakdown</h5>
                        
                        <div className="divide-y divide-slate-100 bg-slate-50 rounded-2xl p-4 space-y-3.5 dark:bg-slate-950/40 dark:divide-slate-850">
                          {/* Gross Salary line */}
                          <div className="flex justify-between items-center text-xs font-bold pt-1 text-slate-800 dark:text-white">
                            <span>Contract Base Rate</span>
                            <span className="font-mono text-emerald-600 dark:text-emerald-400">+MWK {base.toLocaleString()}</span>
                          </div>

                          {/* PAYE line */}
                          <div className="flex justify-between items-center text-xs font-medium pt-3 text-slate-650 dark:text-slate-350">
                            <span className="flex items-center gap-1.5">
                              PAYE Tax Code Allocation
                              <span className="rounded bg-rose-50 px-1 py-0.5 text-[9px] font-extrabold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">{payePct}% MWK Rate</span>
                            </span>
                            <span className="font-mono text-rose-600 dark:text-rose-400">-MWK {estPaye.toLocaleString()}</span>
                          </div>

                          {/* Pension Contribution */}
                          <div className="flex justify-between items-center text-xs font-medium pt-3.5 text-slate-650 dark:text-slate-350">
                            <span className="flex items-center gap-1.5">
                              National Pension Contribution
                              <span className="rounded bg-sky-50 px-1 py-0.5 text-[9px] font-extrabold text-sky-700 dark:bg-sky-950/40 dark:text-sky-400">{pensionPct}% statutory</span>
                            </span>
                            <span className="font-mono text-rose-600 dark:text-rose-400">-MWK {estPension.toLocaleString()}</span>
                          </div>

                          {/* Loan reduction deduction line */}
                          {estLoanDeduction > 0 && (
                            <div className="flex justify-between items-center text-xs font-medium pt-3.5 text-slate-655 dark:text-slate-350">
                              <span className="flex items-center gap-1.5">
                                Active Loans Monthly Repayment
                                <span className="rounded bg-purple-50 px-1 py-0.5 text-[9px] font-extrabold text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">Ledger</span>
                              </span>
                              <span className="font-mono text-rose-600 dark:text-rose-450">-MWK {estLoanDeduction.toLocaleString()}</span>
                            </div>
                          )}

                          {/* Advance taken deduction lines */}
                          {adv.totalAdvances > 0 && (
                            <div className="flex justify-between items-center text-xs font-medium pt-3.5 text-slate-650 dark:text-slate-350">
                              <span className="flex items-center gap-1.5">
                                Mid-Month Salary Advances Total
                                <span className="rounded bg-amber-50 px-1 py-0.5 text-[9px] font-extrabold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">{adv.employeeAdvances.length} advance{adv.employeeAdvances.length !== 1 ? "s" : ""}</span>
                              </span>
                              <span className="font-mono text-rose-600 dark:text-rose-405">-MWK {adv.totalAdvances.toLocaleString()}</span>
                            </div>
                          )}

                          {/* Absenteeism deduction line */}
                          {absentDeductionAmt > 0 && (
                            <div className="flex justify-between items-center text-xs font-medium pt-3.5 text-slate-650 dark:text-slate-350">
                              <span className="flex items-center gap-1.5">
                                Shift Absences Ded. (Unexcused)
                                <span className="rounded bg-red-50 px-1 py-0.5 text-[9px] font-extrabold text-red-700 dark:bg-red-950/40 dark:text-red-400">{att.absent} day{att.absent !== 1 ? "s" : ""} absent</span>
                              </span>
                              <span className="font-mono text-rose-600 dark:text-rose-400">-MWK {absentDeductionAmt.toLocaleString()}</span>
                            </div>
                          )}

                          {/* Other Penalties and discipline deduction lines */}
                          {penaltiesDeductionAmt > 0 && (
                            <div className="flex justify-between items-center text-xs font-medium pt-3.5 text-slate-655 dark:text-slate-350">
                              <span className="flex items-center gap-1.5">
                                Disciplinary Deduction Approvals
                              </span>
                              <span className="font-mono text-rose-600 dark:text-rose-400">-MWK {penaltiesDeductionAmt.toLocaleString()}</span>
                            </div>
                          )}

                          {/* Absolute Total Deductions Line */}
                          <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wide pt-4 text-slate-500">
                            <span>Expected Accumulative Deductions Sum</span>
                            <span className="font-mono">MWK {totalDeductionsSum.toLocaleString()}</span>
                          </div>

                        </div>
                      </div>

                      {/* Display loans with repayment metrics */}
                      {loans.employeeLoans.length > 0 && (
                        <div className="rounded-xl border border-purple-100 bg-purple-50/20 p-4 dark:border-purple-900/10 dark:bg-purple-950/10">
                          <h6 className="text-xs font-black uppercase text-purple-800 dark:text-purple-400 tracking-wide flex items-center gap-1.5 mb-2">
                            <Coins className="h-4 w-4" /> Active Loans Installments Portfolio
                          </h6>
                          <div className="space-y-3 mt-3">
                            {loans.employeeLoans.map((l, index) => {
                              const remaining = l.amount - l.paid;
                              const pctPaid = Math.round((l.paid / l.amount) * 100);
                              return (
                                <div key={index} className="space-y-1.5 border-b border-purple-100/30 pb-2.5 last:border-b-0 last:pb-0">
                                  <div className="flex justify-between text-xs font-semibold">
                                    <span className="text-slate-650 dark:text-slate-350">Facility Amount: MWK {l.amount.toLocaleString()}</span>
                                    <span className="font-mono text-purple-700 dark:text-purple-400">{pctPaid}% Settled</span>
                                  </div>
                                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-purple-600 h-1.5" style={{ width: `${pctPaid}%` }} />
                                  </div>
                                  <div className="flex justify-between text-[10px] text-slate-450 font-bold">
                                    <span>Paid: MWK {l.paid.toLocaleString()}</span>
                                    <span className="text-purple-700 dark:text-purple-400">Remaining Balance: MWK {remaining.toLocaleString()} ({l.months} month period)</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* TAB C: TIME & LEAVE TRACKING AND ATTENDANCE */}
                  {activeDossierTab === "attendance" && (
                    <div className="space-y-5">
                      
                      {/* Grid metrics elements */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Attendance Rate percentage info */}
                        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950/60">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Monthly Reliability Rate</p>
                          <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1 leading-tight font-mono">
                            {att.attendanceRate}%
                          </h3>
                          <div className="mt-1 flex gap-2 text-[10px] text-slate-450 font-bold uppercase">
                            <span className="text-emerald-500">{att.present} Present</span> &bull; 
                            <span className="text-rose-500">{att.absent} Absent</span>
                          </div>
                        </div>

                        {/* Annual Leave Days tracker */}
                        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950/60">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Allocated Leave Residual</p>
                          <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 leading-tight font-mono">
                            {leave.remaining} <span className="text-xs font-semibold text-slate-400 uppercase">Days Left</span>
                          </h3>
                          <div className="mt-1 flex gap-2 text-[10px] text-slate-450 font-bold uppercase">
                            <span>{leave.allowed} allowed</span> &bull; 
                            <span className="text-yellow-600">{leave.pending} request pending</span>
                          </div>
                        </div>
                      </div>

                      {/* Display breakdown list of leave states requests */}
                      <div>
                        <h6 className="text-[10px] font-bold uppercase text-slate-450 tracking-wider mb-2">Historical Leave Records Block</h6>
                        
                        {state.leave.filter(l => l.empId === profileEmployee.id).length === 0 ? (
                          <div className="p-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl dark:border-slate-805">
                            No leave sheets recorded in historical register.
                          </div>
                        ) : (
                          <div className="overflow-hidden border border-slate-100 rounded-xl divide-y divide-slate-100 bg-slate-50 dark:bg-slate-950/20 dark:border-slate-805 dark:divide-slate-850">
                            {state.leave
                              .filter(l => l.empId === profileEmployee.id)
                              .map((le, idxOr) => (
                                <div key={idxOr} className="p-3 text-xs flex justify-between items-center">
                                  <div>
                                    <div className="font-bold">{le.type}</div>
                                    <div className="text-[10px] text-slate-450 mt-0.5">Duration: {le.start} to {le.end}</div>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-bold underline">{le.days} days used</span>
                                    <span className={`block text-[9px] font-black uppercase mt-1 ${
                                      le.status === "Approved" ? "text-emerald-500" : le.status === "Pending" ? "text-amber-500" : "text-rose-500"
                                    }`}>{le.status}</span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>

                      {/* Complete absenteeism/leaves metrics info */}
                      <div className="rounded-xl p-3.5 bg-slate-50 text-slate-550 flex gap-2.5 items-start text-xs dark:bg-slate-950/60">
                        <Info className="h-4.5 w-4.5 text-slate-400 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-755 dark:text-slate-300">Leave Allotments Warning Policy:</p>
                          <p className="mt-1 text-slate-450">
                            The standard leave quota of {leave.allowed} days is updated dynamically on approved bookings. Exceeding unpaid leave counts results in standard flat day-absent rate deductions on current payroll run.
                          </p>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB D: COMPLIANCE WARNINGS RECORDS */}
                  {activeDossierTab === "compliance" && (
                    <div className="space-y-4">
                      
                      <div className="flex items-center justify-between">
                        <h5 className="text-[10px] font-bold uppercase text-slate-450 tracking-wider">Disciplinary warning notes</h5>
                        <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold text-rose-700 dark:bg-rose-950/30 dark:text-rose-450">LABOUR COMPLIANCE</span>
                      </div>

                      {comp.warnings.length === 0 ? (
                        <div className="text-center p-14 rounded-2xl border border-dashed border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-500">
                          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto stroke-1" />
                          <h6 className="font-bold text-slate-700 mt-3 dark:text-slate-300">Pristine Compliance Standing</h6>
                          <p className="text-[10px] text-slate-400 max-w-xs mx-auto mt-1">
                            This teammate has no disciplinary warning flags registered on their current operational dossier sheets.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {comp.warnings.map((rec) => (
                            <div key={rec.id} className="rounded-xl border border-rose-100 bg-rose-50/20 p-4 dark:border-rose-955/20 dark:bg-rose-950/15">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="rounded bg-rose-100 px-2 py-0.5 text-[9px] font-extrabold text-rose-800 dark:bg-rose-950/50 dark:text-rose-400">
                                    {rec.action}
                                  </span>
                                  <h6 className="font-black text-slate-850 text-xs dark:text-white mt-2">
                                    {rec.desc}
                                  </h6>
                                </div>
                                <span className="font-mono text-slate-400 text-[10px] font-bold">
                                  {rec.date}
                                </span>
                              </div>
                              <div className="text-[10px] font-bold text-rose-700 dark:text-rose-400 mt-2.5 uppercase tracking-wide">
                                Regulatory Case Reference Index: {rec.id}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Display warning about penalties */}
                      {state.deductionApprovals.filter(d => d.empId === profileEmployee.id).length > 0 && (
                        <div className="rounded-xl border border-rose-100 bg-rose-550/10 p-3.5 dark:border-rose-900/10">
                          <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-400 font-bold text-xs uppercase tracking-wide">
                            <ShieldAlert className="h-4.5 w-4.5 animate-bounce" /> Absences Penalties Enforced
                          </div>
                          <div className="divide-y divide-rose-100/30 mt-2 space-y-2 dark:divide-rose-900/10">
                            {state.deductionApprovals
                              .filter(d => d.empId === profileEmployee.id)
                              .map((p, idxPen) => (
                                <div key={idxPen} className="flex justify-between text-xs pt-2">
                                  <div>
                                    <p className="font-bold text-rose-850 dark:text-rose-350">{p.reason}</p>
                                    <p className="font-mono text-[9px] text-slate-400 mt-0.5">{p.date}</p>
                                  </div>
                                  <span className="font-mono font-bold text-rose-700 dark:text-rose-400 text-right">
                                    -MWK {p.amount.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>

                {/* Dossier footer exit panel actions */}
                <div className="border-t border-slate-100 pt-4 shrink-0 flex gap-3 dark:border-slate-800 mt-4.5">
                  <button
                    type="button"
                    onClick={() => setProfileEmployee(null)}
                    className="w-full text-center rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 py-2.5 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:border-slate-750 dark:text-slate-300 transition"
                  >
                    Release Dossier Access
                  </button>
                </div>

              </div>

            </div>
          );
        })()}
      </Modal>

      {/* MODAL 4: CONTRACT TERMINATION / DISMISSAL */}
      <Modal
        isOpen={isTerminateOpen}
        onClose={() => setIsTerminateOpen(false)}
        title={termEmpId ? "Contract Termination" : "Bulk Contract Termination"}
        subtitle={
          termEmpId 
            ? `Legally terminate the employment contract for employee ID: ${termEmpId}.`
            : `Bulk terminate employment contracts for ${selectedEmpIds.length} selected personnel.`
        }
        maxWidthClass="max-w-md"
      >
        {(() => {
          const targetEmp = termEmpId ? state.employees.find(e => e.id === termEmpId) : null;
          return (
            <form onSubmit={handleTerminateSubmit} className="space-y-4">
              {termEmpId && targetEmp && (
                <div className="flex items-center gap-3 bg-rose-50/50 p-3 rounded-xl border border-rose-100/50 dark:bg-rose-950/20 dark:border-rose-900/30">
                  <img
                    src={targetEmp.photo || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop`}
                    alt={targetEmp.first}
                    referrerPolicy="no-referrer"
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div>
                    <h5 className="font-bold text-slate-800 dark:text-white">
                      {targetEmp.first} {targetEmp.last}
                    </h5>
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">{targetEmp.position} • {targetEmp.dept}</p>
                  </div>
                </div>
              )}

              {!termEmpId && (
                <div className="bg-amber-50/40 p-3 rounded-xl border border-amber-100/50 dark:bg-amber-955/10 dark:border-amber-900/40">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Applying bulk contract closure onto:
                  </p>
                  <div className="mt-1.5 max-h-24 overflow-y-auto flex flex-wrap gap-1 text-[11px] font-bold">
                    {selectedEmpIds.map(id => {
                      const emp = state.employees.find(e => e.id === id);
                      if (!emp) return null;
                      return (
                        <span key={id} className="rounded bg-white border border-slate-200 px-1.5 py-0.5 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                          {emp.first} {emp.last} (ID: {id})
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide dark:text-slate-350 mb-1">
                    Effective Termination Date
                  </label>
                  <input
                    type="date"
                    required
                    value={termDate}
                    onChange={(e) => setTermDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-rose-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide dark:text-slate-350 mb-1">
                    Administrative Close Reason
                  </label>
                  <select
                    value={termReason}
                    onChange={(e) => setTermReason(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-rose-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                  >
                    <option value="Resigned">Voluntary Resignation</option>
                    <option value="Discharged">Administrative Discharge / Exit</option>
                    <option value="Non-performance">Non-performance Clause</option>
                    <option value="Redundancy">Corporate Redundancy / Layoff</option>
                    <option value="Retirement">Retirement</option>
                    <option value="Mutual Consent">Mutual Consent Contract Close</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide dark:text-slate-350 mb-1">
                    Transition Notes / Documentation (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter secondary details, compensation agreements, handover states..."
                    value={termNotes}
                    onChange={(e) => setTermNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-rose-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 placeholder:text-slate-450"
                  />
                </div>
              </div>

              <div className="flex gap-3 border-t border-slate-50 pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTerminateOpen(false)}
                  className="w-1/2 rounded-xl border border-slate-200 px-4 py-2 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 rounded-xl bg-rose-600 transition hover:bg-rose-700 py-2 text-xs font-bold text-white shadow-md flex items-center justify-center gap-1.5"
                >
                  <XCircle className="h-4 w-4" />
                  Terminate Contract
                </button>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* MODAL 5: CONTRACT RENEWAL OPTION */}
      <Modal
        isOpen={isRenewOpen}
        onClose={() => {
          setIsRenewOpen(false);
          setRenewEmpId("");
        }}
        title="Renew Employment Contract Agreement"
        subtitle="Extend the active period duration and renegotiate individual baseline salaries."
        maxWidthClass="max-w-md"
      >
        {(() => {
          const targetEmp = renewEmpId ? state.employees.find(e => e.id === renewEmpId) : null;
          if (!targetEmp) return <p className="text-sm text-slate-500">Please select an employee profile to renew.</p>;
          return (
            <form onSubmit={handleRenewSubmit} className="space-y-4">
              <div className="flex items-center gap-3 bg-emerald-55 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 dark:bg-emerald-950/20 dark:border-emerald-900/30">
                <img
                  src={targetEmp.photo || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop`}
                  alt={targetEmp.first}
                  referrerPolicy="no-referrer"
                  className="h-10 w-10 rounded-full object-cover shrink-0"
                />
                <div>
                  <h5 className="font-bold text-slate-800 dark:text-white leading-tight">
                    {targetEmp.first} {targetEmp.last}
                  </h5>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    ID: {targetEmp.id} &bull; {targetEmp.branch} &bull; {targetEmp.position}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-750 uppercase tracking-wide dark:text-slate-350 mb-1">
                    New Renewal Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={renewStartDate}
                    onChange={(e) => setRenewStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-750 uppercase tracking-wide dark:text-slate-350 mb-1">
                    New Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={renewEndDate}
                    onChange={(e) => setRenewEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-750 uppercase tracking-wide dark:text-slate-350 mb-1">
                    Adjust Monthly Base Salary (MWK)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={renewSalaryValue}
                    onChange={(e) => setRenewSalaryValue(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                </div>
              </div>

              <div className="flex gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsRenewOpen(false);
                    setRenewEmpId("");
                  }}
                  className="w-1/2 rounded-xl border border-slate-200 px-4 py-2 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 text-xs font-bold transition text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 rounded-xl bg-emerald-500 transition hover:bg-emerald-600 py-2 text-xs font-bold text-white shadow-md flex items-center justify-center gap-1.5"
                >
                  Confirm Renewal
                </button>
              </div>
            </form>
          );
        })()}
      </Modal>

    </>
  );
}
