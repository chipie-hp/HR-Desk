/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Plus, Folder, Calendar, FileCheck, ShieldAlert, Download, HardDrive } from "lucide-react";
import { DatabaseState, DocumentRecord } from "../types";
import { Modal } from "./Modals";
import { exportToCSV } from "../utils";

interface DocumentsProps {
  state: DatabaseState;
  onArchiveDocument: (doc: Omit<DocumentRecord, "id">) => void;
  onSelectEmployee?: (empId: string, dossierTab?: "overview" | "financials" | "attendance" | "compliance") => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function Documents({
  state,
  onArchiveDocument,
  onSelectEmployee,
  showToast,
}: DocumentsProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Form states
  const [empId, setEmpId] = useState("");
  const [type, setType] = useState("Employment Contract File");
  const [name, setName] = useState("");

  useEffect(() => {
    if (state.employees.length > 0 && !empId) {
      setEmpId(state.employees[0].id);
    }
  }, [state.employees, empId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId || !type || !name) {
      showToast("Please fully define document coordinates.", "error");
      return;
    }

    onArchiveDocument({
      empId,
      type,
      name,
    });

    // Reset
    setName("");
    setIsOpen(false);
    showToast("Document archived in local virtual vault index.", "success");
  };

  const handleExport = () => {
    const headers = ["Associated Employee", "Branch", "Document Classification", "Stored Filename", "Host Node"];
    const rows = state.documents.map(d => {
      const emp = state.employees.find(e => e.id === d.empId);
      return [
        emp ? `${emp.first} ${emp.last}` : "Unknown Profile",
        emp ? emp.branch : "N/A",
        d.type,
        d.name,
        "Local Virtual Vault Storage Link"
      ];
    });
    exportToCSV(headers, rows, "Document_Vault_Audit_Index");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-505 uppercase tracking-wider">
          Teammate document archiver vaults
        </h3>
        <div className="flex gap-2.5">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition"
          >
            <Download className="h-4.5 w-4.5 text-slate-550" />
            Export Vault Index
          </button>
          <button
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-600 transition"
          >
            <Plus className="h-4.5 w-4.5" />
            Archive Document
          </button>
        </div>
      </div>

      {/* Main documents registry archive list */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-505 dark:border-slate-800 dark:bg-slate-900/50">
                <th className="px-6 py-4">Associated Employee</th>
                <th className="px-6 py-4">Document Classification Type</th>
                <th className="px-6 py-4">Filename File</th>
                <th className="px-6 py-4 text-center">Node Storage Class</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {state.documents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-slate-400 dark:text-slate-500">
                    Vault is empty. No corporate documents archived yet.
                  </td>
                </tr>
              ) : (
                state.documents.map(doc => {
                  const emp = state.employees.find(e => e.id === doc.empId);
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/10 transition">
                      <td className="px-6 py-4.5">
                        <div 
                          className="flex items-center gap-3 cursor-pointer group/item"
                          onClick={() => emp && onSelectEmployee && onSelectEmployee(emp.id, "compliance")}
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
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-sky-50 border border-sky-100 px-3 py-1 text-xs font-bold text-sky-850 dark:bg-sky-950/20 dark:text-sky-305 dark:border-sky-950/20">
                          <Folder className="h-3.5 w-3.5" />
                          {doc.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-700 dark:text-slate-300 break-all">
                        {doc.name}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-805 dark:text-slate-350 leading-none">
                          <HardDrive className="h-3 w-3 shrink-0" />
                          Vault Storage Node
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

      {/* FORM MODAL: REGISTER DOCUMENT */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Archive Employee Document File"
        subtitle="Host identification copies, academic profiles or medical files in vault."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide dark:text-slate-350 mb-1">
              Associated Employee Profile
            </label>
            <select
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-101"
            >
              {state.employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.first} {e.last} ({e.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide dark:text-slate-305 mb-1">
              Document Classification Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
            >
              <option value="Employment Contract File">Employment Contract File</option>
              <option value="National ID Copy">National ID Copy</option>
              <option value="Academic Certification Certificate">Academic Certification Certificate</option>
              <option value="Medical Health Assessment Form">Medical Health Assessment Form</option>
              <option value="Health Passport Proof">Health Passport Proof (Medical)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Archived Filename (including extension)
            </label>
            <input
              type="text"
              required
              placeholder="E.g., Passport_Scan.pdf"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-104"
            />
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
              Archive File
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
