import { Loader2 } from 'lucide-react';

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}

export function LoadingOverlay({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <Spinner className="w-8 h-8 text-primary-500" />
      <p className="text-sm text-ink-500">{label}</p>
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-ink-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center">
          <Spinner className="w-7 h-7 text-white" />
        </div>
        <p className="text-sm text-ink-500 font-medium">Loading College Admin...</p>
      </div>
    </div>
  );
}
