'use client';

import { useConnection } from '@/lib/contexts/connection-context';
import { cn } from '@/lib/utils';
import { FiWifi, FiWifiOff } from 'react-icons/fi';

interface ConnectionStatusProps {
  className?: string;
  showIcon?: boolean;
  showText?: boolean;
}

export function ConnectionStatus({ 
  className, 
  showIcon = true, 
  showText = true 
}: ConnectionStatusProps) {
  const { isOnline } = useConnection();

  return (
    <div className={cn(
      'flex items-center gap-2',
      isOnline ? 'text-green-500' : 'text-red-500',
      className
    )}>
      {showIcon && (
        isOnline ? <FiWifi className="h-4 w-4" /> : <FiWifiOff className="h-4 w-4" />
      )}
      {showText && (
        <span className="text-sm">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  );
} 