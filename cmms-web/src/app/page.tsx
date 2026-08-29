'use client';

import React, { useState, useEffect } from 'react';
import { ActorRole } from '@/lib/types';
import RequesterView from '@/components/views/RequesterView';
import MaintenanceLeadView from '@/components/views/MaintenanceLeadView';
import TechnicianView from '@/components/views/TechnicianView';
import PlantDashboardView from '@/components/views/PlantDashboardView';
import { Wrench, AlertOctagon, ShieldAlert, Activity, Wifi, WifiOff, Sparkles, Cpu } from 'lucide-react';

export default function Home() {
  const [activeRole, setActiveRole] = useState<ActorRole>('MaintenanceLead');
  const [isApiOnline, setIsApiOnline] = useState<boolean>(false);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  async function checkHealth() {
    try {
      const res = await fetch('http://localhost:5020/api/health');
      setIsApiOnline(res.ok);
    } catch {
      setIsApiOnline(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header
        style={{
          background: 'rgba(7, 10, 18, 0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-glass)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          padding: '12px 24px'
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)'
            }}>
              <Wrench style={{ color: '#000', width: 22, height: 22 }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                PLANT <span style={{ color: 'var(--accent-amber)' }}>CMMS</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>
                07_CMMS_ENGINE
              </div>
            </div>
          </div>

          {/* Actor Role Switcher */}
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-glass)',
            padding: '4px',
            borderRadius: '14px',
            gap: '4px'
          }}>
            {[
              { role: 'Requester' as const, label: 'Requester', icon: AlertOctagon, color: 'var(--accent-cyan)' },
              { role: 'MaintenanceLead' as const, label: 'Lead Dispatch', icon: ShieldAlert, color: 'var(--accent-amber)' },
              { role: 'Technician' as const, label: 'Tech Mobile', icon: Wrench, color: 'var(--accent-emerald)' },
              { role: 'CoravelScheduler' as const, label: 'Plant KPIs', icon: Activity, color: 'var(--accent-orange)' },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeRole === tab.role;
              return (
                <button
                  key={tab.role}
                  onClick={() => setActiveRole(tab.role)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isActive ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.3)' : 'none'
                  }}
                >
                  <Icon style={{ width: 16, height: 16, color: isActive ? tab.color : 'inherit' }} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Status Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '20px',
            background: isApiOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${isApiOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            fontSize: '0.75rem',
            fontWeight: 700,
            color: isApiOnline ? '#34d399' : '#fca5a5'
          }}>
            {isApiOnline ? <Wifi style={{ width: 12, height: 12 }} /> : <WifiOff style={{ width: 12, height: 12 }} />}
            <span>{isApiOnline ? 'CMMS API Active' : 'Connecting API :5020...'}</span>
          </div>
        </div>
      </header>

      {/* Main View Content */}
      <div style={{ flex: 1, padding: '16px' }}>
        {activeRole === 'Requester' && <RequesterView />}
        {activeRole === 'MaintenanceLead' && <MaintenanceLeadView />}
        {activeRole === 'Technician' && <TechnicianView />}
        {activeRole === 'CoravelScheduler' && <PlantDashboardView />}
      </div>
    </main>
  );
}
