import { type LucideIcon, Inbox } from 'lucide-react'

interface Props {
  icon?: LucideIcon
  titulo: string
  descripcion?: string
  accion?: { label: string; onClick: () => void }
}

export function EmptyState({ icon: Icon = Inbox, titulo, descripcion, accion }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-[16px] bg-brand-alice-blue dark:bg-brand-dark-blue">
        <Icon className="h-8 w-8 text-brand-steel-blue" strokeWidth={1} />
      </div>
      <div>
        <p className="text-[22px] font-semibold text-brand-black dark:text-white">{titulo}</p>
        {descripcion && (
          <p className="mt-1 max-w-sm text-sm font-light text-brand-blue-gray">{descripcion}</p>
        )}
      </div>
      {accion && (
        <button
          onClick={accion.onClick}
          className="rounded-[10px] bg-brand-black px-4 py-2 text-sm font-semibold text-white transition-all duration-400 ease-out hover:bg-brand-blue-gray active:scale-[0.98] dark:bg-white dark:text-brand-black"
        >
          {accion.label}
        </button>
      )}
    </div>
  )
}
