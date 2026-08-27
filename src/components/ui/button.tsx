import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

export const buttonVariants = cva(
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-[6px] font-semibold whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        outline: 'border border-border-strong bg-transparent text-foreground hover:bg-bg-alt',
        ghost: 'bg-transparent text-fg-2 hover:bg-bg-alt hover:text-foreground',
        soft: 'bg-soft text-primary hover:opacity-90',
      },
      size: {
        sm: 'h-[38px] px-[14px] text-sm',
        default: 'h-11 px-[18px] text-[15px]',
        lg: 'h-13 px-6 text-base',
        icon: 'h-[38px] w-[38px]',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
}
