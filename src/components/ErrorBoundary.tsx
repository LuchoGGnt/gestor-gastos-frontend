import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Sin esto, un error de render en CUALQUIER página desmonta toda la app
 * (pantalla en blanco) y deja al navegador "atrás/adelante" sin nada vivo
 * que reaccione — como si se hubiera perdido todo lo navegado antes.
 * Atrapando el error acá, el resto de la app (sidebar, rutas) sigue viva.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error de render atrapado por ErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="neo-raised p-6 max-w-md text-center">
            <p className="text-sm font-semibold mb-2">Algo salió mal en esta pantalla</p>
            <p className="text-xs text-[var(--text-secondary)] mb-4">{this.state.error.message}</p>
            <button
              className="neo-btn px-4 py-2 text-sm text-[var(--accent)] font-semibold"
              onClick={() => this.setState({ error: null })}
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
