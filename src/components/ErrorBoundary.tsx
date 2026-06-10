import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  name?: string;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ''}]`, error.message, info.componentStack?.slice(0, 500));
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ backgroundColor: '#FEF2F2' }}>
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              {this.props.name ? `${this.props.name} failed to load` : 'Something went wrong'}
            </h2>
            <p className="text-sm text-gray-500 mb-1 font-mono bg-gray-50 rounded-lg px-3 py-2 text-left break-all">
              {this.state.error.message}
            </p>
            <p className="text-xs text-gray-400 mb-5">
              This is usually caused by unexpected data. Refreshing or clicking "Try again" resolves it.
            </p>
            <div className="flex items-center gap-3 justify-center">
              <button
                onClick={() => this.setState({ error: null })}
                className="px-5 py-2 text-sm font-semibold rounded-lg text-white"
                style={{ backgroundColor: '#1C4B42' }}
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
