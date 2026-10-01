/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DatabaseState, Employee } from "./types";

export const DEFAULT_CONFIG = {
  paye: 30,
  pension: 5,
  ot_rate: 1.5,
  daily_absent_deduction: 5000,
  leave_days: 21,
  company_name: "HR Desk Operations",
  positionSalaries: {
    "Head Chef": 650000,
    "Chef": 450000,
    "Porter": 180000,
    "Waiter": 220000,
    "Waitress": 220000,
    "Administrator": 400000,
    "Finance Lead": 550000,
    "Human Resources Executive": 520000,
  },
};

export function getAvatarUrl(gender: string, name: string): string {
  const isFemale = gender?.toLowerCase() === "female";
  
  // Custom professional corporate passport-style SVG avatars
  // Completely serious, formal posture, styled as a standard official employee ID photo
  const svg = isFemale 
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <!-- Official Light Blue Soft Corporate Background -->
        <rect width="100" height="100" fill="#f0f7ff" />
        <rect x="2" y="2" width="96" height="96" rx="6" fill="none" stroke="#bfdbfe" stroke-width="1.5" />
        
        <!-- Passport/ID Frame Watermark grids -->
        <line x1="10" y1="50" x2="90" y2="50" stroke="#dbeafe" stroke-width="0.5" stroke-dasharray="1 3" />
        <line x1="50" y1="10" x2="50" y2="90" stroke="#dbeafe" stroke-width="0.5" stroke-dasharray="1 3" />
        
        <!-- Dignified Shoulder Silhouette & Blazer (Teal/Slate corporate wear) -->
        <path d="M18 100 Q18 84 32 80 L50 80 L68 80 Q82 84 82 100 Z" fill="#334155" />
        <path d="M42 80 L50 94 L58 80 Z" fill="#ffffff" /> <!-- V-neck style white inner blouse -->
        
        <!-- Neck -->
        <rect x="44" y="60" width="12" height="20" rx="3" fill="#f5cac3" />
        
        <!-- Face Oval (Neutral Expression) -->
        <ellipse cx="50" cy="48" rx="16" ry="19" fill="#f7d1ba" />
        
        <!-- Eyebrows (Serious/Formal) -->
        <path d="M38 41 Q43 39 46 42" fill="none" stroke="#2d1a10" stroke-width="1.2" stroke-linecap="round" />
        <path d="M62 41 Q57 39 54 42" fill="none" stroke="#2d1a10" stroke-width="1.2" stroke-linecap="round" />
        
        <!-- Neutral Eyes (Looking directly forward for passport) -->
        <ellipse cx="43" cy="45" rx="1.5" ry="1.8" fill="#1e293b" />
        <ellipse cx="57" cy="45" rx="1.5" ry="1.8" fill="#1e293b" />
        
        <!-- Nose (Structured & simple) -->
        <path d="M50 44 L48 52 L51 52" fill="none" stroke="#e09f80" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" />
        
        <!-- Serious Neutral Mouth (Standard passport rule: NO smiling, strictly formal) -->
        <path d="M46 59 Q50 60 54 59" fill="none" stroke="#ca8a04" stroke-width="1" stroke-linecap="round" />
        <path d="M47 58.5 L53 58.5" fill="none" stroke="#b45309" stroke-width="0.5" />
        
        <!-- Professional Hair (Neat, clean formal hair) -->
        <path d="M50 25 Q30 25 30 48 Q30 65 33 68 Q36 50 50 33 Q64 50 67 68 Q70 65 70 48 Q70 25 50 25 Z" fill="#2d1a10" />
      </svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <!-- Official Light Blue Soft Corporate Background -->
        <rect width="100" height="100" fill="#f0f7ff" />
        <rect x="2" y="2" width="96" height="96" rx="6" fill="none" stroke="#bfdbfe" stroke-width="1.5" />
        
        <!-- Passport/ID Frame Watermark grids -->
        <line x1="10" y1="50" x2="90" y2="50" stroke="#dbeafe" stroke-width="0.5" stroke-dasharray="1 3" />
        <line x1="50" y1="10" x2="50" y2="90" stroke="#dbeafe" stroke-width="0.5" stroke-dasharray="1 3" />
        
        <!-- Dignified Shoulder Silhouette & Suit (Corporate navy blue jacket) -->
        <path d="M16 100 Q16 80 32 76 L50 78 L68 76 Q84 80 84 100 Z" fill="#1e293b" />
        <!-- Inner white shirt & tie -->
        <path d="M42 77 L50 90 L58 77 Z" fill="#ffffff" />
        <path d="M48 83 L52 83 L51 98 L49 98 Z" fill="#b91c1c" /> <!-- Red corporate tie -->
        
        <!-- Neck -->
        <rect x="44" y="58" width="12" height="20" rx="3" fill="#ebd0c5" />
        
        <!-- Face Oval (Neutral Expression) -->
        <ellipse cx="50" cy="46" rx="15" ry="18" fill="#f3d4c7" />
        
        <!-- Eyebrows (Serious/Formal) -->
        <path d="M39 39 Q44 37 47 40" fill="none" stroke="#0f172a" stroke-width="1.5" stroke-linecap="round" />
        <path d="M61 39 Q56 37 53 40" fill="none" stroke="#0f172a" stroke-width="1.5" stroke-linecap="round" />
        
        <!-- Neutral Eyes (Looking directly forward for passport) -->
        <ellipse cx="43" cy="43" rx="1.5" ry="1.8" fill="#1e293b" />
        <ellipse cx="57" cy="43" rx="1.5" ry="1.8" fill="#1e293b" />
        
        <!-- Nose (Structured & simple) -->
        <path d="M50 42 L48 50 L51 50" fill="none" stroke="#ca8a04" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" />
        
        <!-- Serious Neutral Mouth (Standard passport rule: NO smiling, strictly formal) -->
        <path d="M46 56 Q50 57 54 56" fill="none" stroke="#b45309" stroke-width="1" stroke-linecap="round" />
        <path d="M47 55.5 L53 55.5" fill="none" stroke="#9a3412" stroke-width="0.5" />
        
        <!-- Professional Short Hair (Neat, clean formal hair) -->
        <path d="M33 38 C33 24 67 24 67 38 C67 30 63 24 50 24 C37 24 33 30 33 38 Z" fill="#0f172a" />
        <path d="M33 34 Q50 20 67 34" fill="none" stroke="#0f172a" stroke-width="1" />
      </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: "EMP-001",
    first: "Chikondi",
    last: "Phiri",
    gender: "Male",
    position: "Head Chef",
    dept: "Kitchen",
    branch: "Main Branch",
    salary: 750000,
    national: "BT-LL-992",
    cstart: "2025-01-01",
    cend: "2027-12-31",
    photo: getAvatarUrl("Male", "Chikondi"),
  },
  {
    id: "EMP-002",
    first: "Limbani",
    last: "Banda",
    gender: "Male",
    position: "Administrator",
    dept: "Administration",
    branch: "Main Branch",
    salary: 850000,
    national: "LL-ZA-004",
    cstart: "2024-06-15",
    cend: "2026-06-14",
    photo: getAvatarUrl("Male", "Limbani"),
  },
  {
    id: "EMP-003",
    first: "Tiwonge",
    last: "Mhango",
    gender: "Female",
    position: "Finance lead",
    dept: "Finance",
    branch: "Lilongwe Branch",
    salary: 950000,
    national: "MZ-KK-115",
    cstart: "2023-01-10",
    cend: "2026-10-31",
    photo: getAvatarUrl("Female", "Tiwonge"),
  },
  {
    id: "EMP-004",
    first: "Mphatso",
    last: "Chirwa",
    gender: "Female",
    position: "Chef",
    dept: "Kitchen",
    branch: "Lilongwe Branch",
    salary: 450000,
    national: "ZA-LL-882",
    cstart: "2025-02-01",
    cend: "2026-07-31",
    photo: getAvatarUrl("Female", "Mphatso"),
  },
  {
    id: "EMP-005",
    first: "Alinafe",
    last: "Kachale",
    gender: "Female",
    position: "Waitress",
    dept: "Operations",
    branch: "Main Branch",
    salary: 280000,
    national: "ZA-LL-221",
    cstart: "2025-03-01",
    cend: "2026-06-30",
    photo: getAvatarUrl("Female", "Alinafe"),
  }
];

