/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Calendar, 
  PlaneTakeoff, 
  Calculator, 
  Coins, 
  HandCoins, 
  FileText, 
  Gavel, 
  FileBox, 
  Settings2, 
  PieChart, 
  LogOut, 
  Leaf, 
  Sun, 
  Moon,
  Lock,
  Menu,
  X,
  UserCheck2,
  FileCheck2,
  LockKeyhole,
  FileWarning,
  ChevronRight
} from "lucide-react";

import { 
  DatabaseState, 
  Employee, 
  AttendanceRecord, 
  AttendanceDatabase,
  DayAttendance,
  DeductionApproval, 
  LeaveRequest, 
  Loan, 
  SalaryAdvance, 
  DisciplinaryRecord, 
  DocumentRecord, 
  PayrollRecord, 
  SystemConfig 
} from "./types";

import { loadDatabase, saveDatabase, INITIAL_STATE, getAvatarUrl } from "./utils";
import { ToastContainer, ToastItem, ConfirmModal } from "./components/Modals";

// Submodules
import Dashboard from "./components/Dashboard";
import Employees from "./components/Employees";
import Attendance from "./components/Attendance";
import Leave from "./components/Leave";
import Payroll from "./components/Payroll";
import Loans from "./components/Loans";
import Advances from "./components/Advances";
import Disciplinary from "./components/Disciplinary";
import Documents from "./components/Documents";
import Settings from "./components/Settings";
import Deductions from "./components/Deductions";

