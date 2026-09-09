import { formatDistanceToNow } from 'date-fns'
import { ArrowUpRight, MapPin, Sparkles } from 'lucide-react'
import type { PropertyRequest } from '@/types'

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  reviewing: 'Reviewing',
  searching: 'Searching',
  matched: 'Matched',
  inspection: 'Inspection',
  completed: 'Completed',
  closed: 'Closed',
}

const STATUS_STYLES: Record<string, string> = {
  submitted: 'bg-slate-100 text-slate-700 border border-slate-200',
  reviewing: 'bg-amber-50 text-amber-700 border border-amber-200',
  searching: 'bg-blue-50 text-blue-700 border border-blue-200',
  matched: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  inspection: 'bg-violet-50 text-violet-700 border border-violet-200',
  completed: 'bg-green-50 text-green-700 border border-green-200',
  closed: 'bg-gray-100 text-gray-700 border border-gray-200',
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value)
}

interface PropertyRequestCardProps {
  request: PropertyRequest
  selected?: boolean
  onSelect: (request: PropertyRequest) => void
}

export default function PropertyRequestCard({ request, selected = false, onSelect }: PropertyRequestCardProps) {
  const updatedAgo = formatDistanceToNow(new Date(request.updated_at), { addSuffix: true })

  return (
    <button
      type="button"
      onClick={() => onSelect(request)}
      className={`w-full text-left rounded-2xl border bg-white p-4 shadow-sm transition-all duration-200 hover:border-blue-200 hover:shadow-md ${
        selected ? 'border-blue-300 bg-blue-50/40 shadow-sm' : 'border-gray-100'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">{request.purpose}</p>
          <h3 className="mt-1 text-base font-bold text-gray-900 truncate">{request.property_type}</h3>
        </div>

        <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ${STATUS_STYLES[request.status] ?? STATUS_STYLES.submitted}`}>
          {STATUS_LABELS[request.status] ?? request.status}
        </span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 text-xs text-gray-600">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-3.5 w-3.5 text-gray-400" />
          <div className="min-w-0">
            <p className="font-semibold text-gray-400 uppercase tracking-[0.12em]">Location</p>
            <p className="mt-0.5 truncate text-gray-700">{request.preferred_area}, {request.state}</p>
          </div>
        </div>

        <div>
          <p className="font-semibold text-gray-400 uppercase tracking-[0.12em]">Budget</p>
          <p className="mt-0.5 text-gray-700">
            {formatCurrency(request.min_budget)} – {formatCurrency(request.max_budget)}
          </p>
        </div>

        <div>
          <p className="font-semibold text-gray-400 uppercase tracking-[0.12em]">Bedrooms</p>
          <p className="mt-0.5 text-gray-700">{request.bedrooms ?? 'Any'}{request.bedrooms ? '+' : ''}</p>
        </div>

        <div>
          <p className="font-semibold text-gray-400 uppercase tracking-[0.12em]">Updated</p>
          <p className="mt-0.5 text-gray-700">{updatedAgo}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <Sparkles className="h-3.5 w-3.5 text-blue-500" />
          <span>Created {new Date(request.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>

        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
          View Details
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  )
}
