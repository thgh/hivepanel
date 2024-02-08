'use client'

import * as LabelPrimitive from '@radix-ui/react-label'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { cn } from '@/lib/utils'

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants> & { hoverCard?: React.ReactNode }
>(({ className, hoverCard, ...props }, ref) =>
  hoverCard ? (
    <HoverCard openDelay={0} closeDelay={100}>
      <HoverCardTrigger asChild>
        <LabelPrimitive.Root
          ref={ref}
          className={cn(labelVariants(), className)}
          {...props}
        />
      </HoverCardTrigger>
      <HoverCardContent className="text-xs">{hoverCard}</HoverCardContent>
    </HoverCard>
  ) : (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(labelVariants(), className)}
      {...props}
    />
  )
)
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
