'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, disabled, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    return (
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          className={cn(
            'flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 pr-10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          ref={ref}
          disabled={disabled}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={visible ? 'Ocultar senha' : 'Revelar senha'}
          disabled={disabled}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
