import { DictionaryState } from '@/lib/dictionary/types';
import { LoadingSpinner } from '../ui/loading-spinner';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertCircle } from 'lucide-react';
import { Progress } from '../ui/progress';

export interface DictionaryLoadingStateProps {
  state: DictionaryState;
  isLoading: boolean;
  error: string | null;
  loadingState: {
    stage: string;
    progress: number;
    error: string | null;
  };
}

export function DictionaryLoadingState({
  state,
  isLoading,
  error,
  loadingState
}: DictionaryLoadingStateProps) {
  if (error || loadingState.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || loadingState.error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-4 space-y-4">
      <LoadingSpinner />
      <div className="text-center space-y-2">
        <p className="text-lg font-medium">{loadingState.stage}</p>
        <div className="w-64">
          <Progress value={loadingState.progress} />
        </div>
        <p className="text-sm text-muted-foreground">
          {state.wordCount > 0 ? `${state.wordCount.toLocaleString()} words loaded` : 'Loading dictionary...'}
        </p>
      </div>
    </div>
  );
} 