export const INITIAL_STATE: DatabaseState = {
  employees: INITIAL_EMPLOYEES,
  attendance: {
    "2026-06-09": {
      "EMP-001": { status: "Present", inTime: "08:00", outTime: "17:00" },
      "EMP-002": { status: "Present", inTime: "08:05", outTime: "17:30" },
      "EMP-003": { status: "Present", inTime: "07:50", outTime: "17:00" },
      "EMP-004": { status: "Absent", inTime: "00:00", outTime: "00:00" },
      "EMP-005": { status: "Present", inTime: "08:15", outTime: "17:00" },
    }
  },
  leave: [
    {
      id: "LV-001",
      empId: "EMP-004",
      type: "Annual Leave",
      start: "2026-06-12",
      end: "2026-06-19",
      days: 6,
      by: "Limbani Banda",
      status: "Approved",
    }
  ],
  payroll: [],
  loans: [
    {
      id: "LN-001",
      empId: "EMP-001",
      amount: 600000,
      months: 12,
      paid: 150000,
    }
  ],
  advances: [
    {
      id: "AD-001",
      empId: "EMP-005",
      amount: 40000,
      date: "2026-06-05",
    }
  ],
  disciplinary: [
    {
      id: "DS-001",
      empId: "EMP-005",
      desc: "Late opening of floor space operations",
      action: "Written Warning",
      date: "2026-05-18",
    }
  ],
  documents: [
    {
      id: "DOC-001",
      empId: "EMP-002",
      type: "Employment Contract File",
      name: "Banda_L_Contract_2024.pdf"
    }
  ],
  branches: ["Main Branch", "Lilongwe Branch", "Blantyre Branch"],
  config: DEFAULT_CONFIG,
  deductionApprovals: [],
  roster: [],
  transfers: [],
};

