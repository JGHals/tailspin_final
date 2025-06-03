import { Component, ErrorInfo, ReactNode } from 'react';
import { useConnection } from '@/hooks/useConnection';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class LeaderboardErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Leaderboard error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || <LeaderboardErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

function LeaderboardErrorFallback({ error }: { error?: Error }) {
  const { status } = useConnection();

  if (status === 'offline') {
    return (
      <div className="p-4 rounded-lg bg-red-50 text-red-900">
        <h3 className="text-sm font-medium">Connection Error</h3>
        <p className="mt-1 text-sm">
          You appear to be offline. Please check your connection and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-lg bg-red-50 text-red-900">
      <h3 className="text-sm font-medium">Error Loading Leaderboard</h3>
      <p className="mt-1 text-sm">
        {error?.message || 'An unexpected error occurred. Please try again later.'}
      </p>
    </div>
  );
} 