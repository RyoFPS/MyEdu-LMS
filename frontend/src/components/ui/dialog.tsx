import React, { useEffect, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    },
    [onOpenChange]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-50 animate-slide-up">{children}</div>
    </div>
  );
};

export const DialogContent: React.FC<{
  className?: string;
  children: React.ReactNode;
  onClose?: () => void;
}> = ({ className, children, onClose }) => (
  <div
    className={cn(
      'bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-lg mx-3 sm:mx-4 max-h-[90vh] overflow-y-auto',
      className
    )}
  >
    {onClose && (
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    )}
    {children}
  </div>
);

export const DialogHeader: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => <div className={cn('flex flex-col space-y-1.5 p-6 pb-4', className)}>{children}</div>;

export const DialogTitle: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)}>{children}</h2>;

export const DialogDescription: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => <p className={cn('text-sm text-gray-500 dark:text-gray-400', className)}>{children}</p>;

export const DialogFooter: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <div className={cn('flex items-center justify-end gap-2 p-6 pt-4', className)}>{children}</div>
);
