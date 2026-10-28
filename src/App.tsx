/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TelemetryProvider, useTelemetry } from './context/TelemetryContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { BottomNav } from './components/BottomNav';
import { DashboardScreen } from './screens/DashboardScreen';
import { TelemetryScreen } from './screens/TelemetryScreen';
import { AttitudeScreen } from './screens/AttitudeScreen';
import { ChartsScreen } from './screens/ChartsScreen';
import { OrbitScreen } from './screens/OrbitScreen';
import { ConsoleScreen } from './screens/ConsoleScreen';
import { EmergencyModal } from './components/EmergencyModal';
import { OperatorModal } from './components/OperatorModal';
import { ProtocolModal } from './components/ProtocolModal';
import { SplashScreen } from './components/SplashScreen';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { NotificationToastContainer } from './components/NotificationToast';

function AppContent() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [emergencyModalOpen, setEmergencyModalOpen] = useState<boolean>(false);
  const [operatorModalOpen, setOperatorModalOpen] = useState<boolean>(false);
  const [protocolModalOpen, setProtocolModalOpen] = useState<boolean>(false);
  const [notificationsModalOpen, setNotificationsModalOpen] = useState<boolean>(false);
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return !sessionStorage.getItem('orbitra_splash_seen');
    } catch {
      return false;
    }
  });

  const { toasts, dismissToast } = useTelemetry();

  return (
    <div className="bg-[#0A1020] text-white min-h-screen flex flex-col font-sans selection:bg-[#22D3EE] selection:text-[#0A1020]">
      {/* Top Header Bar & Tabs */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenEmergencyModal={() => setEmergencyModalOpen(true)}
        onOpenOperatorModal={() => setOperatorModalOpen(true)}
        onOpenProtocolModal={() => setProtocolModalOpen(true)}
        onOpenNotificationsModal={() => setNotificationsModalOpen(true)}
      />

      {/* Main Mission Viewport */}
      <main className="flex-1 w-full pt-[96px] pb-10 overflow-y-auto">
        {currentTab === 'dashboard' && (
          <DashboardScreen onOpenNotifications={() => setNotificationsModalOpen(true)} />
        )}
        {currentTab === 'telemetry' && <TelemetryScreen />}
        {currentTab === 'attitude' && <AttitudeScreen />}
        {currentTab === 'charts' && <ChartsScreen />}
        {currentTab === 'orbit' && <OrbitScreen />}
        {currentTab === 'console' && <ConsoleScreen />}
      </main>

      {/* Desktop Fixed Footer Bar with Runtime Info & Health Stats */}
      <Footer />

      {/* Mobile Persistent Bottom Nav Bar */}
      <BottomNav currentTab={currentTab} onTabChange={setCurrentTab} />

      {/* Real-time Floating Notification Toasts */}
      <NotificationToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
        onOpenCenter={() => setNotificationsModalOpen(true)}
      />

      {/* Modals & Overlays */}
      <NotificationCenterModal
        isOpen={notificationsModalOpen}
        onClose={() => setNotificationsModalOpen(false)}
      />
      <EmergencyModal
        isOpen={emergencyModalOpen}
        onClose={() => setEmergencyModalOpen(false)}
      />
      <OperatorModal
        isOpen={operatorModalOpen}
        onClose={() => setOperatorModalOpen(false)}
        onReplaySplash={() => setShowSplash(true)}
      />
      <ProtocolModal
        isOpen={protocolModalOpen}
        onClose={() => setProtocolModalOpen(false)}
      />

      {/* Intro Splash Screen (z-index 9999) */}
      {showSplash && <SplashScreen onEnter={() => setShowSplash(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <TelemetryProvider>
      <AppContent />
    </TelemetryProvider>
  );
}
