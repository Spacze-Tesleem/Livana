import type { PropertyRequest } from '@/types'

const STATUS_ORDER = ['submitted', 'reviewing', 'searching', 'matched', 'inspection', 'completed']

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  reviewing: 'Reviewing',
  searching: 'Searching',
  matched: 'Matched',
  inspection: 'Inspection',
  completed: 'Completed',
}

interface RequestStatusTimelineProps {
  request: PropertyRequest
}

export default function RequestStatusTimeline({ request }: RequestStatusTimelineProps) {
  const currentIndex = STATUS_ORDER.indexOf(request.status)

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">Status Timeline</p>
      <div className="mt-4 space-y-3">
        {STATUS_ORDER.map((status, index) => {
          const isActive = index <= currentIndex
          const isCurrent = status === request.status
          return (
            <div key={status} className="flex items-center gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-bold ${
                    isCurrent
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : isActive
                        ? 'border-blue-300 bg-blue-100 text-blue-600'
                        : 'border-gray-200 bg-gray-100 text-gray-400'
                  }`}
                >
                  {index + 1}
                </div>
                {index < STATUS_ORDER.length - 1 && (
                  <div className={`mt-2 h-6 w-px ${isActive ? 'bg-blue-300' : 'bg-gray-200'}`} />
                )}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${isCurrent ? 'text-blue-700' : isActive ? 'text-gray-700' : 'text-gray-400'}`}>
                  {STATUS_LABELS[status]}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
