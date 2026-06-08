import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  icon?: React.ReactNode
  dot?: string
}

// ------------------------------------------------------------------ //
// MultiSelect — selector con selección múltiple (checkboxes)
// ------------------------------------------------------------------ //

interface MultiSelectProps {
  value: string[]
  onChange: (value: string[]) => void
  options: SelectOption[]
  placeholder?: string
  triggerIcon?: React.ReactNode
  className?: string
}

export function MultiSelect({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar',
  triggerIcon,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onMouse)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouse)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v])
  }

  const selectedOpts = options.filter(o => value.includes(o.value))

  const triggerLabel =
    value.length === 0 ? placeholder
    : value.length === 1 ? (selectedOpts[0]?.label ?? value[0])
    : `${value.length} estados`

  const isPlaceholder = value.length === 0

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex h-9 select-none items-center gap-2 whitespace-nowrap rounded-[9px] border bg-white px-3',
          'text-[13px] font-medium text-brand-black',
          'dark:bg-brand-dark-blue dark:text-white',
          'transition-all duration-200',
          open
            ? 'border-brand-black/30 shadow-sm dark:border-white/25'
            : 'border-brand-alice-blue hover:border-brand-black/20 dark:border-white/10 dark:hover:border-white/20',
        )}
      >
        {triggerIcon && (
          <span className="shrink-0 text-brand-steel-blue dark:text-white/35">{triggerIcon}</span>
        )}
        {/* dots de los seleccionados */}
        {value.length === 1 && selectedOpts[0]?.dot && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: selectedOpts[0].dot }} />
        )}
        {value.length >= 2 && (
          <span className="flex items-center gap-0.5">
            {selectedOpts.slice(0, 3).map(o => o.dot
              ? <span key={o.value} className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: o.dot }} />
              : null
            )}
          </span>
        )}
        <span className={cn(isPlaceholder ? 'text-brand-steel-blue/50 dark:text-white/25' : 'text-brand-black dark:text-white')}>
          {triggerLabel}
        </span>
        <ChevronDown
          size={13}
          strokeWidth={2.5}
          className={cn('ml-0.5 shrink-0 text-brand-steel-blue/40 transition-transform duration-200 dark:text-white/25', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className={cn(
          'animate-fade-in absolute left-0 top-full z-50 mt-1.5 min-w-full overflow-hidden',
          'max-h-64 overflow-y-auto',
          'rounded-[10px] border border-brand-alice-blue bg-white py-1',
          'shadow-xl shadow-black/[0.07]',
          'dark:border-white/10 dark:bg-[#1a2535] dark:shadow-black/25',
        )}>
          {options.map((opt) => {
            const active = value.includes(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-[7px] text-left text-[13px]',
                  'transition-colors duration-100',
                  active
                    ? 'bg-brand-alice-blue/70 font-semibold text-brand-black dark:bg-white/[0.07] dark:text-white'
                    : 'font-medium text-brand-blue-gray hover:bg-brand-alice-blue/40 dark:text-white/50 dark:hover:bg-white/[0.04]',
                )}
              >
                {opt.dot && (
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: opt.dot }} />
                )}
                <span className="flex-1">{opt.label}</span>
                <span className={cn(
                  'ml-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-all duration-100',
                  active
                    ? 'border-brand-black bg-brand-black dark:border-white dark:bg-white'
                    : 'border-brand-alice-blue dark:border-white/20',
                )}>
                  {active && <Check size={10} strokeWidth={3} className="text-white dark:text-brand-black" />}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  triggerIcon?: React.ReactNode
  className?: string
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar',
  triggerIcon,
  className,
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    const onMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onMouse)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouse)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex h-9 select-none items-center gap-2 whitespace-nowrap rounded-[9px] border bg-white px-3',
          'text-[13px] font-medium text-brand-black',
          'dark:bg-brand-dark-blue dark:text-white',
          'transition-all duration-200',
          open
            ? 'border-brand-black/30 shadow-sm dark:border-white/25'
            : 'border-brand-alice-blue hover:border-brand-black/20 dark:border-white/10 dark:hover:border-white/20',
        )}
      >
        {triggerIcon && (
          <span className="shrink-0 text-brand-steel-blue dark:text-white/35">{triggerIcon}</span>
        )}
        {selected?.dot && (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: selected.dot }} />
        )}
        {selected?.icon && !selected?.dot && (
          <span className="shrink-0 text-brand-steel-blue dark:text-white/35">{selected.icon}</span>
        )}
        <span className={cn(
          !selected
            ? 'text-brand-steel-blue/50 dark:text-white/25'
            : 'text-brand-black dark:text-white',
        )}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={13}
          strokeWidth={2.5}
          className={cn(
            'ml-0.5 shrink-0 text-brand-steel-blue/40 transition-transform duration-200 dark:text-white/25',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={cn(
            'animate-fade-in absolute left-0 top-full z-50 mt-1.5 min-w-full overflow-hidden',
            'max-h-64 overflow-y-auto',
            'rounded-[10px] border border-brand-alice-blue bg-white py-1',
            'shadow-xl shadow-black/[0.07]',
            'dark:border-white/10 dark:bg-[#1a2535] dark:shadow-black/25',
          )}
        >
          {options.map((opt) => {
            const active = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-[7px] text-left text-[13px]',
                  'transition-colors duration-100',
                  active
                    ? 'bg-brand-alice-blue/70 font-semibold text-brand-black dark:bg-white/[0.07] dark:text-white'
                    : 'font-medium text-brand-blue-gray hover:bg-brand-alice-blue/40 dark:text-white/50 dark:hover:bg-white/[0.04]',
                )}
              >
                {opt.dot && (
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: opt.dot }} />
                )}
                {opt.icon && !opt.dot && (
                  <span className={cn(
                    'shrink-0',
                    active ? 'text-brand-black dark:text-white' : 'text-brand-steel-blue/60 dark:text-white/30',
                  )}>
                    {opt.icon}
                  </span>
                )}
                <span className="flex-1">{opt.label}</span>
                {active && (
                  <Check size={12} strokeWidth={2.5} className="ml-2 shrink-0 text-brand-black dark:text-white" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
