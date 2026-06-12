/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Calculator, Download, Receipt, Printer, X, ShieldCheck } from "lucide-react";
import { jsPDF } from "jspdf";
import { DatabaseState, PayrollRecord, Employee } from "../types";
import { Modal } from "./Modals";
import { exportToCSV } from "../utils";

interface PayrollProps {
  state: DatabaseState;
  onRunPayroll: (payrollRecords: PayrollRecord[]) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function Payroll({
  state,
  onRunPayroll,
  showToast,
}: PayrollProps) {
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);

  const handleDownloadPDFPayslip = (p: PayrollRecord) => {
    const activeEmp = state.employees.find(e => e.id === p.id);
    const dateStr = new Date().toISOString().slice(0, 7);
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Set document properties
    doc.setProperties({
      title: `Payslip - ${p.name} - ${dateStr}`,
      subject: "Official Salary Remittance Advice",
      creator: "HR Desk Operations System",
    });

    let y = 15;

    // Beautiful header accent banner
    doc.setFillColor(16, 185, 129); // Accent emerald
    doc.rect(15, y, 180, 2, "F");
    y += 8;

    // Document header title
    doc.setTextColor(6, 78, 59); // Dark green
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("HR DESK OPERATIONS", 15, y);

    // Right-aligned status badge
    doc.setFillColor(209, 250, 229); // Light green backdrop for badge
    doc.roundedRect(145, y - 6, 50, 8, 1, 1, "F");
    doc.setTextColor(6, 95, 70); // Dark green
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("LIQUIDATION FINALIZED", 147, y - 1);

    y += 5;
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Official Corporate Pay Remittance Advice", 15, y);

    // Right-aligned sub-header
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text(`Month: ${dateStr}`, 145, y);

    y += 10;
    // Section separator line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(15, y, 195, y);

    y += 10;

    // Metadata Blocks with grey background cards
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, y, 85, 30, 2, 2, "F");
    doc.roundedRect(110, y, 85, 30, 2, 2, "F");

