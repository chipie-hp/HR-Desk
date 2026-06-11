/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Employee {
  id: string;
  first: string;
  last: string;
  gender: string;
  position: string;
  dept: "Kitchen" | "Administration" | "Operations" | "Finance" | "Human Resources";
  branch: string;
  salary: number;
  national: string;
  cstart: string;
  cend: string;
  photo: string;
  extra_leave_days?: number;
  converted_ot_hours?: number;
}

export interface AttendanceRecord {
  status: "Present" | "Absent" | "Sick" | "Leave";
  inTime: string;
  outTime: string;
}

export interface DayAttendance {
  [empId: string]: AttendanceRecord;
}

export interface AttendanceDatabase {
  [date: string]: DayAttendance;
}

export interface LeaveRequest {
  id: string;
  empId: string;
  type: "Annual Leave" | "Sick Leave" | "Compassionate Leave" | "Maternity Leave" | "Unpaid Leave";
  start: string;
  end: string;
  days: number;
  by: string;
  status: "Approved" | "Pending" | "Rejected";
}

export interface Loan {
  id: string;
  empId: string;
  amount: number;
  months: number;
  paid: number;
}

export interface SalaryAdvance {
  id: string;
  empId: string;
  amount: number;
  date: string;
}

export interface DisciplinaryRecord {
  id: string;
  empId: string;
  desc: string;
  action: string;
  date: string;
}

export interface DocumentRecord {
  id: string;
  empId: string;
  type: string;
  name: string;
}

export interface DeductionApproval {
  id: string;
  empId: string;
  date: string;
  reason: string;
  amount: number;
}

export interface PayrollRecord {
  id: string;
  name: string;
  base: number;
  paye: number;
  pension: number;
  net: number;
  loans: number;
  advances: number;
  absences: number;
  absentDeduction: number;
  penalties: number;
}

export interface SystemConfig {
  paye: number; // e.g. 30
  pension: number; // e.g. 5
  ot_rate: number; // e.g. 1.5
  daily_absent_deduction: number; // e.g. 5000
  leave_days: number; // e.g. 21
}

export interface DatabaseState {
  employees: Employee[];
  attendance: AttendanceDatabase;
  leave: LeaveRequest[];
  payroll: PayrollRecord[];
  loans: Loan[];
  advances: SalaryAdvance[];
  disciplinary: DisciplinaryRecord[];
  documents: DocumentRecord[];
  branches: string[];
  config: SystemConfig;
  deductionApprovals: DeductionApproval[];
}
