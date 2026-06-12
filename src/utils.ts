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
        config: { ...DEFAULT_CONFIG, ...(parsed.config || {}) },
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
