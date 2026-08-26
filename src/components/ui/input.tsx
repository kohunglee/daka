import * as React from 'react'
import { cn } from '@/lib/utils'

export type InputProps = React.ComponentProps<'input'>

export function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      className={cn(
        'w-full h-[42px] px-3 text-sm text-foreground bg-background rounded-[7px] border border-input',
        'placeholder:text-fg-3',
        className,
      )}
      {...props}
    />
  )
}
