'use client';

import { showSuccess, showError, showInfo, showWarning, showConfirm } from '@/lib/swal';

import React, { useState, useEffect } from 'react';
import { Asset, WorkOrder, WorkOrderPriority } from '@/lib/types';
import { fetchAssets, fetchWorkOrders, createWorkOrder } from '@/lib/api';
import { compressAndConvertToBase64 } from '@/lib/imageCompression';
import { QrCode, Camera, AlertOctagon, CheckCircle2, Clock, Wrench, Sparkles, UploadCloud, X } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function RequesterView() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<number | ''>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<WorkOrderPriority>('High');
  const [requesterName, setRequesterName] = useState('Line Operator (Shift A)');
  const [beforePhotoPreview, setBeforePhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [assetList, woList] = await Promise.all([
      fetchAssets(),
      fetchWorkOrders()
    ]);
    setAssets(assetList);
    if (assetList.length > 0 && selectedAssetId === '') {
      setSelectedAssetId(assetList[0].id);
    }
    setWorkOrders(woList);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressAndConvertToBase64(file);
      setBeforePhotoPreview(base64);
    } catch (err) {
      console.error('Photo compression failed:', err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAssetId || !title) return;
    setIsSubmitting(true);
    try {
      await createWorkOrder({
        assetId: Number(selectedAssetId),
        title,
        description,
        priority,
        requesterName,
        beforePhotoUrl: beforePhotoPreview || undefined
      });

      setTitle('');
      setDescription('');
      setBeforePhotoPreview(null);
      await loadData();
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    } catch (err: any) {
      showInfo('แจ้งเตือนระบบ', 'Error creating work order: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSimulateQrScan(asset: Asset) {
    setSelectedAssetId(asset.id);
    setIsScannerModalOpen(false);
  }

  const selectedAsset = assets.find(a => a.id === Number(selectedAssetId));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px', minHeight: '100vh' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertOctagon style={{ color: 'var(--accent-amber)', width: 26, height: 26 }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Maintenance Request & Breakdown Reporter</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            Report machine breakdowns • QR Code equipment tagging • Image compression & fast dispatch
          </p>
        </div>

        <button
          onClick={() => setIsScannerModalOpen(true)}
          className="btn-primary"
          style={{ padding: '10px 18px', fontSize: '0.9rem' }}
        >
          <QrCode style={{ width: 18, height: 18 }} /> Scan Equipment QR Code
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Incident Form */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wrench style={{ width: 20, height: 20, color: 'var(--accent-cyan)' }} />
            Create Work Order
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Target Asset Selector */}
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Equipment / Machine (Asset) *
              </label>
              <select
                value={selectedAssetId}
                onChange={e => setSelectedAssetId(Number(e.target.value))}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}
              >
                {assets.map(a => (
                  <option key={a.id} value={a.id} style={{ background: '#0f172a', color: '#fff' }}>
                    [{a.assetTag}] {a.name} ({a.location})
                  </option>
                ))}
              </select>

              {selectedAsset && (
                <div style={{ marginTop: '8px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  📍 Location: <strong style={{ color: '#fff' }}>{selectedAsset.location}</strong> • Model: {selectedAsset.modelNumber}
                </div>
              )}
            </div>

            {/* Issue Title */}
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Issue Title / อาการเบื้องต้น *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Unusual vibration on main shaft, oil leak"
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.9rem' }}
              />
            </div>

            {/* Priority & Requester */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Urgency / Priority
                </label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as any)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                >
                  <option value="Low" style={{ background: '#0f172a' }}>Low (Non-urgent)</option>
                  <option value="Medium" style={{ background: '#0f172a' }}>Medium (Normal)</option>
                  <option value="High" style={{ background: '#0f172a' }}>High (Degraded Line)</option>
                  <option value="Critical" style={{ background: '#0f172a' }}>Critical (Line Down 🚨)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Reported By
                </label>
                <input
                  type="text"
                  value={requesterName}
                  onChange={e => setRequesterName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* Detailed Description */}
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Detailed Symptoms & Observations
              </label>
              <textarea
                rows={3}
                placeholder="Describe sounds, error codes, temperature readings..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)', color: '#fff', fontSize: '0.85rem', resize: 'vertical' }}
              />
            </div>

            {/* Photo Attachment (Browser Image Compression) */}
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Breakdown Photo (Before Repair)
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '16px',
                  borderRadius: '10px',
                  border: '2px dashed var(--border-glass-bright)',
                  background: 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  color: 'var(--accent-cyan)'
                }}
              >
                <Camera style={{ width: 18, height: 18 }} />
                <span>Take Photo / Upload Image</span>
                <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </label>

              {beforePhotoPreview && (
                <div style={{ marginTop: '10px', position: 'relative', width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden' }}>
                  <img src={beforePhotoPreview} alt="Before Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => setBeforePhotoPreview(null)}
                    style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', color: '#fff', width: 24, height: 24, cursor: 'pointer' }}
                  >
                    <X style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem', marginTop: '8px' }}
            >
              {isSubmitting ? 'Dispatching Work Order...' : 'Submit Maintenance Request'}
            </button>
          </form>
        </div>

        {/* Live ใบสั่งงานซ่อมบำรุง (Work Orders) Tracker */}
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock style={{ width: 20, height: 20, color: 'var(--accent-cyan)' }} />
            Active Plant ใบสั่งงานซ่อมบำรุง (Work Orders) ({workOrders.length})
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {workOrders.slice(0, 5).map(wo => (
              <div key={wo.id} className="glass-panel" style={{ padding: '16px', borderLeft: wo.priority === 'Critical' ? '4px solid var(--accent-rose)' : '4px solid var(--accent-cyan)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span className="font-mono" style={{ fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '0.95rem' }}>
                    {wo.workOrderNumber}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span className={`badge-${wo.priority.toLowerCase()}`} style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700 }}>
                      {wo.priority}
                    </span>
                    <span className={`badge-${wo.status.toLowerCase()}`} style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700 }}>
                      {wo.status}
                    </span>
                  </div>
                </div>

                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>{wo.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  ⚙️ {wo.assetTag} • {wo.assetLocation}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-glass)', paddingTop: '8px' }}>
                  <span>Tech: <strong>{wo.assignedTechnicianName || 'Unassigned'}</strong></span>
                  <span>{new Date(wo.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* QR Code Scanner Simulation Modal */}
      {isScannerModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div className="glass-panel" style={{ maxWidth: '500px', width: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode style={{ color: 'var(--accent-cyan)', width: 22, height: 22 }} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Simulate On-Site QR Tag Scan</h3>
              </div>
              <button onClick={() => setIsScannerModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X style={{ width: 22, height: 22 }} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Select a machinery asset below to simulate scanning its physical QR Code tag on the factory floor:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' }}>
              {assets.map(asset => (
                <div
                  key={asset.id}
                  onClick={() => handleSimulateQrScan(asset)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border-glass)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-cyan)' }}>{asset.assetTag}</div>
                    <div style={{ fontSize: '0.8rem' }}>{asset.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{asset.location}</div>
                  </div>
                  <span style={{ fontSize: '0.8rem', background: 'rgba(6,182,212,0.15)', color: 'var(--accent-cyan)', padding: '4px 8px', borderRadius: '8px', fontWeight: 600 }}>
                    Scan Tag →
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



