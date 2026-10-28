/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SatelliteNotification } from '../types/telemetry';

interface NotificationToastProps {
  toasts: SatelliteNotification[];
  onDismiss: (id: string) => void;
  onOpenCenter: () => void;
}

export function NotificationToastContainer({ toasts, onDismiss, onOpenCenter }: NotificationToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let borderColor = 'border-[#22D3EE]/40';
        let bgBadge = 'bg-[#22D3EE]/15 text-[#22D3EE] border-[#22D3EE]/30';
        let icon = 'info';

        if (toast.severity === 'critical') {
          borderColor = 'border-[#F43F5E]/60 shadow-[0_0_15px_rgba(244,63,94,0.3)]';
          bgBadge = 'bg-[#F43F5E]/20 text-[#F43F5E] border-[#F43F5E]/40';
          icon = 'error';
        } else if (toast.severity === 'warning') {
          borderColor = 'border-[#FBBF24]/50 shadow-[0_0_15px_rgba(251,191,36,0.25)]';
          bgBadge = 'bg-[#FBBF24]/20 text-[#FBBF24] border-[#FBBF24]/40';
          icon = 'warning';
        } else if (toast.type === 'AI') {
          borderColor = 'border-[#A78BFA]/50 shadow-[0_0_15px_rgba(167,139,250,0.25)]';
          bgBadge = 'bg-[#A78BFA]/20 text-[#A78BFA] border-[#A78BFA]/40';
          icon = 'psychology';
        } else if (toast.severity === 'normal') {
          borderColor = 'border-[#34D399]/40';
          bgBadge = 'bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30';
          icon = 'check_circle';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto bg-[#111A2B]/95 backdrop-blur-md border ${borderColor} rounded-xl p-3 shadow-xl transition-all animate-in slide-in-from-right duration-200 flex flex-col gap-1.5`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className={`material-symbols-outlined text-[16px] ${
                  toast.severity === 'critical' ? 'text-[#F43F5E]' : toast.severity === 'warning' ? 'text-[#FBBF24]' : 'text-[#22D3EE]'
                }`}>
                  {icon}
                </span>
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${bgBadge}`}>
                  {toast.type} • {toast.title}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-mono text-[9px] text-[#8B9BB4]">{toast.timeStr}</span>
                <button
                  onClick={() => onDismiss(toast.id)}
                  className="text-[#8B9BB4] hover:text-white p-0.5 rounded transition-colors"
                  title="Dismiss notification"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
            </div>

            <p className="font-sans text-[12px] text-white leading-snug font-medium">
              {toast.message}
            </p>

            <div className="flex items-center justify-between text-[10px] font-mono pt-0.5">
              <span className="text-[#8B9BB4] truncate">
                SRC: <strong className="text-white">{toast.sensor}</strong>
              </span>
              <button
                onClick={onOpenCenter}
                className="text-[#22D3EE] hover:underline font-semibold text-[10px] shrink-0 ml-2"
              >
                VIEW NOTIFICATION CENTER &rarr;
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
