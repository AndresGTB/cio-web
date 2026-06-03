import { ShoppingCart } from 'lucide-react'
import { EmptyState } from '@/components/shared/EmptyState'

export default function Compras() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-[28px] font-semibold text-brand-black dark:text-white">
          Compras
        </h2>
        <p className="mt-1 text-[14px] font-light text-brand-blue-gray dark:text-white/50">
          Sugerencias de compra inteligentes basadas en demanda y lead time
        </p>
      </div>
      <EmptyState
        icon={ShoppingCart}
        titulo="Disponible en Sprint 2"
        descripcion="El motor de compras sugeridas se desarrollará en el Sprint 2."
      />
    </div>
  )
}
