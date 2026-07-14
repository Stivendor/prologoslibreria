import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="container section empty-state">
          <h1>Algo salió mal</h1>
          <p className="muted">
            Ocurrió un error inesperado. Intenta recargar la página.
          </p>
          <button
            className="btn btn--lg"
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
