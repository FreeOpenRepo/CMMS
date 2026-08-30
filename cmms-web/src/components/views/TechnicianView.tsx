import { showSuccess, showError, showInfo, showWarning, showยืนยัน } from '@/lib/swal';
'use client';

import React, { useState, useEffect } from 'react';
import { WorkOrder, SparePart } from '@/lib/types';
import { fetchWorkOrders, fetchSpareParts, startRepair, completeRepair } from '@/lib/api';
import { compressAndConvertToBase64 } from '@/lib/imageCompression';
import { Wrench, Play, CheckCircle2, Camera, AlertCircle, Package, Plus, Minus, X, Sparkles, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function TechnicianView() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [activeModalWo, setActiveModalWo] = useState<WorkOrder | null>(null);
  const [laborHours, setLaborHours] = useState<number>(1.5);
  const [technicianNotes, setTechnicianNotes] = useState<string>('');
  const [afterPhotoPreview, setAfterPhotoPreview] = useState<string | null>(null);
  const [usedParts, setUsedParts] = useState<{ sparePartId: number; quantity: number }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [wos, parts] = await Promise.all([
      fetchWorkOrders(),
      fetchSpareParts()
    ]);
    setWorkOrders(wos);
    setSpareParts(parts);
  }

  async function handleStartRepair(woId: number) {
    try {
      await startRepair(woId);
      await loadData();
      confetti({ particleCount: 40, spread: 50 });
    } catch (err: any) {
      showError('ข้อผิดพลาด', Failed to start repair: ' + err.message);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressAndConvertToBase64(file);
      setAfterPhotoPreview(base64);
      setErrorMessage(null);
    } catch (err) {
      console.error('Photo compression failed:', err);
    }
  }

  function handleOpenCompleteModal(wo: WorkOrder) {
    setActiveModalWo(wo);
    setLaborHours(2.0);
    setTechnicianNotes('');
    setAfterPhotoPreview(null);
    setUsedParts([]);
    setErrorMessage(null);
  }

  async function handleCompleteSubmit() {
    if (!activeModalWo) return;
    
    // Invariant Check
    if (!afterPhotoPreview) {
      setErrorMessage('Invariant violation [AfterPhotoMandatoryForResolution]: You MUST take/upload an After-Repair Photo proof before completing this work order.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await completeRepair(activeModalWo.id, {
        afterPhotoUrl: afterPhotoPreview,
        technicianNotes,
        laborHours,
        usedParts: usedParts.filter(p => p.quantity > 0)
      });

      setActiveModalWo(null);
      await loadData();
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
    } catch (err: any) {
      setErrorMessage(err.message || 'Completion failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function updatePartQuantity(partId: number, delta: number) {
    setUsedParts(prev => {
      const exist = prev.find(p => p.sparePartId === partId);
      if (exist) {
        const newQty = exist.quantity + delta;
        if (newQty <= 0) return prev.filter(p => p.sparePartId !== partId);
        return prev.map(p => p.sparePartId === partId ? { ...p, quantity: newQty } : p);
      }
      if (delta > 0) {
        return [...prev, { sparePartId: partId, quantity: delta }];
      }
      return prev;
    });
  }

  const myTasks = workOrders.filter(w => w.status === 'ASSIGNED' || w.status === 'IN_PROGRESS' || w.status === 'RESOLVED');

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px 16px', minHeight: '100vh' }}>
      {/* Tech Mobile Header */}
      <div className="glass-panel" style={{ padding: '18px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wrench style={{ color: 'var(--accent-cyan)', width: 22, height: 22 }} />
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Technician Field Dashboard</h1>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Logged in as: <strong>Somchai Prasert (Lead Mech)</strong>
          </span>
        </div>

        <span style={{ background: 'rgba(6,182,212,0.15)', color: 'var(--accent-cyan)', padding: '6px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
          {myTasks.filter(t => t.status !== 'RESOLVED').length} Active Tasks
        </span>
      </div>

      {/* Task Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {myTasks.map(wo => {
          const isAssigned = wo.status === 'ASSIGNED';
          const isInProgress = wo.status === 'IN_PROGRESS';
          const isResolved = wo.status === 'RESOLVED';

          return (
            <div
              key={wo.id}
              className={`glass-panel ${isInProgress ? 'ticket-repairing' : ''}`}
              style={{
                padding: '20px',
                borderLeft: isInProgress ? '4px solid var(--accent-cyan)' : isResolved ? '4px solid var(--accent-emerald)' : '4px solid var(--accent-amber)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="font-mono" style={{ fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '1rem' }}>
                  {wo.workOrderNumber}
                </span>
                <span className={`badge-${wo.status.toLowerCase()}`} style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700 }}>
                  {wo.status}
                </span>
              </div>

              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px' }}>{wo.title}</h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                ⚙️ {wo.assetTag} • {wo.assetLocation}
              </div>

              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '16px' }}>
                {wo.description}
              </p>

              {/* Before Photo if exists */}
              {wo.beforePhotoUrl && (
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Reported Breakdown Photo:</span>
                  <img src={wo.beforePhotoUrl} alt="Before" style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '8px' }} />
                </div>
              )}

              {/* การดำเนินการ */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                {isAssigned && (
                  <button
                    onClick={() => handleStartRepair(wo.id)}
                    className="btn-primary"
                    style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
                  >
                    <Play style={{ width: 16, height: 16 }} /> เริ่มดำเนินการซ่อม (TECH_START)
                  </button>
                )}

                {isInProgress && (
                  <button
                    onClick={() => handleOpenCompleteModal(wo)}
                    className="btn-success"
                    style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
                  >
                    <CheckCircle2 style={{ width: 18, height: 18 }} /> Complete & Upload After-Photo
                  </button>
                )}

                {isResolved && (
                  <div style={{ width: '100%', padding: '10px', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 style={{ width: 16, height: 16 }} />
                    <span>Repair Completed • ยอดรวม Cost: <strong>{wo.totalCost.toLocaleString()} THB</strong></span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Complete Repair Modal with Mandatory After-Photo */}
      {activeModalWo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div className="glass-panel" style={{ maxWidth: '540px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Complete Repair ({activeModalWo.workOrderNumber})</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>Mandatory After-Repair Photo Invariant</span>
              </div>
              <button onClick={() => setActiveModalWo(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X style={{ width: 22, height: 22 }} />
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {errorMessage && (
                <div style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.4)', borderRadius: '10px', padding: '12px', marginBottom: '16px', color: '#fca5a5', fontSize: '0.85rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <AlertCircle style={{ width: 20, height: 20, flexShrink: 0 }} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Mandatory After-Photo Capture */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-amber)', display: 'block', marginBottom: '6px' }}>
                  📸 After-Repair Photo Proof (MANDATORY INVARIANT) *
                </label>
                
                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '20px',
                    borderRadius: '12px',
                    border: afterPhotoPreview ? '2px solid var(--accent-emerald)' : '2px dashed var(--accent-amber)',
                    background: 'rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  <Camera style={{ width: 26, height: 26, color: afterPhotoPreview ? 'var(--accent-emerald)' : 'var(--accent-amber)' }} />
                  <span style={{ fontWeight: 700 }}>{afterPhotoPreview ? 'Change After-Photo' : 'Capture / Upload After-Repair Photo'}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Auto-compressed via browser-image-compression</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} style={{ display: 'none' }} />
                </label>

                {afterPhotoPreview && (
                  <div style={{ marginTop: '10px', position: 'relative', width: '100%', height: '160px', borderRadius: '10px', overflow: 'hidden' }}>
                    <img src={afterPhotoPreview} alt="After Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <span style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(16,185,129,0.85)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                      ✅ Photo Proof Attached
                    </span>
                  </div>
                )}
              </div>

              {/* Labor Hours & Tech Notes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Labor Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={laborHours}
                    onChange={e => setLaborHours(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Technician Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Replaced worn seals, torqued bolts to 120Nm"
                    value={technicianNotes}
                    onChange={e => setTechnicianNotes(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              {/* Spare Parts Usage Picker */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block', marginBottom: '8px' }}>
                  Spare Parts Used (Stock.DeductParts):
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {spareParts.map(part => {
                    const inUse = usedParts.find(p => p.sparePartId === part.id)?.quantity || 0;
                    return (
                      <div
                        key={part.id}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: inUse > 0 ? 'rgba(6,182,212,0.15)' : 'rgba(255,255,255,0.03)',
                          border: inUse > 0 ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{part.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {part.partNumber} • {part.unitCost} ฿ (Stock: {part.currentStock})
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => updatePartQuantity(part.id, -1)}
                            style={{ width: 26, height: 26, borderRadius: '6px', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer' }}
                          >
                            -
                          </button>
                          <span style={{ fontWeight: 800, fontSize: '0.9rem', minWidth: '18px', textAlign: 'center' }}>{inUse}</span>
                          <button
                            type="button"
                            onClick={() => updatePartQuantity(part.id, 1)}
                            style={{ width: 26, height: 26, borderRadius: '6px', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', cursor: 'pointer' }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-glass)', display: 'flex', gap: '10px', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.3)' }}>
              <button onClick={() => setActiveModalWo(null)} className="btn-secondary">ยกเลิก</button>
              <button
                onClick={handleCompleteSubmit}
                disabled={isSubmitting}
                className="btn-success"
                style={{ padding: '12px 20px', fontSize: '0.95rem' }}
              >
                {isSubmitting ? 'Validating & Resolving...' : 'ปิดงานซ่อมบำรุง & Deduct Parts'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


