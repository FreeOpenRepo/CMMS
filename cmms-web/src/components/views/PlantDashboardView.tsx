'use client';

import React, { useState, useEffect } from 'react';
import { Asset, DashboardStats } from '@/lib/types';
import { fetchAssets, fetchDashboardStats } from '@/lib/api';
import { Activity, Cpu, CheckCircle2, AlertTriangle, QrCode, Download, RefreshCw, Sparkles, Building2 } from 'lucide-react';

export default function PlantDashboardView() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedQrAsset, setSelectedQrAsset] = useState<Asset | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [assetList, statData] = await Promise.all([
        fetchAssets(),
        fetchDashboardStats()
      ]);
      setAssets(assetList);
      setStats(statData);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 16px', minHeight: '100vh' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity style={{ color: 'var(--accent-emerald)', width: 28, height: 28 }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Plant Equipment & Uptime Dashboard</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            Machinery Asset Registry • QRCoder Badges • Coravel Scheduler Telemetry
          </p>
        </div>

        <button onClick={loadData} disabled={isLoading} className="btn-secondary" style={{ fontSize: '0.85rem' }}>
          <RefreshCw style={{ width: 14, height: 14, animation: isLoading ? 'spin 1s linear infinite' : 'none' }} /> Refresh Stats
        </button>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--accent-emerald)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Plant Asset Uptime</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-emerald)' }} className="font-mono">
              {stats.uptimePercentage}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {stats.operationalAssets} / {stats.totalAssets} Machines Operational
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--accent-cyan)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Active Work Orders</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-cyan)' }} className="font-mono">
              {stats.activeWos}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              {stats.resolvedWos} Total Resolved to date
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', borderLeft: stats.breachedSlas > 0 ? '4px solid var(--accent-rose)' : '4px solid var(--accent-emerald)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>4H SLA Breaches</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: stats.breachedSlas > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }} className="font-mono">
              {stats.breachedSlas}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Coravel Watchdog automated detection
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--accent-amber)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Total Maintenance Cost</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-amber)' }} className="font-mono">
              {stats.totalMaintenanceCost.toLocaleString()} ฿
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Aggregated Labor + Spare Parts
            </div>
          </div>
        </div>
      )}

      {/* Machinery Asset Catalog Grid */}
      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '16px' }}>
        Registered Factory Equipment ({assets.length})
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {assets.map(asset => {
          const isOperational = asset.status === 'Operational' || asset.status === 0;
          return (
            <div key={asset.id} className="glass-panel glass-panel-hover" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span className="font-mono" style={{ fontWeight: 800, color: 'var(--accent-cyan)', fontSize: '1.1rem' }}>
                  {asset.assetTag}
                </span>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: isOperational ? 'rgba(16,185,129,0.2)' : 'rgba(244,63,94,0.2)',
                  color: isOperational ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                }}>
                  {typeof asset.status === 'number' ? ['Operational', 'Degraded', 'Down', 'UnderMaintenance'][asset.status] : asset.status}
                </span>
              </div>

              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '6px' }}>{asset.name}</h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                📍 {asset.location}
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px' }}>
                <div>Maker: <strong>{asset.manufacturer}</strong></div>
                <div>Model: {asset.modelNumber} • S/N: {asset.serialNumber}</div>
              </div>

              {/* QR Code thumbnail & Action */}
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                {asset.qrCodeBase64 && (
                  <img src={asset.qrCodeBase64} alt="QR" style={{ width: 44, height: 44, borderRadius: '6px', background: '#fff', padding: '2px' }} />
                )}
                <button
                  onClick={() => setSelectedQrAsset(asset)}
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  <QrCode style={{ width: 14, height: 14 }} /> Printable QR Tag
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Printable QR Code Badge Modal */}
      {selectedQrAsset && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '16px' }}>
          <div className="glass-panel" style={{ maxWidth: '400px', width: '100%', padding: '24px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '4px' }}>Physical Asset QR Tag</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              QRCoder 2026 Engine • Ready for machinery plate mounting
            </p>

            <div style={{ background: '#ffffff', color: '#000', padding: '20px', borderRadius: '16px', display: 'inline-block', marginBottom: '16px' }}>
              {selectedQrAsset.qrCodeBase64 && (
                <img src={selectedQrAsset.qrCodeBase64} alt="Asset QR Code" style={{ width: '200px', height: '200px' }} />
              )}
              <div style={{ fontWeight: 800, fontSize: '1.1rem', marginTop: '8px' }}>{selectedQrAsset.assetTag}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{selectedQrAsset.name}</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{selectedQrAsset.location}</div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = selectedQrAsset.qrCodeBase64!;
                  link.download = `QR-${selectedQrAsset.assetTag}.png`;
                  link.click();
                }}
                className="btn-primary"
                style={{ flex: 1, fontSize: '0.85rem' }}
              >
                <Download style={{ width: 16, height: 16 }} /> Download PNG
              </button>
              <button onClick={() => setSelectedQrAsset(null)} className="btn-secondary" style={{ flex: 1, fontSize: '0.85rem' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
