import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-rose-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full border border-rose-100">
            <h2 className="text-2xl font-serif text-rose-900 mb-4">Oups ! Une erreur est survenue</h2>
            <p className="text-stone-600 mb-6">
              Nous sommes désolés, quelque chose s'est mal passé.
            </p>
            <div className="bg-stone-50 p-4 rounded-lg text-sm text-stone-500 overflow-auto max-h-48 mb-6">
              {this.state.error?.message}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
