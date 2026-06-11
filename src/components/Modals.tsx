/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AlertCircle, CheckCircle2, HelpCircle, Info, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClass = "max-w-md",
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      <div className={`relative w-full ${maxWidthClass} overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 transition-all dark:bg-slate-900 dark:ring-slate-800`}>
        {/* Header */}
        <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {title}
              </h3>
              {subtitle && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[75vh] overflow-y-auto px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "success" | "info";
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "info",
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const colorMap = {
    danger: {
      bg: "bg-red-50 dark:bg-red-950/20",
      icon: "text-red-600 dark:text-red-400",
      btn: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
    },
    warning: {
      bg: "bg-amber-50 dark:bg-amber-950/20",
      icon: "text-amber-600 dark:text-amber-400",
      btn: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500",
    },
    success: {
      bg: "bg-emerald-50 dark:bg-emerald-950/20",
      icon: "text-emerald-600 dark:text-emerald-400",
      btn: "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500",
    },
    info: {
      bg: "bg-sky-50 dark:bg-sky-950/20",
      icon: "text-sky-600 dark:text-sky-400",
      btn: "bg-sky-600 hover:bg-sky-700 focus:ring-sky-500",
    },
  };

  const scheme = colorMap[type];

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onCancel} 
      />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="p-6 text-center">
          <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${scheme.bg} ${scheme.icon} mb-4`}>
            {type === "danger" && <AlertCircle className="h-8 w-8" />}
            {type === "warning" && <HelpCircle className="h-8 w-8" />}
            {type === "success" && <CheckCircle2 className="h-8 w-8" />}
            {type === "info" && <Info className="h-8 w-8" />}
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {message}
          </p>
        </div>
        <div className="flex border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50 justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-1/2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`w-1/2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition ${scheme.btn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export interface ToastItem {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContainerProps {
  toasts: ToastItem[];
  removeToast: (id: string) => void;
}

export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed top-5 right-5 z-100 flex flex-col gap-2.5 max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map(toast => {
          const typeClasses = {
            success: "border-l-4 border-emerald-500 bg-white dark:bg-slate-900 dark:border-emerald-600 text-slate-800 dark:text-slate-100",
            error: "border-l-4 border-red-500 bg-white dark:bg-slate-900 dark:border-red-600 text-slate-800 dark:text-slate-100",
            info: "border-l-4 border-sky-400 bg-white dark:bg-slate-900 dark:border-sky-500 text-slate-800 dark:text-slate-100",
          };

          const typeIcons = {
            success: <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400 shrink-0" />,
            error: <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 shrink-0" />,
            info: <Info className="h-5 w-5 text-sky-400 dark:text-sky-300 shrink-0" />,
          };

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className={`flex items-start gap-3 rounded-xl p-4 shadow-xl ring-1 ring-slate-150 relative pointer-events-auto cursor-pointer ${typeClasses[toast.type]}`}
              onClick={() => removeToast(toast.id)}
            >
              {typeIcons[toast.type]}
              <div className="text-sm font-medium pr-4">{toast.message}</div>
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition absolute top-3 right-3">
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
