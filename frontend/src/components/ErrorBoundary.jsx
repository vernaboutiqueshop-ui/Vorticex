import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { API } from '../config';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    
    // Reportar al backend
    try {
      fetch(`${API}/api/error`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.toString(),
          stack: errorInfo.componentStack,
          user: localStorage.getItem('vortice_user'),
          url: window.location.href,
          timestamp: new Date().toISOString()
        })
      });
    } catch (e) {
      console.error('Failed to report error:', e);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          background: 'var(--bg-app, #050508)',
          color: '#fff',
          textAlign: 'center'
        }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '2px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem'
          }}>
            <AlertTriangle size={36} color="#ef4444" />
          </div>
          
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 800, 
            marginBottom: '0.5rem',
            color: '#fff'
          }}>
            Algo salió mal
          </h2>
          
          <p style={{ 
            color: '#94a3b8', 
            fontSize: '0.9rem',
            maxWidth: 320,
            lineHeight: 1.6,
            marginBottom: '2rem'
          }}>
            Hubo un error inesperado. Podés intentar recargar la página o volver al inicio.
          </p>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={this.handleRetry}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.875rem 1.5rem',
                background: 'rgba(6, 182, 212, 0.15)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: 12,
                color: '#06b6d4',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <RefreshCw size={18} />
              Reintentar
            </button>
            
            <button
              onClick={this.handleGoHome}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.875rem 1.5rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 12,
                color: '#94a3b8',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Home size={18} />
              Volver al inicio
            </button>
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre style={{
              marginTop: '2rem',
              padding: '1rem',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 8,
              fontSize: '0.75rem',
              color: '#64748b',
              maxWidth: '100%',
              overflow: 'auto',
              textAlign: 'left'
            }}>
              {this.state.error.toString()}
              {this.state.errorInfo.componentStack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
