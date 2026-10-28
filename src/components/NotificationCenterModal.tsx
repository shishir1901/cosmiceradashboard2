/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { SatelliteNotification } from '../types/telemetry';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterTab = 'ALL' | 'WARNING' | 'CRITICAL' | 'AI' | 'SYSTEM';

export function NotificationCenterModal({ isOpen, onClose }: NotificationCenterModalProps) {
  const {
    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotification,
    clearAllNotifications,
  } = useTelemetry();

  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'WARNING') return n.severity === 'warning';
    if (activeFilter === 'CRITICAL') return n.severity === 'critical';
    if (activeFilter === 'AI') return n.type === 'AI';
    if (activeFilter === 'SYSTEM') return n.type === 'SYSTEM' || n.severity === 'normal';
    return true;
  });

  const warningCount = notifications.filter((n) => n.severity === 'warning').length;
  const criticalCount = notifications.filter((n) => n.severity === 'critical').length;
  const aiCount = notifications.filter((n) => n.type === 'AI').length;
  const systemCount = notifications.filter((n) => n.type === 'SYSTEM' || n.severity === 'normal').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-[#111A2B] border border-[#1E2A3F] rounded-2xl max-w-2xl w-full max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1E2A3F] flex items-center justify-between gap-3 bg-[#0A1020]/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0A1020] border border-[#1E2A3F] flex items-center justify-center text-[#22D3EE] shadow-sm">
              <span className="material-symbols-outlined text-[20px]">notifications_active</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-sans font-bold text-[16px] text-white tracking-wide uppercase">
                  MISSION NOTIFICATION CENTER
                </h2>
                {unreadNotificationCount > 0 && (
                  <span className="bg-[#22D3EE] text-[#0A1020] font-mono text-[10px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.4)]">
                    {unreadNotificationCount} UNREAD
                  </span>
                )}
              </div>
              <span className="font-mono text-[11px] text-[#8B9BB4]">
                COSMIC ERA SATELLITE INTELLIGENCE & TELEMETRY ALERTS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-[#8B9BB4] hover:text-white p-1.5 rounded-lg hover:bg-[#1E2A3F] transition-colors"
              title="Close Notification Center"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Toolbar: Filter Pills and Global Actions */}
        <div className="p-3 sm:px-5 border-b border-[#1E2A3F] flex items-center justify-between gap-2 flex-wrap bg-[#111A2B]">
          {/* Filters: All / Warning / Critical / AI / System */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'All', count: notifications.length },
              { id: 'WARNING', label: 'Warning', count: warningCount, color: 'text-[#FBBF24]' },
              { id: 'CRITICAL', label: 'Critical', count: criticalCount, color: 'text-[#F43F5E]' },
              { id: 'AI', label: 'AI Insight', count: aiCount, color: 'text-[#A78BFA]' },
              { id: 'SYSTEM', label: 'System', count: systemCount, color: 'text-[#34D399]' },
            ].map((tab) => {
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as FilterTab)}
                  className={`font-mono text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#22D3EE] text-[#0A1020] shadow-[0_0_8px_rgba(34,211,238,0.3)]'
                      : 'bg-[#0A1020] hover:bg-[#1E2A3F] text-[#8B9BB4] hover:text-white border border-[#1E2A3F]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                    isActive ? 'bg-[#0A1020]/20 text-[#0A1020]' : 'bg-[#111A2B] text-[#8B9BB4]'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Global Actions: Mark as Read & Clear All */}
          <div className="flex items-center gap-2 font-mono text-[10px] ml-auto">
            {unreadNotificationCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="text-[#22D3EE] hover:underline flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-[#1E2A3F]"
              >
                <span className="material-symbols-outlined text-[14px]">done_all</span>
                <span>MARK ALL AS READ</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="text-[#F43F5E] hover:underline flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-[#1E2A3F]"
              >
                <span className="material-symbols-outlined text-[14px]">delete_sweep</span>
                <span>CLEAR ALL</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-2.5 bg-[#0A1020]">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3 text-[#8B9BB4]">
              <div className="w-12 h-12 rounded-full bg-[#111A2B] border border-[#1E2A3F] flex items-center justify-center text-[#34D399]">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <div>
                <p className="font-mono text-sm text-white font-bold">ALL SATELLITE SYSTEMS NOMINAL</p>
                <p className="text-xs text-[#8B9BB4] mt-1 max-w-sm">
                  {activeFilter === 'ALL'
                    ? 'No notifications currently active. Live telemetry stream is being monitored for anomalies.'
                    : `No notifications matching the "${activeFilter}" filter.`}
                </p>
              </div>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              let badgeColor = 'bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30';
              let icon = 'check_circle';
              let borderColor = 'border-[#1E2A3F]';

              if (n.severity === 'critical') {
                badgeColor = 'bg-[#F43F5E]/20 text-[#F43F5E] border-[#F43F5E]/40';
                icon = 'error';
                borderColor = 'border-[#F43F5E]/40';
              } else if (n.severity === 'warning') {
                badgeColor = 'bg-[#FBBF24]/20 text-[#FBBF24] border-[#FBBF24]/40';
                icon = 'warning';
                borderColor = 'border-[#FBBF24]/30';
              } else if (n.type === 'AI') {
                badgeColor = 'bg-[#A78BFA]/20 text-[#A78BFA] border-[#A78BFA]/40';
                icon = 'psychology';
                borderColor = 'border-[#A78BFA]/30';
              }

              return (
                <div
                  key={n.id}
                  className={`bg-[#111A2B] border ${borderColor} rounded-xl p-3.5 transition-all flex flex-col gap-2 relative ${
                    !n.read ? 'ring-1 ring-[#22D3EE]/30 bg-[#111A2B]/90' : 'opacity-90'
                  }`}
                >
                  {/* Top line: Type, Severity badge, unread dot, timestamp & actions */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-[#22D3EE] shadow-[0_0_6px_#22D3EE]" title="Unread alert" />
                      )}
                      <span className="material-symbols-outlined text-[17px] text-[#22D3EE]">
                        {icon}
                      </span>
                      <span className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${badgeColor}`}>
                        {n.type} • {n.title}
                      </span>
                      <span className="font-mono text-[9px] text-[#8B9BB4] border-l border-[#1E2A3F] pl-2">
                        SEVERITY: <strong className="uppercase text-white">{n.severity}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[#8B9BB4]">{n.timeStr}</span>
                      {!n.read && (
                        <button
                          onClick={() => markNotificationAsRead(n.id)}
                          className="font-mono text-[9px] text-[#22D3EE] hover:underline px-1.5 py-0.5 rounded bg-[#0A1020] border border-[#1E2A3F]"
                          title="Mark as read"
                        >
                          MARK READ
                        </button>
                      )}
                      <button
                        onClick={() => clearNotification(n.id)}
                        className="text-[#8B9BB4] hover:text-[#F43F5E] p-1 rounded hover:bg-[#1E2A3F] transition-colors"
                        title="Clear notification"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Notification Message */}
                  <div className="font-sans text-[13px] text-white leading-relaxed font-medium pl-1">
                    {n.message}
                  </div>

                  {/* Metadata Tag Line: Responsible Sensor & Responsible Value */}
                  <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-[#1E2A3F]/50 text-[#8B9BB4] px-1">
                    <div className="flex items-center gap-2">
                      <span>RESPONSIBLE SENSOR:</span>
                      <span className="text-[#22D3EE] font-bold">{n.sensor}</span>
                    </div>
                    {n.value !== undefined && (
                      <div className="flex items-center gap-1.5">
                        <span>VALUE:</span>
                        <span className="text-white font-bold bg-[#0A1020] px-1.5 py-0.2 rounded border border-[#1E2A3F]">
                          {n.value}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 px-5 border-t border-[#1E2A3F] bg-[#111A2B] flex items-center justify-between text-xs font-mono text-[#8B9BB4]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#34D399]" />
            <span className="text-[10px]">INTELLIGENCE ENGINE: REAL-TIME SLIDING REGRESSION & Z-SCORE</span>
          </div>
          <button
            onClick={onClose}
            className="bg-[#22D3EE] hover:bg-[#06B6D4] text-[#0A1020] px-4 py-1.5 rounded-lg font-bold text-[11px] transition-all"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
}
