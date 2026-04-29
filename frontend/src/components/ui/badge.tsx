import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'destructive' | 'warning' | 'info' | 'outline';
}

const badgeVariants = {
  default: 'bg-primary-100 text-primary-700 border-primary-200',
  secondary: 'bg-gray-100 text-gray-700 border-gray-200',
  success: 'bg-green-100 text-green-700 border-green-200',
  destructive: 'bg-red-100 text-red-700 border-red-200',
  warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
  outline: 'bg-transparent text-gray-700 border-gray-300',
};

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'default', ...props }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
};
