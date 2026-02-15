import { cn } from '@/lib/utils'

interface TeamLogoProps {
  logoUrl?: string | null
  shortName: string
  color: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
}

export function TeamLogo({
  logoUrl,
  shortName,
  color,
  size = 'md',
  className,
}: TeamLogoProps) {
  const sizeClass = sizeMap[size]

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={shortName}
        className={cn(
          sizeClass,
          'rounded-lg object-cover shrink-0',
          className
        )}
      />
    )
  }

  return (
    <div
      className={cn(
        sizeClass,
        'rounded-lg flex items-center justify-center font-bold shrink-0',
        className
      )}
      style={{ backgroundColor: `${color}20`, color }}
    >
      {shortName}
    </div>
  )
}
