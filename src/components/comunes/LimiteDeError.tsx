import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class LimiteDeError extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("LimiteDeError atrapó:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="text-sm text-destructive">Algo salió mal en esta sección.</p>
            <button
              className="text-sm text-primary underline"
              onClick={() => this.setState({ hasError: false })}
            >
              Reintentar
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
