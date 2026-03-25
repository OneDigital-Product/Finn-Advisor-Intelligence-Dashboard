import { Component, type ErrorInfo, type ReactNode } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  level?: "root" | "route";
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryInner extends Component<
  ErrorBoundaryProps & { onReset?: () => void },
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps & { onReset?: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
  }

  handleRetry = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isRoot = this.props.level === "root";

      return (
        <div
          className="flex flex-col items-center justify-center gap-4 p-8 text-center min-h-[200px]"
          data-testid="error-boundary-fallback"
        >
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <div className="space-y-1">
            <h3 className="text-lg font-semibold" data-testid="text-error-title">
              {isRoot ? "Something went wrong" : "This section encountered an error"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md" data-testid="text-error-message">
              {isRoot
                ? "An unexpected error occurred. Please try again or reload the page."
                : "An error occurred while loading this page. Other parts of the app are unaffected."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={this.handleRetry}
              data-testid="button-error-retry"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            {isRoot && (
              <Button
                variant="default"
                onClick={() => window.location.reload()}
                data-testid="button-error-reload"
              >
                Reload Page
              </Button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorBoundary({ children, fallback, level = "route" }: ErrorBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundaryInner fallback={fallback} level={level} onReset={reset}>
          {children}
        </ErrorBoundaryInner>
      )}
    </QueryErrorResetBoundary>
  );
}
