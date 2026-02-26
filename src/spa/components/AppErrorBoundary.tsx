import type { ErrorInfo, ReactNode } from 'react';
import { Component } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error boundary caught an error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '1rem' }}>
          <div className="data-panel status-alert" style={{ maxWidth: '720px', width: '100%' }}>
            <h2 className="view-title" style={{ marginBottom: '0.5rem' }}>SYSTEM UI ERROR</h2>
            <p className="error-text">
              The dashboard failed to render. Refresh the page. If it persists, check browser console logs.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
