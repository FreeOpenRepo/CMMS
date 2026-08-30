'use client';

import { showSuccess, showError, showInfo, showWarning, showConfirm } from '@/lib/swal';

import React, { useState, useEffect } from 'react';
import { WorkOrder, Technician, SparePart } from '@/lib/types';
import { fetchWorkOrders, fetchTechnicians, fetchSpareParts, assignTechnician, restockSparePart } from '@/lib/api';
import { ShieldAlert, UserCheck, Clock, AlertTriangle, CheckCircle2, Package, RefreshCw, X, Plus } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function MaintenanceLeadView() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [selectedWoForAssign, setSelectedWoForAssign] = useState<WorkOrder | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<number | ''>('');
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'BOARD' | 'PARTS'>('BOARD');

  useEffect(() => {
    loadData();
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function loadData() {
    const [wos, techs, parts] = await Promise.all([
      fetchWorkOrders(),
      fetchTechnicians(),
      fetchSpareParts()
    ]);
    setWorkOrders(wos);
    setTechnicians(techs);
    if (techs.length > 0) setSelectedTechId(techs[0].id);
    setSpareParts(parts);
  }

  async function handleAssignSubmit() {
    if (!selectedWoForAssign || !selectedTechId) return;
    setIsSubmitting(true);
    try {
      await assignTechnician(selectedWoForAssign.id, Number(selectedTechId));
      setSelectedWoForAssign(null);
      await loadData();
      confetti({ particleCount: 50, spread: 60 });
    } catch (err: any) {
      showInfo('แจ้งเตือนระบบ', 'Assignment failed: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRestockPart(partId: number, qty: number) {
    try {
      await restockSparePart(partId, qty);
      await loadData();
    } catch (err: any) {
      showInfo('แจ้งเตือนระบบ', 'Restock failed: ' + err.message);
    }
  }

  function getSlaสถานะ(wo: WorkOrder): { text: string; color: string; bg: string; isBreached: boolean } {
    if (wo.status === 'RESOLVED' || wo.status === 'CLOSED') {
      return { text: 'Resolved', color: '#10b981', bg: 'rgba(16,185,129,0.15)', isBreached: false };
    }
    if (!wo.slaDueAt) {
      return { text: 'Unassigned', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', isBreached: false };
    }

    const diffMs = new Date(wo.slaDueAt).getTime() - currentTime;
    if (diffMs <= 0 || wo.slaBreached) {
      return { text: '🚨 SLA BREACHED!', color: '#f43f5e', bg: 'rgba(244,63,94,0.2)', isBreached: true };
    }

    const totalSecs = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;

    const formatted = `${hours}h ${minutes}m ${seconds}s left`;
    if (hours < 2) {
      return { text: `⚠️ ${formatted}`, color: '#f59e0b', bg: 'rgba(245,158,11,0.2)', isBreached: false };
    }

    return { text: `⏱️ ${formatted}`, color: '#10b981', bg: 'rgba(16,185,129,0.15)', isBreached: false };
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 16px', minHeight: '100vh' }}>
      {/* Lead Header */}
      <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert style={{ color: 'var(--accent-amber)', width: 28, height: 28 }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Maintenance Lead & Dispatch Control</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            Work order dispatching • 4-Hour Coravel SLA countdown • Spare parts inventory & maintenance costs
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('BOARD')}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: activeTab === 'BOARD' ? '1px solid var(--accent-amber)' : '1px solid var(--border-glass)',
              background: activeTab === 'BOARD' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255,255,255,0.04)',
              color: activeTab === 'BOARD' ? 'var(--accent-amber)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            Dispatch Board ({workOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('PARTS')}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: activeTab === 'PARTS' ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
              background: activeTab === 'PARTS' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255,255,255,0.04)',
              color: activeTab === 'PARTS' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            Spare Parts Inventory ({spareParts.length})
          </button>
        </div>
      </div>

      {activeTab === 'BOARD' ? (
        /* ใบสั่งงานซ่อมบำรุง (Work Orders) Grid */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {workOrders.map(wo => {
            const sla = getSlaสถานะ(wo);
            const isOpen = wo.status === 'OPEN';
            const isAssigned = wo.status === 'ASSIGNED';
            const isInProgress = wo.status === 'IN_PROGRESS';
            const isResolved = wo.status === 'RESOLVED';

            return (
              <div
                key={wo.id}
                className={`glass-panel ${isInProgress ? 'ticket-repairing' : ''}`}
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  borderLeft: sla.isBreached ? '4px solid var(--accent-rose)' : wo.priority === 'Critical' ? '4px solid var(--accent-rose)' : '4px solid var(--accent-amber)'
                }}
              >
                {/* Top Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className="font-mono" style={{ fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '1rem' }}>
                    {wo.workOrderNumber}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span className={`badge-${wo.priority.toLowerCase()}`} style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {wo.priority}
                    </span>
                    <span className={`badge-${wo.status.toLowerCase()}`} style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {wo.status}
                    </span>
                  </div>
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>{wo.title}</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  ⚙️ {wo.assetTag} - {wo.assetName}
                  <br />
                  📍 {wo.assetLocation}
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '14px', flex: 1 }}>
                  {wo.description}
                </p>

                {/* 4H SLA Countdown Banner */}
                {wo.slaDueAt && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: sla.bg,
                    color: sla.color,
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '12px',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    <span>4H SLA Watchdog: {sla.text}</span>
                  </div>
                )}

                {/* Assigned Tech / Cost breakdown */}
                <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '10px', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Assigned Technician:</span>
                    <strong style={{ color: wo.assignedTechnicianName ? '#fff' : 'var(--accent-amber)' }}>
                      {wo.assignedTechnicianName || 'Pending Lead Dispatch'}
                    </strong>
                  </div>

                  {isResolved && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                      <span>ยอดรวม Maintenance Cost:</span>
                      <span className="font-mono">{wo.totalCost.toLocaleString()} THB</span>
                    </div>
                  )}
                </div>

                {/* Dispatch Button */}
                {isOpen && (
                  <button
                    onClick={() => {
                      setSelectedWoForAssign(wo);
                    }}
                    className="btn-primary"
                    style={{ width: '100%', marginTop: '12px', fontSize: '0.85rem' }}
                  >
                    <UserCheck style={{ width: 16, height: 16 }} /> Dispatch Technician (Start 4h SLA)
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Spare Parts Management */
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Maintenance Spare Parts Inventory</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Parts are automatically deducted upon work order completion (Stock.DeductParts).
              </p>
            </div>
            <button onClick={loadData} className="btn-secondary" style={{ fontSize: '0.85rem' }}>
              <RefreshCw style={{ width: 14, height: 14 }} /> Refresh Stock
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass-bright)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px' }}>Part No</th>
                  <th style={{ padding: '12px 16px' }}>Part Name</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Stock on Hand</th>
                  <th style={{ padding: '12px 16px' }}>Unit Cost</th>
                  <th style={{ padding: '12px 16px' }}>สถานะ</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Quick Restock</th>
                </tr>
              </thead>
              <tbody>
                {spareParts.map(part => {
                  const isLow = part.currentStock <= part.minimumThreshold;
                  return (
                    <tr key={part.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--accent-cyan)' }} className="font-mono">{part.partNumber}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{part.name}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{part.category}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: '1rem', color: isLow ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                        {part.currentStock} {part.unit}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }} className="font-mono">{part.unitCost.toLocaleString()} ฿</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: isLow ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: isLow ? 'var(--accent-rose)' : 'var(--accent-emerald)'
                        }}>
                          {isLow ? '⚠️ REORDER NEEDED' : '✅ AVAILABLE'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button onClick={() => handleRestockPart(part.id, 10)} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>+10</button>
                          <button onClick={() => handleRestockPart(part.id, 25)} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>+25</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Technician Modal */}
      {selectedWoForAssign && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div className="glass-panel" style={{ maxWidth: '480px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck style={{ color: 'var(--accent-amber)', width: 22, height: 22 }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Dispatch Technician</h3>
              </div>
              <button onClick={() => setSelectedWoForAssign(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X style={{ width: 22, height: 22 }} />
              </button>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', marginBottom: '16px', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{selectedWoForAssign.workOrderNumber}</div>
              <div>{selectedWoForAssign.title}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Asset: {selectedWoForAssign.assetTag}</div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                Select Available Technician:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {technicians.map(tech => (
                  <div
                    key={tech.id}
                    onClick={() => setSelectedTechId(tech.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: selectedTechId === tech.id ? '1px solid var(--accent-amber)' : '1px solid var(--border-glass)',
                      background: selectedTechId === tech.id ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{tech.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tech.specialty} • {tech.phone}</div>
                    </div>
                    <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)' }}>
                      {tech.hourlyRate} ฿/hr
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setSelectedWoForAssign(null)} className="btn-secondary">ยกเลิก</button>
              <button onClick={handleAssignSubmit} disabled={isSubmitting || !selectedTechId} className="btn-primary">
                {isSubmitting ? 'Dispatching...' : 'Assign & Start 4H SLA Watchdog'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



