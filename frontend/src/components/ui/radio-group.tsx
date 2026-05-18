import React from 'react';
import { cn } from '../../lib/utils';

interface RadioGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

interface RadioGroupItemProps {
  value: string;
  id?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

const RadioGroupContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
}>({ value: '', onValueChange: () => {} });

export const RadioGroup: React.FC<RadioGroupProps> = ({
  value,
  onValueChange,
  className,
  children,
}) => (
  <RadioGroupContext.Provider value={{ value, onValueChange }}>
    <div className={cn('flex gap-2', className)}>{children}</div>
  </RadioGroupContext.Provider>
);

export const RadioGroupItem: React.FC<RadioGroupItemProps> = ({
  value,
  id,
  label,
  className,
  disabled,
}) => {
  const context = React.useContext(RadioGroupContext);
  const isSelected = context.value === value;

  const colorMap: Record<string, string> = {
    present: isSelected
      ? 'bg-emerald-500 text-white border-emerald-500'
      : 'border-zinc-200 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:border-emerald-400 hover:text-emerald-600',
    absent: isSelected
      ? 'bg-red-500 text-white border-red-500'
      : 'border-zinc-200 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:border-red-400 hover:text-red-600',
    late: isSelected
      ? 'bg-amber-500 text-white border-amber-500'
      : 'border-zinc-200 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:border-amber-400 hover:text-amber-600',
    excused: isSelected
      ? 'bg-blue-500 text-white border-blue-500'
      : 'border-zinc-200 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:border-blue-400 hover:text-blue-600',
  };

  const colorClass = colorMap[value] || (isSelected
    ? 'bg-primary-500 text-white border-primary-500'
    : 'border-zinc-200 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:border-primary-400');

  return (
    <button
      type="button"
      id={id}
      role="radio"
      aria-checked={isSelected}
      disabled={disabled}
      onClick={() => !disabled && context.onValueChange(value)}
      className={cn(
        'flex items-center justify-center rounded-md border text-xs font-medium transition-all duration-150 px-1.5 py-1.5 w-full',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50',
        disabled && 'cursor-not-allowed opacity-50',
        colorClass,
        className
      )}
    >
      {label}
    </button>
  );
};
