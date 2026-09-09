import { formatDistanceToNow } from 'date-fns'
import { ArrowUpRight, Bed, Bath, MapPin, Sparkles, CalendarRange } from 'lucide-react'
import type { PropertyRequest } from '@/types'
import RequestStatusTimeline from './RequestStatusTimeline'

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

interface PropertyRequestDetailProps {
  request: PropertyRequest
  matches?: Array<{ id: string; properties?: any }>
}

export default function PropertyRequestDetail({ request }: PropertyRequestDetailProps) {
  const updatedAgo = formatDistanceToNow(new Date(request.updated_at), { addSuffix: true })

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">Request Overview</p>
            <h3 className="mt-1 text-xl font-extrabold text-gray-900">{request.property_type}</h3>
          </div>

          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${STATUS_STYLES[request.status] ?? STATUS_STYLES.submitted}`}>
            {STATUS_LABELS[request.status] ?? request.status}
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Purpose</p>
            <p className="mt-1 text-sm font-semibold text-gray-800">{request.purpose}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Location</p>
            <p className="mt-1 text-sm font-semibold text-gray-800">{request.preferred_area}, {request.state}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Budget</p>
            <p className="mt-1 text-sm font-semibold text-gray-800">{formatCurrency(request.min_budget)} – {formatCurrency(request.max_budget)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Bedrooms</p>
            <p className="mt-1 text-sm font-semibold text-gray-800">{request.bedrooms ?? 'Any'}{request.bedrooms ? '+' : ''}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Bathrooms</p>
            <p className="mt-1 text-sm font-semibold text-gray-800">{request.bathrooms ?? 'Any'}{request.bathrooms ? '+' : ''}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Furnishing</p>
            <p className="mt-1 text-sm font-semibold text-gray-800">{request.furnishing ?? 'Any'}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Move-in timeline</p>
            <p className="mt-1 text-sm font-semibold text-gray-800">{request.move_in_timeline ?? 'Flexible'}</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Updated</p>
            <p className="mt-1 text-sm font-semibold text-gray-800">{updatedAgo}</p>
          </div>
        </div>

        {request.features && request.features.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Must-have features</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {request.features.map(feature => (
                <span key={feature} className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                  {feature}
                </span>
              ))}
            </div>
          </div>
        )}

        {request.notes && (
          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Additional note</p>
            <p className="mt-2 text-sm leading-6 text-gray-700">{request.notes}</p>
          </div>
        )}
      </div>

      <RequestStatusTimeline request={request} />
    </div>
  )
}
