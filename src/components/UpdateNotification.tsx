import { useEffect, useState, useCallback } from 'react';
import type { UpdateStatus } from '../types/api';

type VisibleStatus = Exclude<UpdateStatus['status'], 'checking' | 'not-available'>;

export default function UpdateNotification() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    const unsubscribe = window.api.onUpdateStatus((payload: unknown) => {
      setStatus(payload as UpdateStatus);
    });
    return unsubscribe;
  }, []);

  const handleRestart = useCallback(() => {
    window.api.quitAndInstall();
  }, []);

  const handleDismiss = useCallback(() => {
    setStatus(null);
  }, []);

  if (!status) return null;

  const { status: state } = status;

  if (state === 'checking' || state === 'not-available') {
    return null;
  }

  const visibleState = state as VisibleStatus;

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 16,
    right: 16,
    zIndex: 9999,
    minWidth: 320,
    maxWidth: 420,
    padding: '14px 18px',
    borderRadius: 10,
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    fontSize: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    animation: 'slideIn 0.3s ease-out',
  };

  const getBgColor = () => {
    switch (visibleState) {
      case 'available':
      case 'downloading':
        return '#0f3460';
      case 'downloaded':
        return '#155724';
      case 'error':
        return '#c53030';
      default:
        return '#1a1a2e';
    }
  };

  const getMessage = () => {
    switch (visibleState) {
      case 'available':
        return `Nueva versión ${status.version} disponible. Descargando...`;
      case 'downloading':
        return `Descargando actualización... ${status.progress ?? 0}%`;
      case 'downloaded':
        return `¡Listo! La versión ${status.version} se descargó. Reinicie para instalar.`;
      case 'error':
        return `Error al buscar actualizaciones: ${status.error ?? 'Desconocido'}`;
      default:
        return '';
    }
  };

  return (
    <div
      style={{
        ...containerStyle,
        backgroundColor: getBgColor(),
        color: '#fff',
      }}
    >
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {visibleState === 'downloading' && (
          <span
            style={{
              display: 'inline-block',
              width: 16,
              height: 16,
              border: '2px solid rgba(255,255,255,0.3)',
              borderRadius: '50%',
              borderTopColor: '#fff',
              animation: 'spin 0.6s linear infinite',
            }}
          />
        )}
        {visibleState === 'downloaded' && <span style={{ fontSize: 18 }}>✓</span>}
        {visibleState === 'error' && <span style={{ fontSize: 18 }}>⚠</span>}
        <span style={{ flex: 1, lineHeight: 1.4 }}>{getMessage()}</span>
        {visibleState !== 'downloading' && (
          <button
            onClick={handleDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              fontSize: 16,
              padding: '0 4px',
              lineHeight: 1,
            }}
            title="Cerrar"
          >
            ×
          </button>
        )}
      </div>

      {visibleState === 'downloading' && (
        <div
          style={{
            width: '100%',
            height: 4,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${status.progress ?? 0}%`,
              height: '100%',
              background: '#e94560',
              borderRadius: 2,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      )}

      {visibleState === 'downloaded' && (
        <button
          onClick={handleRestart}
          style={{
            alignSelf: 'flex-start',
            padding: '6px 14px',
            border: 'none',
            borderRadius: 6,
            background: '#e94560',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          Reiniciar ahora
        </button>
      )}
    </div>
  );
}
