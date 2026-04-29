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

  return (
    <label
      htmlFor={id}
      className={cn(
        'flex items-center gap-2 cursor-pointer',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <button
        type="button"
        id={id}
        role="radio"
        aria-checked={isSelected}
        disabled={disabled}
        onClick={() => !disabled && context.onValueChange(value)}
        className={cn(
          'h-4 w-4 rounded-full border-2 transition-all duration-200 flex items-center justify-center',
          isSelected
            ? 'border-primary-500 bg-primary-500'
            : 'border-gray-300 hover:border-gray-400'
        )}
      >
        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
      </button>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  );
};
