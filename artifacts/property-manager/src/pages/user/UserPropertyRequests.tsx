import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from '@/lib/navigation'
import AuthGuard from '@/components/auth/AuthGuard'
import PropertyRequestCard from '@/components/requests/PropertyRequestCard'
import PropertyRequestDetail from '@/components/requests/PropertyRequestDetail'
import PropertyRequestForm from '@/components/requests/PropertyRequestForm'
import MatchedProperties from '@/components/requests/MatchedProperties'
import { createClient } from '@/lib/supabase'
import { UserLayout } from './UserDashboard'
import type { PropertyRequest, PropertyRequestMatchWithProperty } from '@/types'

interface RequestWithRelations extends PropertyRequest {
  property_request_matches?: PropertyRequestMatchWithProperty[]
}

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  reviewing: 'Reviewing',
  searching: 'Searching',
  matched: 'Matched',
  inspection: 'Inspection',
  completed: 'Completed',
  closed: 'Closed',
}

function getFormValuesFromRequest(request: PropertyRequest) {
  return {
    purpose: request.purpose,
    property_type: request.property_type,
    state: request.state,
    preferred_area: request.preferred_area,
    alternative_areas: request.alternative_areas?.join(', ') ?? '',
    min_budget: String(request.min_budget),
    max_budget: String(request.max_budget),
    bedrooms: request.bedrooms ? String(request.bedrooms) : '',
    bathrooms: request.bathrooms ? String(request.bathrooms) : '',
    furnishing: request.furnishing ?? 'Any',
    move_in_timeline: request.move_in_timeline ?? 'Flexible',
    features: request.features ?? [],
    notes: request.notes ?? '',
  }
}