const STORAGE_KEY = "CCASH_HR_DB_REACT";

export function loadDatabase(): DatabaseState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.employees) {
        parsed.employees = parsed.employees.map((e: any) => ({
          ...e,
          photo: getAvatarUrl(e.gender || "Female", e.first)
        }));
      }
      // Guarantee any missing keys are populated
      return {
        ...INITIAL_STATE,
        ...parsed,
        transfers: parsed.transfers || [],
        config: {
          ...DEFAULT_CONFIG,
          ...(parsed.config || {}),
          positionSalaries: {
            ...DEFAULT_CONFIG.positionSalaries,
            ...(parsed.config?.positionSalaries || {})
          }
        },
      };
    }
  } catch (err) {
    console.error("Stalled loading DB:", err);
  }
  return INITIAL_STATE;
}

export function saveDatabase(state: DatabaseState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("Stalled saving DB:", err);
  }
}

export function exportToCSV(headers: string[], rows: string[][], filename: string): void {
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => {
      // Escape cell strings
      const secureCell = cell ? String(cell).replace(/"/g, '""') : "";
      return secureCell.includes(",") || secureCell.includes('"') || secureCell.includes("\n")
        ? `"${secureCell}"`
        : secureCell;
    }).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function parseCSVInput(text: string): string[][] {
  const result: string[][] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const row: string[] = [];
    let inQuotes = false;
    let currentCell = "";
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(currentCell.trim());
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
    row.push(currentCell.trim());
    result.push(row);
  }
  return result;
}