    // Employee section details
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("EMPLOYEE DETAILS", 20, y + 6);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(p.name, 20, y + 14);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Ref ID: ${p.id}`, 20, y + 22);

    // Job Assignment Coordinates
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("JOB ASSIGNMENT COORDINATES", 115, y + 6);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    const pos = activeEmp ? activeEmp.position : "Corporate Agent";
    const br = activeEmp ? activeEmp.branch : "Main Regional Branch";
    doc.text(`Position: ${pos}`, 115, y + 14);
    doc.text(`Branch: ${br}`, 115, y + 21);

    y += 40;

    // Table Headers
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y, 180, 8, "F");
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Description Part", 18, y + 5.5);
    
    // Right aligned header columns
    doc.text("Earnings (MWK)", 140, y + 5.5, { align: "right" });
    doc.text("Deductions (MWK)", 190, y + 5.5, { align: "right" });

    y += 8;

    const addTableRow = (desc: string, earnings: string, deductions: string) => {
      // Draw separator
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.2);
      doc.line(15, y + 8, 195, y + 8);

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(desc, 18, y + 5);

      if (earnings !== "-") {
        doc.setFont("helvetica", "bold");
        doc.text(earnings, 140, y + 5, { align: "right" });
      } else {
        doc.setTextColor(148, 163, 184);
        doc.text("-", 140, y + 5, { align: "right" });
      }

      doc.setTextColor(15, 23, 42);
      if (deductions !== "-") {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(225, 29, 72); // Rose hue for penalties
        doc.text(deductions, 190, y + 5, { align: "right" });
      } else {
        doc.setTextColor(148, 163, 184);
        doc.text("-", 190, y + 5, { align: "right" });
      }

      y += 8;
    };

    // 1. Basic Monthly Salary
    addTableRow("Basic monthly salary base", `MWK ${p.base.toLocaleString()}.00`, "-");

    // 2. PAYE Tax
    if (state.config.paye > 0) {
      addTableRow("PAYE Income progressive tax", "-", `MWK ${p.paye.toLocaleString()}.00`);
    }

    // 3. National pension
    if (state.config.pension > 0) {
      addTableRow("National pension statutory contribution", "-", `MWK ${p.pension.toLocaleString()}.00`);
    }

    // 4. Absenteeism
    if (p.absentDeduction > 0) {
      addTableRow(`Absenteeism Deduction (${p.absences} Days absent)`, "-", `MWK ${p.absentDeduction.toLocaleString()}.00`);
    }

    // 5. Cash advance recovery
    if (p.advances > 0) {
      addTableRow("Outstanding Cash Advance Recovery Deduction", "-", `MWK ${p.advances.toLocaleString()}.00`);
    }

    // 6. Outstanding Loans
    if (p.loans > 0) {
      addTableRow("Amortization loan repayment fraction", "-", `MWK ${p.loans.toLocaleString()}.00`);
    }

    // 7. Individual negligence deduction approvals
    const individualDeductions = state.deductionApprovals.filter(
      d => d.empId === p.id && d.date.startsWith(dateStr)
    );
    individualDeductions.forEach(d => {
      addTableRow(d.reason || "Negligence/Penalty Deduction", "-", `MWK ${d.amount.toLocaleString()}.00`);
    });

    // NET REMITTANCE ROW
    doc.setFillColor(240, 253, 244); // Light green backdrop
    doc.rect(15, y, 180, 11, "F");

    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.4);
    doc.line(15, y, 195, y);
    doc.line(15, y + 11, 195, y + 11);

    doc.setTextColor(6, 78, 59); // Dark green
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("NET REMITTANCE OUTFLOW SUM", 18, y + 7);

    doc.setTextColor(4, 120, 87); // Emerald bold
    doc.setFontSize(12);
    doc.text(`MWK ${p.net.toLocaleString()}.00`, 190, y + 7, { align: "right" });

    y += 25;

    // Footer lines
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text("This is a certified system-generated payslip remittance advice PDF document.", 105, y, { align: "center" });

    doc.save(`Payslip_${p.name.replace(/\s+/g, "_")}_${dateStr}.pdf`);
    showToast("Certified PDF payslip downloaded successfully!", "success");
  };

  const handleDownloadOfflinePayslip = (p: PayrollRecord) => {
    const activeEmp = state.employees.find(e => e.id === p.id);
    const dateStr = new Date().toISOString().slice(0, 7);
    const individualDeductions = state.deductionApprovals.filter(
      d => d.empId === p.id && d.date.startsWith(dateStr)
    );

    const deductionRows = individualDeductions.length > 0 
      ? individualDeductions.map(d => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: left; font-size: 13px;">${d.reason || "Negligence/Penalty Deduction"}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; color: #94a3b8; font-size: 13px;">-</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; color: #e11d48; font-weight: bold; font-family: monospace; font-size: 13px;">MWK ${d.amount.toLocaleString()}.00</td>
        </tr>
      `).join("")
      : "";

    const loanRow = p.loans > 0 ? `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: left; font-size: 13px;">Amortization loan repayment fraction</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; color: #94a3b8; font-size: 13px;">-</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; color: #e11d48; font-weight: bold; font-family: monospace; font-size: 13px;">MWK ${p.loans.toLocaleString()}.00</td>
      </tr>
    ` : "";

    const advanceRow = p.advances > 0 ? `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: left; font-size: 13px;">Outstanding Cash Advance Recovery Deduction</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; color: #94a3b8; font-size: 13px;">-</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; color: #e11d48; font-weight: bold; font-family: monospace; font-size: 13px;">MWK ${p.advances.toLocaleString()}.00</td>
      </tr>
    ` : "";

    const absentRow = p.absentDeduction > 0 ? `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: left; font-size: 13px;">Absenteeism Deduction (${p.absences} Days absent)</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; color: #94a3b8; font-size: 13px;">-</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; color: #e11d48; font-weight: bold; font-family: monospace; font-size: 13px;">MWK ${p.absentDeduction.toLocaleString()}.00</td>
      </tr>
    ` : "";

    const payeRow = state.config.paye > 0 ? `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: left; font-size: 13px;">PAYE Income progressive tax</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; color: #94a3b8;">-</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; color: #e11d48; font-weight: bold; font-family: monospace; font-size: 13px;">MWK ${p.paye.toLocaleString()}.00</td>
      </tr>
    ` : "";

    const pensionRow = state.config.pension > 0 ? `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: left; font-size: 13px;">National pension statutory contribution</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; color: #94a3b8;">-</td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; color: #e11d48; font-weight: bold; font-family: monospace; font-size: 13px;">MWK ${p.pension.toLocaleString()}.00</td>
      </tr>
    ` : "";

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payslip - ${p.name} - ${dateStr}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 40px;
      color: #0f172a;
    }
    .payslip-card {
      max-width: 650px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .header-section {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #10b981;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .hotel-title {
      font-size: 22px;
      font-weight: 800;
      color: #064e3b;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .hotel-subtitle {
      font-size: 11px;
      color: #64748b;
      margin: 4px 0 0 0;
      font-weight: 500;
    }
    .status-badge {
      background-color: #d1fae5;
      color: #065f46;
      padding: 4px 8px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .meta-blocks {
      display: grid;
      grid-template-cols: 1fr 1fr;
      gap: 20px;
      padding-bottom: 20px;
      border-bottom: 1px dashed #e2e8f0;
      margin-bottom: 24px;
    }
    .meta-item-label {
      font-size: 9px;
      text-transform: uppercase;
      color: #94a3b8;
      font-weight: 800;
      letter-spacing: 0.1em;
      margin-bottom: 4px;
    }
    .meta-item-val {
      font-size: 13px;
      font-weight: bold;
      margin: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th {
      border-bottom: 2px solid #cbd5e1;
      padding-bottom: 10px;
      color: #475569;
      text-transform: uppercase;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.05em;
    }
    td {
      padding: 10px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .net-container {
      background-color: #f0fdf4;
      font-weight: bold;
    }
    .net-container td {
      padding: 16px;
      border-top: 2px solid #10b981;
      border-bottom: 2px solid #10b981;
    }
    .footer-desc {
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      margin-top: 40px;
    }
    .action-btn {
      display: block;
      width: 100%;
      max-width: 220px;
      margin: 20px auto 0 auto;
      background-color: #10b981;
      color: white;
      border: none;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
      text-align: center;
      transition: background-color 0.2s;
    }
    .action-btn:hover {
      background-color: #059669;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .payslip-card {
        box-shadow: none;
        border: none;
        padding: 0;
      }
      .action-btn {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="payslip-card">
    <div class="header-section">
      <div>
        <h1 class="hotel-title">HR Desk operations</h1>
        <p class="hotel-subtitle">Official Corporate Pay Remittance Advice</p>
      </div>
      <div style="text-align: right;">
        <span class="status-badge">Liquidation Finalized</span>
        <div style="font-family: monospace; font-size: 10px; color: #64748b; margin-top: 8px;">Month: ${dateStr}</div>
      </div>
    </div>
    
    <div class="meta-blocks">
      <div>
        <div class="meta-item-label">Employee Details</div>
        <p class="meta-item-val">${p.name}</p>
        <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b;">Ref ID: ${p.id}</p>
      </div>
      <div>
        <div class="meta-item-label">Job Assignment Coordinates</div>
        <p class="meta-item-val" style="font-weight: 500; color: #334155;">
          Position: ${activeEmp ? activeEmp.position : "Corporate Agent"}<br>
          Branch: ${activeEmp ? activeEmp.branch : "Main Regional Branch"}
        </p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="text-align: left;">Description Part</th>
          <th style="text-align: right;">Earnings (MWK)</th>
          <th style="text-align: right;">Deductions (MWK)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: left; font-size: 13px;">Basic monthly salary base</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: bold; font-family: monospace; font-size: 13px;">MWK ${p.base.toLocaleString()}.00</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; text-align: right; color: #94a3b8;">-</td>
        </tr>
        ${payeRow}
        ${pensionRow}
        ${absentRow}
        ${advanceRow}
        ${loanRow}
        ${deductionRows}
        <tr class="net-container">
          <td style="text-align: left; color: #064e3b; text-transform: uppercase; font-size: 13px;">Net Remittance Outflow Sum</td>
          <td colspan="2" style="text-align: right; color: #047857; font-family: monospace; font-size: 16px; font-weight: 800;">MWK ${p.net.toLocaleString()}.00</td>
        </tr>
      </tbody>
    </table>

    <button class="action-btn" onclick="window.print()">Print This Payslip</button>
    <div class="footer-desc">
      <p>This is a certified system-generated payslip remittance advice document.</p>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Payslip_${p.name.replace(/\s+/g, "_")}_${dateStr}.html`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Certified standalone payslip downloaded successfully!", "success");
  };

  const handleRunPayroll = () => {
    const activeMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    const records: PayrollRecord[] = state.employees.map(emp => {
      // Find dynamic deduction values for current worker
      const monthLoans = state.loans
        .filter(l => l.empId === emp.id && l.paid < l.amount)
        .reduce((sum, l) => sum + Math.round(l.amount / l.months), 0);

      const monthAdvances = state.advances
        .filter(a => a.empId === emp.id && a.date.startsWith(activeMonth))
        .reduce((sum, a) => sum + a.amount, 0);

      // Historical month absences
      let absences = 0;
      Object.keys(state.attendance).forEach(dateStr => {
        if (dateStr.startsWith(activeMonth)) {
          if (state.attendance[dateStr]?.[emp.id]?.status === "Absent") {
            absences++;
          }
        }
      });

      const absentDeduction = absences * (state.config.daily_absent_deduction || 5000);

      // 5% Excessive absenteeism penalty deductions
      const penaltiesSum = state.deductionApprovals
        .filter(p => p.empId === emp.id && p.date.startsWith(activeMonth))
        .reduce((sum, p) => sum + p.amount, 0);

      // Calculate taxes & net remittance
      const base = emp.salary;

      // Corporate parameters progressive or straight tax base flat rate %
      const paye = Math.round(base * (state.config.paye / 100));
      const pension = Math.round(base * (state.config.pension / 100));

      const totalDeductions = monthLoans + monthAdvances + absentDeduction + penaltiesSum;
      const net = base - paye - pension - totalDeductions;

      return {
        id: emp.id,
        name: `${emp.first} ${emp.last}`,
        base,
        paye,
        pension,
        loans: monthLoans,
        advances: monthAdvances,
        absences,
        absentDeduction,
        penalties: penaltiesSum,
        net: net > 0 ? net : 0,
      };
    });

    onRunPayroll(records);
    showToast(`Calculated ledger for ${records.length} production members.`, "success");
  };

  const handleExport = () => {
    if (state.payroll.length === 0) {
      showToast("Please run payroll for the current month first.", "error");
      return;
    }

    const headers = ["Employee ID", "Full Name", "Base Salary", "Loans Fraction", "Advances", "Absent Deductions", "Penalties", "PAYE Tax", "Pension Contr", "Net Pay (MWK)"];
    const rows = state.payroll.map(p => [
      p.id,
      p.name,
      String(p.base),
      String(p.loans),
      String(p.advances),
      String(p.absentDeduction),
      String(p.penalties),
      String(p.paye),
      String(p.pension),
      String(p.net)
    ]);

    exportToCSV(headers, rows, "Regional_Payroll_Ledger_Statements");
  };

  const activeEmployee = selectedPayslip 
    ? state.employees.find(e => e.id === selectedPayslip.id)
    : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Run bar indicator header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
          Regional payroll management statements
        </h3>
        <div className="flex gap-2.5">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-850 transition"
          >
            <Download className="h-4.5 w-4.5 text-slate-500" />
            Export Ledger
          </button>
          <button
            onClick={handleRunPayroll}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-600 transition"
          >
            <Calculator className="h-4.5 w-4.5" />
            Calculate payroll
          </button>
        </div>
      </div>

      {/* Main Ledger display screen */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-550 dark:border-slate-800 dark:bg-slate-900/50">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4 text-right">Base Salary (MWK)</th>
                <th className="px-6 py-4 text-right">Acquired Deductions</th>
                <th className="px-6 py-4 text-right">PAYE progressive tax</th>
                <th className="px-6 py-4 text-right">Pension contribution</th>
                <th className="px-6 py-4 text-right">Net Liquidation Pay</th>
                <th className="px-6 py-4 text-center">Payslip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {state.payroll.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-400 dark:text-slate-400 leading-relaxed">
                    <p className="font-semibold text-slate-700 dark:text-slate-350">Ledger sheet is currently empty.</p>
                    <p className="text-xs text-slate-450 mt-1">Click "Calculate payroll" above to generate this month's payments allocation.</p>
                  </td>
                </tr>
              ) : (
                state.payroll.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/25 dark:hover:bg-slate-800/10 transition pb-2">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                      {p.name}
                      <span className="block font-mono text-[9px] font-semibold text-slate-400 leading-none mt-1">
                        ID: {p.id}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-600 dark:text-slate-300">
                      {p.base.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-rose-600 dark:text-rose-400">
                      -{(p.loans + p.advances + p.absentDeduction + p.penalties).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-600 dark:text-slate-300">
                      {p.paye.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-600 dark:text-slate-300">
                      {p.pension.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-extrabold text-slate-900 dark:text-white">
                      {p.net.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedPayslip(p)}
                        className="rounded-xl bg-slate-55 border border-slate-150 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 dark:border-slate-800 text-slate-500 dark:text-slate-400 transition"
                      >
                        <Receipt className="h-4.5 w-4.5 text-emerald-600" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORM MODAL: VIEW OFFICIAL PAYSLIP REMITTANCE STATEMENT */}
      <Modal
        isOpen={selectedPayslip !== null}
        onClose={() => setSelectedPayslip(null)}
        title="Official Payslip statement"
        subtitle="Receipt statement of employee liquidation statement."
        maxWidthClass="max-w-2xl"
      >
        {selectedPayslip && (
          <div className="space-y-6">
            {/* Printable Frame Area */}
            <div id="print-zone" className="border border-slate-150 p-6 bg-slate-50 select-text rounded-2xl dark:bg-slate-950 dark:border-slate-800">
              <div className="flex items-center justify-between border-b pb-4 dark:border-slate-850">
                <div>
                  <h2 className="text-xl font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                    HR Desk operations
                  </h2>
                  <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                    Official Corporate Pay Remittance Advice
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-100/80 px-2.5 py-1 text-xs font-bold uppercase text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-350">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Liquidation Finalized
                  </span>
                  <p className="text-[9px] font-mono font-medium text-slate-405 mt-1">
                    Remitted: {new Date().toISOString().slice(0, 7)}
                  </p>
                </div>
              </div>

              {/* Employee statement coordinates */}
              <div className="grid grid-cols-2 gap-4 py-4 border-b border-dashed dark:border-slate-850 text-xs">
                <div>
                  <p className="text-slate-400 uppercase font-semibold text-[9px]">Employee Name</p>
                  <p className="font-bold text-slate-850 dark:text-white mt-0.5">
                    {selectedPayslip.name}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 uppercase font-semibold text-[9px]">Assignment Coordinates</p>
                  <p className="font-semibold text-slate-700 dark:text-slate-350 mt-0.5 leading-normal">
                    ID Ref: {selectedPayslip.id} <br />
                    Position: {activeEmployee ? activeEmployee.position : "Corporate Agent"} <br />
                    Branch: {activeEmployee ? activeEmployee.branch : "Main Regional Branch"}
                  </p>
                </div>
              </div>

              {/* Liquidation Balance Sheet Statement */}
              <div className="pt-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b font-bold tracking-wide uppercase text-slate-550 dark:border-slate-800">
                      <th className="text-left pb-2">Description element</th>
                      <th className="text-right pb-2">Earnings (MWK)</th>
                      <th className="text-right pb-2">Deductions (MWK)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono font-medium text-slate-650 dark:divide-slate-850 dark:text-slate-350 leading-relaxed">
                    <tr>
                      <td className="py-2">Basic active salary base</td>
                      <td className="text-right font-bold text-slate-900 dark:text-white">
                        {selectedPayslip.base.toLocaleString()}.00
                      </td>
                      <td className="text-right text-slate-400">-</td>
                    </tr>
                    <tr>
                      <td className="py-2">PAYE Government Income Tax</td>
                      <td className="text-right text-slate-400">-</td>
                      <td className="text-right text-rose-600 dark:text-rose-450 font-bold">
                        {selectedPayslip.paye.toLocaleString()}.00
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2">National pension statutory contribution</td>
                      <td className="text-right text-slate-400">-</td>
                      <td className="text-right text-rose-600 dark:text-rose-450 font-bold">
                        {selectedPayslip.pension.toLocaleString()}.00
                      </td>
                    </tr>
                    {selectedPayslip.advances > 0 && (
                      <tr>
                        <td className="py-2">Outstanding cash advance recovery deduction</td>
                        <td className="text-right text-slate-400">-</td>
                        <td className="text-right text-rose-600 dark:text-rose-450 font-bold">
                          {selectedPayslip.advances.toLocaleString()}.00
                        </td>
                      </tr>
                    )}
                    {selectedPayslip.loans > 0 && (
                      <tr>
                        <td className="py-2">Amortization loan repayment fraction</td>
                        <td className="text-right text-slate-400">-</td>
                        <td className="text-right text-rose-600 dark:text-rose-450 font-bold">
                          {selectedPayslip.loans.toLocaleString()}.00
                        </td>
                      </tr>
                    )}
                    {selectedPayslip.absentDeduction > 0 && (
                      <tr>
                        <td className="py-2">
                          Absenteeism deduction penalties ({selectedPayslip.absences} Days absent)
                        </td>
                        <td className="text-right text-slate-400">-</td>
                        <td className="text-right text-rose-600 dark:text-rose-450 font-bold">
                          {selectedPayslip.absentDeduction.toLocaleString()}.00
                        </td>
                      </tr>
                    )}
                    {(() => {
                      const activeMonth = new Date().toISOString().slice(0, 7);
                      const individualDeductions = state.deductionApprovals.filter(
                        d => d.empId === selectedPayslip.id && d.date.startsWith(activeMonth)
                      );
                      
                      if (individualDeductions.length > 0) {
                        return individualDeductions.map(d => (
                          <tr key={d.id}>
                            <td className="py-2">{d.reason || "Negligence Penalty Deduction"}</td>
                            <td className="text-right text-slate-400">-</td>
                            <td className="text-right text-rose-600 dark:text-rose-450 font-bold font-mono">
                              {d.amount.toLocaleString()}.00
                            </td>
                          </tr>
                        ));
                      } else if (selectedPayslip.penalties > 0) {
                        return (
                          <tr>
                            <td className="py-2">Excessive absence deduction penalties (5% rule)</td>
                            <td className="text-right text-slate-400">-</td>
                            <td className="text-right text-rose-600 dark:text-rose-450 font-bold font-mono">
                              {selectedPayslip.penalties.toLocaleString()}.00
                            </td>
                          </tr>
                        );
                      }
                      return null;
                    })()}
                    <tr className="border-t font-semibold leading-relaxed font-sans text-sm text-slate-900 bg-emerald-50/50 dark:bg-emerald-950/25">
                      <td className="py-3 px-2 font-bold text-slate-800 dark:text-white">
                        NET REMITTANCE OUTFLOW SUM
                      </td>
                      <td colSpan={2} className="text-right pr-2 text-emerald-800 dark:text-emerald-400 font-mono font-extrabold text-base">
                        MWK {selectedPayslip.net.toLocaleString()}.00
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Print and dismiss controls */}
            <div className="border-t border-slate-100 pt-4 flex flex-wrap gap-3 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedPayslip(null)}
                className="flex-1 min-w-[120px] rounded-xl border border-slate-200 px-4 py-2 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 text-sm font-bold transition"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => handleDownloadOfflinePayslip(selectedPayslip)}
                className="flex-1 min-w-[130px] rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 py-2 px-3 text-sm font-bold transition inline-flex items-center justify-center gap-1"
              >
                <Download className="h-4 w-4 text-emerald-500" />
                HTML Standalone
              </button>
              <button
                type="button"
                onClick={() => handleDownloadPDFPayslip(selectedPayslip)}
                className="flex-1 min-w-[130px] rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 py-2 px-3 text-sm font-bold shadow-sm transition inline-flex items-center justify-center gap-1.5"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 min-w-[120px] rounded-xl bg-slate-800 hover:bg-slate-900 text-white py-2 px-3 text-sm font-bold shadow-sm transition inline-flex items-center justify-center gap-1.5 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                <Printer className="h-4.5 w-4.5" />
                Print
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