export default function UserPropertyRequestsPage() {
  const [, navigate] = useLocation()
  const searchParams = useSearchParams()
  const [requests, setRequests] = useState<RequestWithRelations[]>([])
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const loadRequests = useCallback(async (currentTenantId: string | null) => {
    if (!currentTenantId) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('property_requests')
      .select(`*, property_request_matches(*, properties(*, landlords(full_name, whatsapp, is_verified), property_images(id, storage_path, alt_text, is_cover, sort_order)))`)
      .eq('tenant_id', currentTenantId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('[property requests] load failed:', error)
      return
    }

    const rows = (data ?? []) as RequestWithRelations[]
    setRequests(rows)
    setSelectedRequestId(prev => prev ?? rows[0]?.id ?? null)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setLoading(false)
        return
      }

      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('user_id', user.id)
        .single() as { data: { id: string } | null }

      if (!tenant) {
        setLoading(false)
        return
      }

      setTenantId(tenant.id)
      await loadRequests(tenant.id)
      setLoading(false)
    })
  }, [loadRequests])

  useEffect(() => {
    if (!tenantId) return

    const supabase = createClient()
    const channel = supabase.channel(`tenant-property-requests-${tenantId}`)

    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'property_requests',
        filter: `tenant_id=eq.${tenantId}`,
      }, () => {
        loadRequests(tenantId)
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'property_request_matches',
      }, () => {
        loadRequests(tenantId)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId, loadRequests])

  const selectedRequest = requests.find(request => request.id === selectedRequestId) ?? requests[0] ?? null
  const editingRequest = requests.find(request => request.id === editingRequestId) ?? null

  const summaryCards = useMemo(() => {
    const activeCount = requests.filter(request => !['completed', 'closed'].includes(request.status)).length
    const matchedCount = requests.filter(request => request.status === 'matched').length
    const completedCount = requests.filter(request => request.status === 'completed' || request.status === 'closed').length

    return [
      { label: 'Active', value: activeCount },
      { label: 'Matched', value: matchedCount },
      { label: 'Completed', value: completedCount },
    ]
  }, [requests])

  const initialFormValues = useMemo(() => {
    const purposeParam = searchParams.get('purpose')
    const stateParam = searchParams.get('state') || searchParams.get('city') || ''
    const areaParam = searchParams.get('preferred_area') || searchParams.get('area') || ''
    const bedroomsParam = searchParams.get('bedrooms') || ''
    const bathroomsParam = searchParams.get('bathrooms') || ''

    return {
      purpose: purposeParam && ['Rent', 'Lease', 'Buy'].includes(purposeParam) ? purposeParam : 'Rent',
      property_type: searchParams.get('property_type') || 'Apartment',
      state: stateParam,
      preferred_area: areaParam,
      alternative_areas: searchParams.get('alternative_areas') || '',
      min_budget: searchParams.get('min_budget') || '',
      max_budget: searchParams.get('max_budget') || '',
      bedrooms: bedroomsParam,
      bathrooms: bathroomsParam,
      furnishing: searchParams.get('furnishing') || 'Any',
      move_in_timeline: searchParams.get('move_in_timeline') || 'Flexible',
      features: searchParams.get('features') ? searchParams.get('features')!.split(',') : [],
      notes: searchParams.get('notes') || '',
    }
  }, [searchParams])

  function handleFormSuccess(request: PropertyRequest) {
    const normalized: RequestWithRelations = { ...request, property_request_matches: [] }

    setRequests(prev => {
      const hasRequest = prev.some(item => item.id === request.id)
      if (hasRequest) {
        return prev.map(item => item.id === request.id ? { ...item, ...request } : item)
      }
      return [normalized, ...prev]
    })

    setSelectedRequestId(request.id)
    setEditingRequestId(null)
    setSuccessMessage('Your property request has been submitted. Our team will begin reviewing it.')
    navigate('/user/requests')
  }

  function handleEditRequest(request: PropertyRequest) {
    setEditingRequestId(request.id)
    setSelectedRequestId(request.id)
    setSuccessMessage(null)
  }

  return (
    <AuthGuard require="tenant">
      <UserLayout title="Property Requests">
        <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 md:px-6 lg:px-8">
          <header className="pt-1">
            <h1 className="text-2xl font-black tracking-tight text-gray-900">Property Requests</h1>
            <p className="mt-1 text-sm text-gray-500">Tell us what you're looking for and we'll help you find matching properties.</p>
          </header>

          <PropertyRequestForm
            initialValues={editingRequest ? getFormValuesFromRequest(editingRequest) : initialFormValues}
            editingRequest={editingRequest}
            onSuccess={handleFormSuccess}
            onCancelEdit={() => setEditingRequestId(null)}
          />

          {successMessage && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm">
              {successMessage}
            </div>
          )}

          {requests.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {summaryCards.map(card => (
                <div key={card.label} className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">{card.label}</p>
                  <p className="mt-2 text-2xl font-extrabold text-gray-900">{card.value}</p>
                </div>
              ))}
            </div>
          )}

          <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm md:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-gray-900">My Requests</h2>
              {requests.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingRequestId(null)
                    setSuccessMessage(null)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="text-sm font-semibold text-blue-600 transition hover:text-blue-700"
                >
                  Create another request
                </button>
              )}
            </div>

            {loading ? (
              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-32 animate-pulse rounded-2xl border border-gray-100 bg-white" />
                  ))}
                </div>
                <div className="h-72 animate-pulse rounded-2xl border border-gray-100 bg-white" />
              </div>
            ) : requests.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                No requests yet — submit the form above to get started.
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-3">
                  {requests.map(request => (
                    <PropertyRequestCard
                      key={request.id}
                      request={request}
                      selected={selectedRequest?.id === request.id}
                      onSelect={value => setSelectedRequestId(value.id)}
                    />
                  ))}
                </div>

                <div className="space-y-4">
                  {selectedRequest && (
                    <>
                      <PropertyRequestDetail
                        request={selectedRequest}
                        onEdit={handleEditRequest}
                      />
                      <MatchedProperties matches={selectedRequest.property_request_matches ?? []} isAuthenticated />
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </UserLayout>
    </AuthGuard>
  )
}