export function capitalizeString(str: string): string {
  return str
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function calculateWorkingHours(status: string, inTime: string, outTime: string): number {
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
}

export function calculateOvertimeHours(outTime: string, inTime: string = "06:00", status: string = "Present"): number {
  const worked = calculateWorkingHours(status, inTime, outTime);
  return worked > 8.0 ? parseFloat((worked - 8.0).toFixed(1)) : 0;
}

/**
 * Returns numerical rank for position alignment in export documents & registries:
 * 1. Head Chef
 * 2. Chef
 * 3. Waiter
 * 4. Waitress
 * 5. Porter
 * 6. Admin
 * 100+. Other positions
 */
export function getPositionRank(position?: string): number {
  if (!position) return 999;
  const p = position.trim().toLowerCase();

  // 1. Head Chef
  if (p === "head chef" || p.startsWith("head chef") || p.includes("head chef")) {
    return 1;
  }
  // 2. Chef (excluding head chef)
  if (p === "chef" || p.endsWith("chef") || p.includes("chef") || p.includes("cook")) {
    return 2;
  }
  // 3. Waiter (strict check to avoid matching waitress)
  if (p === "waiter" || (p.includes("waiter") && !p.includes("waitress"))) {
    return 3;
  }
  // 4. Waitress
  if (p === "waitress" || p.includes("waitress")) {
    return 4;
  }
  // 5. Porter
  if (p === "porter" || p.includes("porter")) {
    return 5;
  }
  // 6. Admin / Administrator
  if (
    p === "admin" ||
    p === "administrator" ||
    p === "administration" ||
    p.includes("admin")
  ) {
    return 6;
  }

  // Any other positions
  return 100;
}

/**
 * Comparator to align employees strictly:
 * Head Chef -> Chef -> Waiter -> Waitress -> Porter -> Admin -> Others
 */
export function sortEmployeesByPositionHierarchy(a: Employee, b: Employee): number {
  const rankA = getPositionRank(a.position);
  const rankB = getPositionRank(b.position);
  if (rankA !== rankB) {
    return rankA - rankB;
  }

  // If same rank, compare position name alphabetically
  const posComp = (a.position || "").localeCompare(b.position || "");
  if (posComp !== 0) return posComp;

  // Then compare full name
  const nameA = `${a.first} ${a.last}`.trim().toLowerCase();
  const nameB = `${b.first} ${b.last}`.trim().toLowerCase();
  const nameComp = nameA.localeCompare(nameB);
  if (nameComp !== 0) return nameComp;

  return a.id.localeCompare(b.id);
}

/**
 * Generates an official, printable and downloadable corporate Staff Directory document
 * with employees strictly aligned: Head Chef, Chef, Waiter, Waitress, Porter, Admin.
 */
export function exportEmployeeRegisterHTML(
  employees: Employee[],
  companyName: string = "HR Desk Operations",
  branchName: string = "All Branches"
): void {
  const sorted = [...employees].sort(sortEmployeesByPositionHierarchy);
  const totalSalary = sorted.reduce((sum, e) => sum + (e.salary || 0), 0);
  const activeCount = sorted.filter(e => !e.isTerminated).length;
  const dateStr = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

  const rowsHtml = sorted.map((emp, index) => {
    const rank = getPositionRank(emp.position);
    let rankBadge = "";
    if (rank === 1) rankBadge = `<span style="background:#fef3c7;color:#92400e;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:bold;border:1px solid #fde68a;">1. Head Chef</span>`;
    else if (rank === 2) rankBadge = `<span style="background:#e0f2fe;color:#0369a1;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:bold;border:1px solid #bae6fd;">2. Chef</span>`;
    else if (rank === 3) rankBadge = `<span style="background:#ecfdf5;color:#047857;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:bold;border:1px solid #a7f3d0;">3. Waiter</span>`;
    else if (rank === 4) rankBadge = `<span style="background:#fdf2f8;color:#be185d;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:bold;border:1px solid #fbcfe8;">4. Waitress</span>`;
    else if (rank === 5) rankBadge = `<span style="background:#f3e8ff;color:#6b21a8;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:bold;border:1px solid #e9d5ff;">5. Porter</span>`;
    else if (rank === 6) rankBadge = `<span style="background:#f1f5f9;color:#334155;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:bold;border:1px solid #cbd5e1;">6. Admin</span>`;
    else rankBadge = `<span style="background:#f8fafc;color:#64748b;padding:2px 7px;border-radius:4px;font-size:10px;border:1px solid #e2e8f0;">Staff Role</span>`;

    const statusBadge = emp.isTerminated
      ? `<span style="color:#dc2626;font-weight:bold;font-size:11px;background:#fef2f2;padding:2px 6px;border-radius:4px;border:1px solid #fecaca;">Terminated</span>`
      : `<span style="color:#16a34a;font-weight:bold;font-size:11px;background:#f0fdf4;padding:2px 6px;border-radius:4px;border:1px solid #bbf7d0;">Active</span>`;

    return `
      <tr style="border-bottom:1px solid #e2e8f0;${index % 2 === 1 ? 'background:#fafafa;' : ''}">
        <td style="padding:10px 12px;text-align:center;font-weight:600;color:#64748b;font-size:11px;">${index + 1}</td>
        <td style="padding:10px 12px;font-family:monospace;font-weight:700;color:#334155;font-size:12px;">${emp.id}</td>
        <td style="padding:10px 12px;">
          <div style="font-weight:bold;color:#0f172a;font-size:13px;">${emp.first} ${emp.last}</div>
          <div style="font-size:10px;color:#64748b;margin-top:2px;">${emp.gender || 'Other'} &bull; National ID: ${emp.national || 'N/A'}</div>
        </td>
        <td style="padding:10px 12px;">
          <div style="font-weight:700;color:#1e293b;font-size:12px;margin-bottom:3px;">${emp.position || 'Staff'}</div>
          ${rankBadge}
        </td>
        <td style="padding:10px 12px;color:#475569;font-size:12px;">${emp.dept || 'Operations'}</td>
        <td style="padding:10px 12px;color:#475569;font-size:12px;font-weight:600;">${emp.branch || 'Main Branch'}</td>
        <td style="padding:10px 12px;text-align:right;font-family:monospace;font-weight:700;color:#0f172a;font-size:12px;">
          MWK ${(emp.salary || 0).toLocaleString()}
        </td>
        <td style="padding:10px 12px;text-align:center;">${statusBadge}</td>
        <td style="padding:10px 12px;color:#64748b;font-size:11px;text-align:center;">${emp.cend || 'N/A'}</td>
      </tr>
    `;
  }).join("");

  const docHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${companyName} - Official Employee Registry Document</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; margin: 0; padding: 24px; background: #f8fafc; }
    .page-container { max-width: 1150px; margin: 0 auto; background: #fff; padding: 36px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header-bar { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 18px; margin-bottom: 20px; }
    .company-title { font-size: 22px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
    .doc-subtitle { font-size: 13px; font-weight: 800; color: #059669; text-transform: uppercase; margin-top: 4px; letter-spacing: 0.8px; }
    .meta-box { text-align: right; font-size: 11px; color: #64748b; line-height: 1.6; }
    .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 22px; }
    .kpi-card { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; border-left: 4px solid #059669; }
    .kpi-label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi-val { font-size: 18px; font-weight: 900; color: #0f172a; margin-top: 4px; }
    .hierarchy-legend { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; margin-bottom: 20px; font-size: 11px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; color: #166534; }
    .hierarchy-legend strong { color: #0f172a; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 30px; }
    th { background: #0f172a; color: #fff; padding: 10px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; }
    .signatures-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 36px; padding-top: 24px; border-top: 1px dashed #cbd5e1; }
    .sig-box { font-size: 11px; color: #475569; }
    .sig-line { border-bottom: 1px solid #94a3b8; height: 36px; margin-bottom: 6px; }
    .sig-title { font-weight: 700; color: #0f172a; text-transform: uppercase; font-size: 10px; }
    .print-controls { margin-bottom: 16px; display: flex; justify-content: flex-end; gap: 10px; max-width: 1150px; margin-left: auto; margin-right: auto; }
    .btn { padding: 9px 18px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; border: none; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
    .btn-primary { background: #059669; color: #fff; box-shadow: 0 2px 4px rgba(5,150,105,0.2); }
    .btn-primary:hover { background: #047857; }
    @media print {
      body { background: #fff; padding: 0; }
      .page-container { box-shadow: none; padding: 0; border: none; }
      .print-controls { display: none !important; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="print-controls">
    <button class="btn btn-primary" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>
  <div class="page-container">
    <div class="header-bar">
      <div>
        <div class="company-title">${companyName}</div>
        <div class="doc-subtitle">Official Staff Register &amp; Alignment Document</div>
      </div>
      <div class="meta-box">
        <div><strong>Branch Location:</strong> ${branchName}</div>
        <div><strong>Export Date:</strong> ${dateStr}</div>
        <div><strong>Document Status:</strong> Certified Official Copy</div>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-label">Total Registered Staff</div>
        <div class="kpi-val">${sorted.length} Teammates</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Active Headcount</div>
        <div class="kpi-val">${activeCount} Active</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Monthly Payroll Remittance</div>
        <div class="kpi-val">MWK ${totalSalary.toLocaleString()}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Position Alignment</div>
        <div class="kpi-val" style="font-size:12px;font-weight:800;color:#059669;margin-top:6px;">
          Head Chef &rarr; Chef &rarr; Waiter &rarr; Waitress &rarr; Porter &rarr; Admin
        </div>
      </div>
    </div>

    <div class="hierarchy-legend">
      <strong>Hierarchical Alignment Order:</strong>
      <span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:4px;font-weight:bold;">1. Head Chef</span> &rarr;
      <span style="background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:4px;font-weight:bold;">2. Chef</span> &rarr;
      <span style="background:#ecfdf5;color:#047857;padding:2px 6px;border-radius:4px;font-weight:bold;">3. Waiter</span> &rarr;
      <span style="background:#fdf2f8;color:#be185d;padding:2px 6px;border-radius:4px;font-weight:bold;">4. Waitress</span> &rarr;
      <span style="background:#f3e8ff;color:#6b21a8;padding:2px 6px;border-radius:4px;font-weight:bold;">5. Porter</span> &rarr;
      <span style="background:#f1f5f9;color:#334155;padding:2px 6px;border-radius:4px;font-weight:bold;">6. Admin</span> &rarr;
      <span style="color:#64748b;">7. Other Roles</span>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:36px;text-align:center;">#</th>
          <th style="width:85px;">Serial ID</th>
          <th>Full Name &amp; Profile</th>
          <th>Position Title &amp; Rank</th>
          <th>Department</th>
          <th>Branch</th>
          <th style="text-align:right;">Salary (MWK)</th>
          <th style="text-align:center;width:75px;">Status</th>
          <th style="text-align:center;width:95px;">Contract End</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="signatures-grid">
      <div class="sig-box">
        <div class="sig-title">Prepared By (Human Resources)</div>
        <div class="sig-line"></div>
        <div>Signature: __________________ &bull; Date: __________</div>
      </div>
      <div class="sig-box">
        <div class="sig-title">Verified By (Operations Control)</div>
        <div class="sig-line"></div>
        <div>Signature: __________________ &bull; Date: __________</div>
      </div>
      <div class="sig-box">
        <div class="sig-title">Approved By (Regional Manager)</div>
        <div class="sig-line"></div>
        <div>Official Seal: _______________ &bull; Date: __________</div>
      </div>
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([docHTML], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `Staff_Register_${branchName.replace(/\s+/g, '_')}_${new Date().toISOString().split("T")[0]}.html`);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(docHTML);
    printWindow.document.close();
  }
}
