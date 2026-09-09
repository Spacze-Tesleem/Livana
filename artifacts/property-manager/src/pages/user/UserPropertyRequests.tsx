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

export default function UserPropertyRequestsPage() {
  const [, navigate] = useLocation()
  const searchParams = useSearchParams()
  const [requests, setRequests] = useState<RequestWithRelations[]>([])
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const loadRequests = useCallback(async (currentTenantId: string | null) => {
    if (!currentTenantId) return

    const supabase = createClient()
    const { data, error } = await supabase
      .from('property_requests')
      .select(`*, property_request_matches(*, properties(*, landlords(full_name, whatsapp, is_verified), property_images(id, storage_path, alt_text, is_cover, sort_order)))`)
      .eq('tenant_id', currentTenantId)
      .order('updated_at', { ascending: false })

    if (!error) {
      const rows = (data ?? []) as RequestWithRelations[]
      setRequests(rows)
      setSelectedRequestId(prev => prev ?? rows[0]?.id ?? null)
    }
  }, [])

  useEffect(() => {
    const shouldOpen = searchParams.get('new') === 'true'
    setFormOpen(shouldOpen)
  }, [searchParams])

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

  const summaryCards = useMemo(() => {
    const activeCount = requests.filter(request => !['completed', 'closed'].includes(request.status)).length
    const matchedCount = requests.filter(request => request.status === 'matched').length
    const completedCount = requests.filter(request => request.status === 'completed' || request.status === 'closed').length

    return [
      { label: 'Active Requests', value: activeCount },
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

  function handleCreateSuccess(request: PropertyRequest) {
    const normalized: RequestWithRelations = { ...request, property_request_matches: [] }
    setRequests(prev => [normalized, ...prev])
    setSelectedRequestId(request.id)
    navigate('/user/requests')
  }

  return (
    <AuthGuard require="tenant">
      <UserLayout title="Property Requests">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 border-b border-gray-100 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between md:px-0 md:py-0 md:border-b-0">
            <div>
              <p className="text-sm text-gray-500">Tell us what you're looking for and we'll help you find matching properties.</p>
            </div>
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              New Property Request
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {summaryCards.map(card => (
              <div key={card.label} className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">{card.label}</p>
                <p className="mt-2 text-2xl font-extrabold text-gray-900">{card.value}</p>
              </div>
            ))}
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
            <div className="rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-sm">
              <h3 className="text-xl font-extrabold text-gray-900">No property requests yet</h3>
              <p className="mt-2 text-sm text-gray-500">Tell us what you're looking for and we’ll start searching for matching homes.</p>
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Create a property request
              </button>
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
                    <PropertyRequestDetail request={selectedRequest} />
                    <MatchedProperties matches={selectedRequest.property_request_matches ?? []} isAuthenticated />
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <PropertyRequestForm
          open={formOpen}
          onOpenChange={setFormOpen}
          initialValues={initialFormValues}
          onSuccess={handleCreateSuccess}
        />
      </UserLayout>
    </AuthGuard>
  )
}
