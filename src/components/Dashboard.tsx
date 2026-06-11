/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Users, 
  UserCheck, 
  PlaneTakeoff, 
  AlertTriangle, 
  Wallet, 
  Coins, 
  Terminal,
  ArrowRight
} from "lucide-react";
import { DatabaseState, Employee } from "../types";
import { Modal } from "./Modals";

interface DashboardProps {
  state: DatabaseState;
  logs: { time: string; category: string; details: string }[];
  onSelectEmployee: (id: string) => void;
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({
  state,
  logs,
  onSelectEmployee,
  setActiveTab,
}: DashboardProps) {
  const [detailModalTitle, setDetailModalTitle] = useState("");
  const [detailEmployees, setDetailEmployees] = useState<Employee[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const todayRecords = state.attendance[today] || {};
  
  const presentCount = Object.values(todayRecords).filter(r => r.status === "Present").length;
  const absentCount = Object.values(todayRecords).filter(r => r.status === "Absent").length;
  const leaveCountDirect = Object.values(todayRecords).filter(r => r.status === "Leave").length;

  const totalEmp = state.employees.length;
  const attendancePercentage = totalEmp > 0 ? Math.round((presentCount / totalEmp) * 100) : 0;

  // Compute actual on leave
  const onLeaveEmployees = state.employees.filter(emp => {
    return state.leave.some(request => {
      return request.empId === emp.id && 
        today >= request.start && 
        today <= request.end &&
        request.status === "Approved";
    });
  });

  // Expiries within 30 days
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringEmployees = state.employees.filter(emp => {
    if (!emp.cend) return false;
    const end = new Date(emp.cend);
    return end >= now && end <= in30Days;
  });

  // Metrics sums
  const totalPayrollGross = state.employees.reduce((sum, e) => sum + e.salary, 0);
  const activeLoansSum = state.loans.reduce((sum, l) => sum + (l.amount - l.paid), 0);

  // Departments count
  const depts = ["Kitchen", "Administration", "Operations", "Finance", "Human Resources"] as const;
  const deptMap = depts.reduce((acc, d) => {
    acc[d] = state.employees.filter(e => e.dept === d).length;
    return acc;
  }, {} as Record<string, number>);

  const handleOpenDetail = (title: string, list: Employee[]) => {
    setDetailModalTitle(title);
    setDetailEmployees(list);
    setIsDetailOpen(true);
  };

  const handleRowClick = (empId: string) => {
    setIsDetailOpen(false);
    onSelectEmployee(empId);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Total Staff */}
        <div
          onClick={() => handleOpenDetail("Administrative staff ledger", state.employees)}
          className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-150 transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:bg-slate-900 dark:ring-slate-800"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Staff
              </p>
              <h3 className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-white">
                {state.employees.length}
              </h3>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Present Today */}
        <div
          onClick={() => {
            const list = state.employees.filter(e => todayRecords[e.id]?.status === "Present");
            handleOpenDetail(`Attending Today (${attendancePercentage}%)`, list);
          }}
          className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-150 transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:bg-slate-900 dark:ring-slate-800"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-sky-50 p-3 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 group-hover:scale-105 transition-transform">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Present Today
              </p>
              <h3 className="mt-1 font-mono text-xl font-bold text-slate-900 dark:text-white">
                {presentCount} <span className="text-xs font-normal text-slate-450 dark:text-slate-500">({attendancePercentage}%)</span>
              </h3>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-sky-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* On Leave */}
        <div
          onClick={() => handleOpenDetail("Authorized Leave Registry", onLeaveEmployees)}
          className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-150 transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:bg-slate-900 dark:ring-slate-800"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-amber-50 p-3 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 group-hover:scale-105 transition-transform">
              <PlaneTakeoff className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                On Leave
              </p>
              <h3 className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-white">
                {onLeaveEmployees.length}
              </h3>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Expiries (30d) */}
        <div
          onClick={() => handleOpenDetail("Contracts Expiring &lt; Update Urgently", expiringEmployees)}
          className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-150 transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:bg-slate-900 dark:ring-slate-800"
        >
          <div className="flex items-center gap-4">
            <div className={`rounded-xl p-3 group-hover:scale-105 transition-transform ${expiringEmployees.length > 0 ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400" : "bg-slate-50 text-slate-400 dark:bg-slate-800"}`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Expiries (30d)
              </p>
              <h3 className={`mt-1 font-mono text-2xl font-bold ${expiringEmployees.length > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"}`}>
                {expiringEmployees.length}
              </h3>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Payroll Gross */}
        <div
          onClick={() => setActiveTab("payroll")}
          className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-150 transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:bg-slate-900 dark:ring-slate-800"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Base Monthly (MWK)
              </p>
              <h3 className="mt-1 font-mono text-md font-bold text-slate-900 dark:text-white break-all">
                {totalPayrollGross.toLocaleString()}
              </h3>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Active Loans */}
        <div
          onClick={() => setActiveTab("loans")}
          className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-150 transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:bg-slate-900 dark:ring-slate-800"
        >
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-violet-50 p-3 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400 group-hover:scale-105 transition-transform">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Active Loans (MWK)
              </p>
              <h3 className="mt-1 font-mono text-md font-bold text-slate-900 dark:text-white break-all">
                {activeLoansSum.toLocaleString()}
              </h3>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-violet-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Visualizers & Graphs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Attendance trend SVG Graph */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Attendance rate trend (%)
            </h3>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-350">
              Daily Ledger Performance
            </span>
          </div>

          <div className="h-56 w-full flex items-end justify-between border-b border-dashed border-slate-200 pb-2 dark:border-slate-800 gap-4">
            {[
              { day: "Jun 04", val: 85 },
              { day: "Jun 05", val: 92 },
              { day: "Jun 06", val: 90 },
              { day: "Jun 08", val: 88 },
              { day: "Jun 09", val: 95 },
            ].map((col, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center group relative cursor-pointer">
                {/* Tooltip value */}
                <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-transform origin-bottom bg-slate-900 text-white text-xs px-2 py-1 rounded-md font-mono z-10 dark:bg-white dark:text-slate-900">
                  {col.val}%
                </div>
                {/* Colored pill column */}
                <div
                  className="w-full max-w-[36px] bg-emerald-500 rounded-lg group-hover:animate-pulse group-hover:bg-emerald-600 dark:bg-emerald-600 transition-all duration-500"
                  style={{ height: `${col.val * 1.8}px` }}
                />
                <span className="mt-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {col.day}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Department allocation metrics block */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-5 text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Operational Department allocation
          </h3>
          <div className="space-y-4">
            {depts.map(dept => {
              const count = deptMap[dept] || 0;
              const ratio = totalEmp > 0 ? (count / totalEmp) * 100 : 0;
              return (
                <div
                  key={dept}
                  onClick={() => {
                    const list = state.employees.filter(e => e.dept === dept);
                    handleOpenDetail(`${dept} Department Team`, list);
                  }}
                  className="group flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                >
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 transition-colors">
                        {dept}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                        {count} Staff ({Math.round(ratio)}%)
                      </span>
                    </div>
                    {/* Progress tracking line bar */}
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
                      <div
                        className="h-full bg-emerald-500 rounded-full dark:bg-emerald-600 transition-all duration-500"
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 text-slate-300 ml-4 group-hover:translate-x-1 group-hover:text-slate-500 transition-all shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Operational Logs & Logs Grid */}
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <Terminal className="h-5 w-5 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Recent Operational Logs
            </h3>
          </div>
          <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 uppercase">
            Auto-auditing active
          </span>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500">
              No administrative system activities recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((log, idx) => (
                <div key={idx} className="flex px-6 py-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-xs items-center gap-4">
                  <span className="font-mono text-slate-400 shrink-0 select-none">
                    {log.time}
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-bold uppercase tracking-wider text-[9px] text-slate-600 dark:bg-slate-800 dark:text-slate-300 shrink-0">
                    {log.category}
                  </span>
                  <span className="text-slate-600 dark:text-slate-300 break-words flex-1">
                    {log.details}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Custom Detail modal of clicking KPIs */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={detailModalTitle}
        subtitle={`${detailEmployees.length} registered staff entries found.`}
        maxWidthClass="max-w-xl"
      >
        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-slate-50 dark:divide-slate-800 dark:bg-slate-900/50">
          {detailEmployees.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500">
              No matching profiles found in the registry.
            </div>
          ) : (
            detailEmployees.map(emp => (
              <div
                key={emp.id}
                onClick={() => handleRowClick(emp.id)}
                className="group flex items-center gap-4.5 p-4 hover:bg-white cursor-pointer hover:shadow-sm dark:hover:bg-slate-800/40 transition-all"
              >
                <img
                  src={emp.photo}
                  alt={emp.first}
                  className="h-10 w-10 rounded-full object-cover shadow-inner ring-1 ring-slate-200 dark:ring-slate-700"
                />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400 transition-colors">
                    {emp.first} {emp.last}
                  </h4>
                  <p className="font-mono text-[10px] text-slate-450 dark:text-slate-500 uppercase tracking-widest leading-none mt-1">
                    {emp.id} &bull; {emp.position}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                    MWK {emp.salary.toLocaleString()}
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500 dark:bg-slate-800">
                    {emp.branch}
                  </span>
                </div>
                <div className="rounded-xl bg-slate-100 p-1.5 opacity-0 group-hover:opacity-100 transition-all dark:bg-slate-800/50">
                  <ArrowRight className="h-4 w-4 text-emerald-600" />
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}