export default function App() {
  const [dbState, setDbState] = useState<DatabaseState>(INITIAL_STATE);
  const [isThemeDark, setIsThemeDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authRole, setAuthRole] = useState<"Admin" | "HR" | "Viewer">("Admin");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState(false);

  // Global Branch Selection states
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [hasSelectedInitialBranch, setHasSelectedInitialBranch] = useState(false);

  // Core navigation state
  const [activeTab, setActiveTab] = useState("dashboard");
  const [targetDossierTab, setTargetDossierTab] = useState<"overview" | "financials" | "attendance" | "compliance" | undefined>(undefined);
  const [externalProfileEmployeeId, setExternalProfileEmployeeId] = useState<string | undefined>(undefined);

  // Dynamic system audits logger state
  const [logs, setLogs] = useState<{ time: string; category: string; details: string }[]>([]);

  // Toasting notifications state
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Custom general confirmation modals
  const [confirmProps, setConfirmProps] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: "danger" | "warning" | "success" | "info";
  } | null>(null);

  // Bootstrap Load Database items on init
  useEffect(() => {
    const loaded = loadDatabase();
    setDbState(loaded);
    
    // Add dynamic logs trace
    addLogEvent("Authentication", `System core loaded successfully.`);
  }, []);

  // Sync to database changes
  const updateStateAndPersist = (updater: (prev: DatabaseState) => DatabaseState) => {
    setDbState(prev => {
      const next = updater(prev);
      saveDatabase(next);
      return next;
    });
  };

  const addLogEvent = (category: string, details: string) => {
    const timeStr = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs(prev => [{ time: timeStr, category, details }, ...prev]);
  };

  const showToast = (message: string, type: ToastItem["type"] = "info") => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto purge
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: "danger" | "warning" | "success" | "info" = "info"
  ) => {
    setConfirmProps({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmProps(null);
      },
      onCancel: () => setConfirmProps(null),
      type,
    });
  };

  // 1. ADD BASELINE EMPLOYEE PROFILE
  const handleAddEmployee = (newEmp: Omit<Employee, "id">) => {
    updateStateAndPersist(prev => {
      const serialId = `EMP-${(prev.employees.length + 1).toString().padStart(3, "0")}`;
      const completed: Employee = { id: serialId, ...newEmp };
      
      addLogEvent("Staff Registry", `Created baseline profile for ${completed.first} ${completed.last}.`);
      return {
        ...prev,
        employees: [...prev.employees, completed]
      };
    });
    showToast("Teammate profile created successfully.", "success");
  };

  // 2. DISMISS/REMOVE TEAMMATE PROFILE
  const handleRemoveEmployee = (id: string) => {
    const target = dbState.employees.find(e => e.id === id);
    if (!target) return;

    showConfirm(
      "Confirm Profile Deletion",
      `Are you sure you want to permanently delete the profile of ${target.first} ${target.last}? This action is irreversible.`,
      () => {
        updateStateAndPersist(prev => {
          addLogEvent("Staff Registry", `Removed profile record index ${id}.`);
          return {
            ...prev,
            employees: prev.employees.filter(e => e.id !== id)
          };
        });
        showToast("Teammate profile permanently dismissed.", "success");
      },
      "danger"
    );
  };

  // 2b. BULK REMOVE TEAMMATE PROFILES
  const handleRemoveEmployees = (ids: string[]) => {
    if (ids.length === 0) return;

    showConfirm(
      "Confirm Bulk Deletion",
      `Are you sure you want to permanently delete the ${ids.length} selected employee profiles? This action is irreversible.`,
      () => {
        updateStateAndPersist(prev => {
          addLogEvent("Staff Registry", `Bulk removed ${ids.length} profile records.`);
          return {
            ...prev,
            employees: prev.employees.filter(e => !ids.includes(e.id))
          };
        });
        showToast(`${ids.length} employee profiles permanently dismissed.`, "success");
      },
      "danger"
    );
  };

  // 3. EDIT EMPLOYEE PROFILE DETAILS
  const handleUpdateEmployee = (id: string, updatedFields: Partial<Employee>) => {
    updateStateAndPersist(prev => {
      const target = prev.employees.find(e => e.id === id);
      const nameStr = target ? `${target.first} ${target.last}` : id;
      addLogEvent("Staff Registry", `Updated profile information for teammate ${nameStr} (${id}).`);
      return {
        ...prev,
        employees: prev.employees.map(e => e.id === id ? { ...e, ...updatedFields } : e)
      };
    });
    showToast("Employee profile successfully updated.", "success");
  };

  // 4. INJECT CSV BATCH PARSING
  const handleAddBatch = (branch: string, csvLines: string[][]) => {
    updateStateAndPersist(prev => {
      let currentLength = prev.employees.length;
      const parsed: Employee[] = [];

      csvLines.forEach((parts, idx) => {
        if (parts.length >= 4) {
          const salaryNum = parseFloat(parts[3].replace(/[^\d]/g, ""));
          if (!parts[0] || !parts[1] || isNaN(salaryNum)) return;

          currentLength++;
          parsed.push({
            id: `EMP-${currentLength.toString().padStart(3, "0")}`,
            first: parts[0],
            last: parts[1],
            gender: "Other",
            position: parts[2],
            dept: "Operations",
            branch: branch,
            salary: salaryNum,
            national: "",
            cstart: new Date().toISOString().split("T")[0],
            cend: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            photo: getAvatarUrl("Other", parts[0])
          });
        }
      });

      addLogEvent("Staff Registry", `Imported batch list of ${parsed.length} staff elements into branch ${branch}.`);
      return {
        ...prev,
        employees: [...prev.employees, ...parsed]
      };
    });
    showToast("Successfully imported batch records.", "success");
  };

  // 5. COMMIT LEAVE WORKFLOWS
  const handleApplyLeave = (request: Omit<LeaveRequest, "id" | "status">) => {
    updateStateAndPersist(prev => {
      const nextId = `LV-${(prev.leave.length + 1).toString().padStart(3, "0")}`;
      const completed: LeaveRequest = { id: nextId, status: "Approved", ...request };

      addLogEvent("Leave Management", `Leave periods booked for ${request.empId}. Total: ${request.days} days.`);
      return {
        ...prev,
        leave: [...prev.leave, completed]
      };
    });
  };

  // 6. DISBURSE REGIONAL LOAN FACILITIES
  const handleRecordLoan = (loan: Omit<Loan, "id" | "paid">) => {
    updateStateAndPersist(prev => {
      const nextId = `LN-${(prev.loans.length + 1).toString().padStart(3, "0")}`;
      const completed: Loan = { id: nextId, paid: 0, ...loan };

      addLogEvent("Financial Assets", `Disbursed loan facility of MWK ${loan.amount.toLocaleString()} to teammate ${loan.empId}.`);
      return {
        ...prev,
        loans: [...prev.loans, completed]
      };
    });
  };

  // 7. AMORTIZE FULL LOAN PRINCIPALS
  const handlePayOffLoan = (empId: string) => {
    updateStateAndPersist(prev => {
      return {
        ...prev,
        loans: prev.loans.map(l => l.empId === empId ? { ...l, paid: l.amount } : l)
      };
    });
    addLogEvent("Financial Assets", `Loan facility principal fully settled for candidate ${empId}.`);
  };

  // 8. ISSUE MID-MONTH EXPENSES SIGN CASH ADVANCES
  const handleIssueAdvance = (advance: Omit<SalaryAdvance, "id" | "date">) => {
    updateStateAndPersist(prev => {
      const nextId = `AD-${(prev.advances.length + 1).toString().padStart(3, "0")}`;
      const completed: SalaryAdvance = {
        id: nextId,
        date: new Date().toISOString().split("T")[0],
        ...advance,
      };

      addLogEvent("Financial Assets", `Issued salary cash advance of MWK ${advance.amount.toLocaleString()} to teammate ${advance.empId}.`);
      return {
        ...prev,
        advances: [...prev.advances, completed]
      };
    });
  };

  // 10. RECORD COMPLIANCE DISCIPLINARY ACTIONS
  const handleAddDisciplinary = (record: Omit<DisciplinaryRecord, "id" | "date">) => {
    updateStateAndPersist(prev => {
      const nextId = `DS-${(prev.disciplinary.length + 1).toString().padStart(3, "0")}`;
      const completed: DisciplinaryRecord = {
        id: nextId,
        date: new Date().toISOString().split("T")[0],
        ...record,
      };

      addLogEvent("Compliance", `Logged disciplinary action sanction (${record.action}) on worker ${record.empId}.`);
      return {
        ...prev,
        disciplinary: [...prev.disciplinary, completed]
      };
    });
  };

  // 11. ARCHIVE CORE DOCUMENT FILE TO THE LOCAL VAULT
  const handleArchiveDocument = (doc: Omit<DocumentRecord, "id">) => {
    updateStateAndPersist(prev => {
      const nextId = `DC-${(prev.documents.length + 1).toString().padStart(3, "0")}`;
      const completed: DocumentRecord = { id: nextId, ...doc };

      addLogEvent("Document Archival", `Hosted document ${doc.name} for coworker ${doc.empId} in the cloud vault index.`);
      return {
        ...prev,
        documents: [...prev.documents, completed]
      };
    });
  };

  // 12. SAVE DAILY LEDGER ATTENDANCE TIMELINE REF
  const handleSaveAttendance = (dateStr: string, dayAttendance: { [empId: string]: AttendanceRecord }) => {
    updateStateAndPersist(prev => {
      addLogEvent("Attendance Record Chart", `Committed daily attendance ledger metrics for ${dateStr}.`);
      return {
        ...prev,
        attendance: {
          ...prev.attendance,
          [dateStr]: dayAttendance
        }
      };
    });
  };

  const handleUpdateFullAttendance = (updatedAttendance: AttendanceDatabase) => {
    updateStateAndPersist(prev => {
      return {
        ...prev,
        attendance: updatedAttendance
      };
    });
  };

  // 13. ENFORCE PENALTIES FROM ABSENCE SWEEPMATCHES
  const handleApplyPenalty = (penalty: Omit<DeductionApproval, "id">) => {
    updateStateAndPersist(prev => {
      const nextId = `AP-${(prev.deductionApprovals.length + 1).toString().padStart(3, "0")}`;
      const completed: DeductionApproval = { id: nextId, ...penalty };

      addLogEvent("Compliance", `Deduction penalty enforced on personnel ${penalty.empId} (MWK ${penalty.amount.toLocaleString()}).`);
      return {
        ...prev,
        deductionApprovals: [...prev.deductionApprovals, completed]
      };
    });
  };

  // 13.5 REVOKE OR REMOVE DEDUCTION SPECIFICATIONS
  const handleDeleteDeductionApproval = (id: string) => {
    updateStateAndPersist(prev => {
      addLogEvent("Compliance", `Revoked deduction record (${id}).`);
      return {
        ...prev,
        deductionApprovals: prev.deductionApprovals.filter(d => d.id !== id)
      };
    });
  };

  // 14. INJECT REGION-COMMITTED MONTHLY CALCULATION RUNS
  const handleRunPayroll = (payrollRecords: PayrollRecord[]) => {
    updateStateAndPersist(prev => {
      addLogEvent("Payroll Remittance Runs", `Executed payroll calculations and compiled payout ledgers list.`);
      return {
        ...prev,
        payroll: payrollRecords
      };
    });
  };

  // 15. COMPILE SYSTEM TAX RATES CONFIGS SETTINGS
  const handleUpdateConfig = (config: SystemConfig) => {
    updateStateAndPersist(prev => {
      addLogEvent("Configuration Sets", `Updated regional tax PAYE rates parameters & leave days.`);
      return {
        ...prev,
        config
      };
    });
  };

  // 16. ADD CUSTOM BRANCH REGIONAL COORDINATES
  const handleAddBranch = (name: string) => {
    updateStateAndPersist(prev => {
      addLogEvent("Configuration Sets", `Created branch coordinates for "${name}" location.`);
      return {
        ...prev,
        branches: [...prev.branches, name]
      };
    });
  };

  // 17. REMOVE Dynamic custom registers
  const handleRemoveBranch = (name: string) => {
    updateStateAndPersist(prev => {
      addLogEvent("Configuration Sets", `Removed branch location coordinates for "${name}".`);
      return {
        ...prev,
        branches: prev.branches.filter(b => b !== name)
      };
    });
    showToast(`Branch registration code ${name} removed.`, "success");
  };

  // 18. DATABASE RESTORE FULL INDEX BACKUP FILE
  const handleRestoreDatabase = (restored: DatabaseState) => {
    setDbState(restored);
    saveDatabase(restored);
    addLogEvent("Backup Restore Engine", "System initialized database to restored file reference successfully.");
  };

  // Quick select teammate details by clicking dashboard rows direct!
  const handleSelectEmployee = (empId: string, dossierTab?: "overview" | "financials" | "attendance" | "compliance") => {
    const matched = dbState.employees.find(e => e.id === empId);
    if (matched) {
      if (dossierTab) {
        setTargetDossierTab(dossierTab);
      } else {
        setTargetDossierTab(undefined);
      }
      setExternalProfileEmployeeId(empId);
    }
  };

  // Authentication path execution block
  const handleAuthenticateForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (authPassword === "2026") {
      setIsAuthenticated(true);
      setAuthPassword("");
      setAuthError(false);
      addLogEvent("Authentication", `Authorized user connection under segment role group: ${authRole}.`);
      showToast(`Welcome back! Logged in as ${authRole}.`, "success");
    } else {
      setAuthError(true);
      showToast("Unrecognized security credentials key.", "error");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setSelectedBranch("all");
    setHasSelectedInitialBranch(false);
    setActiveTab("dashboard");
    addLogEvent("Authentication", `Active workspace session closed.`);
    showToast("Workspace terminal disconnected.", "info");
  };

  // Theme engine helper Class updates
  const handleThemeModeToggle = () => {
    const el = document.documentElement;
    if (isThemeDark) {
      el.classList.remove("dark");
      setIsThemeDark(false);
    } else {
      el.classList.add("dark");
      setIsThemeDark(true);
    }
  };

  // Dynamic Branch Filtering of State
  const getFilteredState = (): DatabaseState => {
    if (selectedBranch === "all") {
      return dbState;
    }
    
    const filteredEmployees = dbState.employees.filter(emp => emp.branch === selectedBranch);
    const employeeIdsSet = new Set(filteredEmployees.map(emp => emp.id));
    
    const filteredAttendance: AttendanceDatabase = {};
    Object.entries(dbState.attendance).forEach(([date, dayRecord]) => {
      const filteredDayRecord: DayAttendance = {};
      Object.entries(dayRecord).forEach(([empId, record]) => {
        if (employeeIdsSet.has(empId)) {
          filteredDayRecord[empId] = record;
        }
      });
      filteredAttendance[date] = filteredDayRecord;
    });
    
    return {
      ...dbState,
      employees: filteredEmployees,
      attendance: filteredAttendance,
      leave: dbState.leave.filter(l => employeeIdsSet.has(l.empId)),
      payroll: dbState.payroll.filter(p => employeeIdsSet.has(p.id)),
      loans: dbState.loans.filter(l => employeeIdsSet.has(l.empId)),
      advances: dbState.advances.filter(a => employeeIdsSet.has(a.empId)),
      disciplinary: dbState.disciplinary.filter(d => employeeIdsSet.has(d.empId)),
      documents: dbState.documents.filter(d => employeeIdsSet.has(d.empId)),
      deductionApprovals: dbState.deductionApprovals.filter(d => employeeIdsSet.has(d.empId)),
    };
  };

  // Main UI Tab Switch routing
  const renderActiveWidget = () => {
    const filteredState = getFilteredState();
    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard 
            state={filteredState} 
            logs={logs} 
            onSelectEmployee={handleSelectEmployee} 
            setActiveTab={setActiveTab}
          />
        );
      case "employees":
        return (
          <Employees
            state={filteredState}
            onAddEmployee={handleAddEmployee}
            onRemoveEmployee={handleRemoveEmployee}
            onRemoveEmployees={handleRemoveEmployees}
            onUpdateEmployee={handleUpdateEmployee}
            onAddBatch={handleAddBatch}
            targetDossierTab={targetDossierTab}
            onClearTargetDossierTab={() => setTargetDossierTab(undefined)}
            externalProfileEmployeeId={externalProfileEmployeeId}
            onClearExternalProfileEmployeeId={() => setExternalProfileEmployeeId(undefined)}
            isDossierOnly={false}
            selectedBranch={selectedBranch}
          />
        );
      case "attendance":
        return (
          <Attendance
            state={filteredState}
            onSaveAttendance={handleSaveAttendance}
            onUpdateFullAttendance={handleUpdateFullAttendance}
            onApplyPenalty={handleApplyPenalty}
            onSelectEmployee={handleSelectEmployee}
            onAddDocument={handleArchiveDocument}
            showToast={showToast}
          />
        );
      case "leave":
        return (
          <Leave
            state={filteredState}
            onApplyLeave={handleApplyLeave}
            onUpdateEmployee={handleUpdateEmployee}
            onSelectEmployee={handleSelectEmployee}
            showToast={showToast}
          />
        );
      case "payroll":
        return (
          <Payroll
            state={filteredState}
            onRunPayroll={handleRunPayroll}
            showToast={showToast}
          />
        );
      case "loans":
        return (
          <Loans
            state={filteredState}
            onRecordLoan={handleRecordLoan}
            onPayOffLoan={handlePayOffLoan}
            onSelectEmployee={handleSelectEmployee}
            showToast={showToast}
          />
        );
      case "advances":
        return (
          <Advances
            state={filteredState}
            onIssueAdvance={handleIssueAdvance}
            onSelectEmployee={handleSelectEmployee}
            showToast={showToast}
          />
        );
      case "disciplinary":
        return (
          <Disciplinary
            state={filteredState}
            onAddDisciplinary={handleAddDisciplinary}
            onSelectEmployee={handleSelectEmployee}
            showToast={showToast}
          />
        );
      case "deductions":
        return (
          <Deductions
            state={filteredState}
            onApplyDeduction={handleApplyPenalty}
            onDeleteDeduction={handleDeleteDeductionApproval}
            onSelectEmployee={handleSelectEmployee}
            showToast={showToast}
          />
        );
      case "documents":
        return (
          <Documents
            state={filteredState}
            onArchiveDocument={handleArchiveDocument}
            onSelectEmployee={handleSelectEmployee}
            showToast={showToast}
          />
        );
      case "settings":
        return (
          <Settings
            state={dbState}
            onUpdateConfig={handleUpdateConfig}
            onAddBranch={handleAddBranch}
            onRemoveBranch={handleRemoveBranch}
            onRestoreDatabase={handleRestoreDatabase}
            showToast={showToast}
          />
        );
      default:
        return <div>Widget Not Found.</div>;
    }
  };

  const navMenuItems = [
    { target: "dashboard", label: "Dashboard", Icon: PieChart },
    { target: "employees", label: "Employees", Icon: Users },
    { target: "attendance", label: "Attendance", Icon: Calendar },
    { target: "leave", label: "Leave Requests", Icon: PlaneTakeoff },
    { target: "payroll", label: "Calculations Sheets", Icon: Calculator },
    { target: "loans", label: "Active Loans", Icon: Coins },
    { target: "advances", label: "Mid-month advances", Icon: HandCoins },
    { target: "disciplinary", label: "Compliance actions", Icon: Gavel },
    { target: "deductions", label: "Negligence Charges", Icon: FileWarning },
    { target: "documents", label: "Documents Vault", Icon: FileBox },
    { target: "settings", label: "System settings", Icon: Settings2 },
  ];

  // GATEWAY: LOG IN RENDER CONTROL
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-tr from-slate-900 via-emerald-950 to-emerald-900 overflow-hidden font-sans">
        
        {/* Ambient mesh background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.08),transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-slate-950/40" />

        <div className="w-full max-w-md p-4 relative z-10 animate-fade-in">
          <div className="overflow-hidden rounded-2xl bg-slate-950/60 shadow-2xl backdrop-blur-xl border border-slate-800 p-8">
            <div className="text-center mb-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 mb-4 border border-emerald-500/10">
                <LockKeyhole className="h-8 w-8 text-emerald-500 animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                HR Desk
              </h2>
              <p className="mt-2 text-xs text-slate-400 font-semibold tracking-wider">
                Sign in to manage operations
              </p>
            </div>

            <form onSubmit={handleAuthenticateForm} className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-loose mb-1.5">
                  Select Role Group
                </label>
                <select
                  value={authRole}
                  onChange={(e) => setAuthRole(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 text-sm font-semibold text-slate-101 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                >
                  <option value="Admin">Admin / HR Manager</option>
                  <option value="HR">HR Officer</option>
                  <option value="Viewer">Viewer (Read-Only)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-loose mb-1.5">
                  Corporate System Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter System Password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 text-sm font-semibold text-slate-101 placeholder-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono transition"
                />
              </div>

              {authError && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-xs font-semibold text-rose-400 flex gap-2.5 items-center">
                  <span>Incorrect key. Please specify system deployment password.</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition tracking-wide"
              >
                Authenticate System Connection
              </button>
            </form>
          </div>
        </div>
        
        <ToastContainer toasts={toasts} removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
      </div>
    );
  }

  // SECONDARY GATE: WORKSPACE BRANCH DIRECTION SELECTION
  if (isAuthenticated && !hasSelectedInitialBranch) {
    return (
      <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-tr from-slate-900 via-emerald-950/65 to-slate-950 overflow-hidden font-sans">
        
        {/* Ambient mesh background effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.06),transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-slate-950/40" />

        <div className="w-full max-w-4xl p-6 relative z-10 animate-fade-in">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-white tracking-tight uppercase">
              SELECT ACTIVE BRANCH WORKSPACE
            </h2>
            <p className="mt-2 text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Choose a branch registry to initialize your session
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* CARD 1: ALL BRANCHES */}
            <button
              onClick={() => {
                setSelectedBranch("all");
                setHasSelectedInitialBranch(true);
              }}
              className="group flex flex-col justify-between items-start text-left p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 hover:from-emerald-500 hover:to-emerald-600 border border-emerald-500/20 hover:border-emerald-400 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-emerald-500/10 cursor-pointer"
            >
              <div className="mb-8">
                <span className="flex items-center justify-center h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4 group-hover:bg-white/20 group-hover:text-white">
                  <Users className="h-6 w-6" />
                </span>
                <h3 className="text-lg font-bold text-white group-hover:text-white uppercase">
                  All Branches
                </h3>
                <p className="text-xs text-slate-400 group-hover:text-emerald-100 mt-1.5 font-medium leading-relaxed">
                  Consolidated enterprise view of all employees and regional operations across the entire organization.
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 group-hover:text-white font-bold text-xs uppercase tracking-wider">
                <span>Access Dashboard</span>
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </button>

            {/* DYNAMIC BRANCHES CARDS */}
            {dbState.branches.map((br) => {
              const empCount = dbState.employees.filter(emp => emp.branch === br).length;
              return (
                <button
                  key={br}
                  onClick={() => {
                    setSelectedBranch(br);
                    setHasSelectedInitialBranch(true);
                  }}
                  className="group flex flex-col justify-between items-start text-left p-6 rounded-2xl bg-slate-950/40 hover:bg-emerald-500 hover:text-white border border-slate-800 hover:border-emerald-400 transition-all duration-300 transform hover:-translate-y-1 shadow-md hover:shadow-emerald-500/10 cursor-pointer"
                >
                  <div className="mb-8 col-span-1">
                    <span className="flex items-center justify-center h-12 w-12 rounded-xl bg-slate-900 text-slate-400 border border-slate-800 mb-4 group-hover:bg-white/25 group-hover:text-white">
                      <Leaf className="h-6 w-6 text-emerald-500 group-hover:text-white" />
                    </span>
                    <h3 className="text-lg font-bold text-white group-hover:text-white uppercase truncate w-full">
                      {br}
                    </h3>
                    <p className="text-xs text-slate-404 group-hover:text-emerald-100 mt-1.5 font-mono">
                      {empCount} {empCount === 1 ? "Employee" : "Employees"} Active
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-white font-bold text-xs uppercase tracking-wider">
                    <span>Select registry</span>
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="text-center mt-12 bg-slate-950/20 rounded-xl p-4 border border-slate-900/60 max-w-sm mx-auto">
            <button
              onClick={() => {
                setIsAuthenticated(false);
                setAuthPassword("");
              }}
              className="text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider transition-colors"
            >
              ← Back to Login Screen
            </button>
          </div>
        </div>

        <ToastContainer toasts={toasts} removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
      </div>
    );
  }

  // CORE REGIONAL WORKSPACE DESKTOP/MOBILE WRAPPERS
  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 font-sans">
      
      {/* 1. SIDEBAR (Desktop Left Anchor View) */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-805 text-slate-300 dark:bg-slate-950 dark:border-slate-900 flex flex-col transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="flex items-center gap-3 px-6 py-5.5 border-b border-slate-800/60 dark:border-slate-900 bg-slate-950/40 shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-450 border border-emerald-500/10 shrink-0">
            <Leaf className="h-5.5 w-5.5 text-emerald-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white tracking-widest uppercase mb-0.5 leading-none">
                HR DESK
            </h1>
            <p className="font-mono text-[9px] font-bold text-slate-500 uppercase leading-none tracking-widest mt-1">
              Active Server node
            </p>
          </div>
        </div>

        {/* User identification card summary */}
        <div className="px-6 py-4.5 border-b border-slate-800/40 dark:border-slate-900/60 shrink-0 select-none bg-slate-950/25">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/10 leading-none">
            {authRole} Regional Unit
          </span>
        </div>

        {/* Sidebar Navigation feeds */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1">
          {navMenuItems.map(m => {
            const ActiveIcon = m.Icon;
            const isTabActive = activeTab === m.target;
            return (
              <button
                key={m.target}
                onClick={() => {
                  setActiveTab(m.target);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isTabActive
                    ? "bg-emerald-500 text-white shadow shadow-emerald-500/10 font-bold"
                    : "text-slate-400 hover:bg-slate-850 hover:text-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                <ActiveIcon className="h-4.5 w-4.5 shrink-0" />
                {m.label}
              </button>
            );
          })}
        </nav>

        {/* Logout widget bottom block */}
        <div className="p-4 border-t border-slate-800/40 dark:border-slate-900 bg-slate-950/20 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-850 border border-slate-800/60 text-slate-300 py-2.5 text-xs font-bold hover:bg-slate-800 hover:text-white transition duration-200"
          >
            <LogOut className="h-4 w-4 shrink-0 text-slate-450" />
            Terminate Terminal Session
          </button>
        </div>
      </aside>

      {/* BACKGROUND FOR DISMISSED MOBILE SIDEBAR */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 2. MAIN APPLICATION CLIENT CONTENT STAGE */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0 transition-all duration-300">
        
        {/* Dynamic Horizontal header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-100 bg-white/80 dark:bg-slate-950/80 backdrop-blur px-6 py-4 shadow-sm dark:border-slate-900">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-xl border border-slate-150 text-slate-500 hover:bg-slate-50 hover:text-slate-705 shrink-0 dark:border-slate-800 dark:hover:bg-slate-900"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-white uppercase">
              {activeTab} Workspace
            </h2>
          </div>

          <div className="flex items-center gap-4.5">
            {/* Global Branch Selector dropdown */}
            <div className="flex items-center gap-2">
              <span className="hidden lg:inline text-[9px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Active Branch:
              </span>
              <select
                id="header-branch-select"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 px-3 py-1.5 text-xs font-bold text-slate-750 dark:text-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer"
              >
                <option value="all">ALL OPERATIONS BRANCHES</option>
                {dbState.branches.map((br) => (
                  <option key={br} value={br}>
                    {br.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Color Theme toggle */}
            <button
              onClick={handleThemeModeToggle}
              className="rounded-xl border border-slate-150 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition dark:border-slate-800 dark:hover:bg-slate-900"
              id="theme-toggle-button"
            >
              {isThemeDark ? <Sun className="h-4.5 w-4.5 text-amber-500 animate-spin" /> : <Moon className="h-4.5 w-4.5 text-slate-500" />}
            </button>

            {/* Standard date badge stamp */}
            <span className="hidden sm:inline-flex rounded-full bg-emerald-50 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-850 dark:bg-emerald-950/40 dark:text-emerald-350 select-none">
              {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
        </header>

        {/* Core application body views viewport stage */}
        <main className="flex-1 px-6 py-8 md:px-8 space-y-8 max-w-7xl w-full mx-auto">
          {renderActiveWidget()}
        </main>

        {/* BOTTOM HEADER BAR: MOBILE OPTIMIZED LAYOUT */}
        <nav className="fixed bottom-0 inset-x-0 h-16 bg-slate-900 border-t border-slate-800 text-slate-400 z-30 flex md:hidden dark:bg-slate-950 dark:border-slate-900">
          {[
            { tag: "dashboard", label: "Dashboard", Icon: PieChart },
            { tag: "employees", label: "Employees", Icon: Users },
            { tag: "attendance", label: "Attendance", Icon: Calendar },
            { tag: "payroll", label: "Payroll", Icon: Calculator },
            { tag: "settings", label: "Settings", Icon: Settings2 },
          ].map(b => {
            const ActiveMobile = b.Icon;
            const selectActive = activeTab === b.tag;
            return (
              <button
                key={b.tag}
                onClick={() => setActiveTab(b.tag)}
                className={`flex-1 flex flex-col items-center justify-center gap-1.5 transition ${
                  selectActive ? "bg-slate-950 text-white font-bold" : "text-slate-400 hover:text-slate-205"
                }`}
              >
                <ActiveMobile className="h-5 w-5 shrink-0" />
                <span className="text-[10px] font-semibold">{b.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Global alert toaster panel */}
      <ToastContainer toasts={toasts} removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />

      {/* Common generalized dynamic confirm popups */}
      {confirmProps && (
        <ConfirmModal
          isOpen={confirmProps.isOpen}
          title={confirmProps.title}
          message={confirmProps.message}
          onConfirm={confirmProps.onConfirm}
          onCancel={confirmProps.onCancel}
          type={confirmProps.type}
        />
      )}

      {/* Global Dossier-only Container */}
      {activeTab !== "employees" && (
        <Employees
          state={getFilteredState()}
          onAddEmployee={handleAddEmployee}
          onRemoveEmployee={handleRemoveEmployee}
          onRemoveEmployees={handleRemoveEmployees}
          onUpdateEmployee={handleUpdateEmployee}
          onAddBatch={handleAddBatch}
          targetDossierTab={targetDossierTab}
          onClearTargetDossierTab={() => setTargetDossierTab(undefined)}
          externalProfileEmployeeId={externalProfileEmployeeId}
          onClearExternalProfileEmployeeId={() => setExternalProfileEmployeeId(undefined)}
          isDossierOnly={true}
          selectedBranch={selectedBranch}
        />
      )}
    </div>
  );
}
