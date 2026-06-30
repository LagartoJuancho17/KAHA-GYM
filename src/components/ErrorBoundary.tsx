// src/components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Etiqueta opcional de la sección, para mostrar en el mensaje de error */
  section?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Captura errores de render en sus hijos para que un fallo en una sección
 * (ej: una pestaña) no deje toda la aplicación en blanco.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('>> [ErrorBoundary] Error capturado:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[300px] flex items-center justify-center p-6 font-sans">
          <div className="bg-white border border-red-200 rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-600" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Ocurrió un error{this.props.section ? ` en ${this.props.section}` : ''}
            </h2>
            <p className="text-slate-500 text-xs mt-2 leading-relaxed">
              Esta sección no se pudo mostrar, pero el resto del sistema sigue funcionando.
              Probá recargar la sección o cambiar de pestaña.
            </p>
            {this.state.error?.message && (
              <p className="text-[10px] text-red-500 font-mono bg-red-50 border border-red-100 rounded-lg p-2 mt-4 break-words text-left">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleReset}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
