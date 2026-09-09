import { useEffect, useMemo, useState } from 'react'
import {
  Bath,
  BedDouble,
  Building2,
  CalendarRange,
  CarFront,
  Check,
  ChevronRight,
  Home,
  KeyRound,
  MapPin,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { MoneyInput } from '@/components/ui/money-input'
import { createClient } from '@/lib/supabase'
import type { PropertyRequest } from '@/types'

const PURPOSE_OPTIONS = [
  {
    value: 'Rent',
    title: 'Rent',
    description: 'Find your next home',
    icon: KeyRound,
  },
  {
    value: 'Lease',
    title: 'Lease',
    description: 'Long-term flexibility',
    icon: CalendarRange,
  },
  {
    value: 'Buy',
    title: 'Buy',
    description: 'Own your next property',
    icon: Home,
  },
]

const PROPERTY_TYPE_OPTIONS = [
  'Self-contained',
  'Mini Flat',
  'Apartment',
  '1 Bedroom Flat',
  '2 Bedroom Flat',
  '3 Bedroom Flat',
  'Bungalow',
  'Duplex',
  'Terrace',
  'Detached House',
  'Semi-detached House',
  'Commercial',
  'Land',
  'Other',
]

const FURNISHING_OPTIONS = ['Any', 'Furnished', 'Semi-furnished', 'Unfurnished']
const MOVE_IN_OPTIONS = ['Immediately', 'Within 2 weeks', 'Within 1 month', 'Within 3 months', 'Flexible']
const FEATURE_OPTIONS = [
  { label: 'Parking', icon: CarFront },
  { label: 'Security', icon: ShieldCheck },
  { label: 'Stable Electricity', icon: Sparkles },
  { label: 'Water', icon: Sparkles },
  { label: 'Gated Estate', icon: Building2 },
  { label: 'Serviced Apartment', icon: Home },
  { label: 'BQ', icon: Home },
  { label: 'Balcony', icon: Home },
]

type PropertyRequestFormValues = {
  purpose: string
  property_type: string
  state: string
  preferred_area: string
  alternative_areas: string
  min_budget: string
  max_budget: string
  bedrooms: string
  bathrooms: string
  furnishing: string
  move_in_timeline: string
  features: string[]
  notes: string
}

const defaultValues: PropertyRequestFormValues = {
  purpose: 'Rent',
  property_type: 'Apartment',
  state: '',
  preferred_area: '',
  alternative_areas: '',
  min_budget: '',
  max_budget: '',
  bedrooms: '',
  bathrooms: '',
  furnishing: 'Any',
  move_in_timeline: 'Flexible',
  features: [],
  notes: '',
}

interface PropertyRequestFormProps {
  initialValues?: Partial<PropertyRequestFormValues>
  editingRequest?: PropertyRequest | null
  onSuccess?: (request: PropertyRequest) => void
  onCancelEdit?: () => void
}

function formatCurrency(value: string) {
  if (!value || Number(value) <= 0) return '—'
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(value))
}

function formatCompact(value: string, suffix: string) {
  if (!value) return '—'
  return `${value} ${suffix}`
}

export default function PropertyRequestForm({ initialValues, editingRequest, onSuccess, onCancelEdit }: PropertyRequestFormProps) {
  const [values, setValues] = useState<PropertyRequestFormValues>({ ...defaultValues, ...initialValues })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setValues({ ...defaultValues, ...initialValues })
    setErrors({})
  }, [initialValues, editingRequest])

  const stateOptions = useMemo(() => ['Lagos', 'Ogun', 'Abuja', 'Rivers', 'Enugu', 'Kaduna', 'Kano'], [])

  const showCustomPropertyType = values.property_type === 'Other' || (!!values.property_type && !PROPERTY_TYPE_OPTIONS.includes(values.property_type))

  const alternativeAreas = useMemo(() => {
    return values.alternative_areas
      .split(',')
      .map(area => area.trim())
      .filter(Boolean)
  }, [values.alternative_areas])

  const summary = useMemo(() => {
    const location = [values.preferred_area, values.state].filter(Boolean).join(', ')
    const budgetRange = [values.min_budget, values.max_budget].some(Boolean)
      ? `${formatCurrency(values.min_budget)} — ${formatCurrency(values.max_budget)}`
      : 'Budget not selected yet'

    return {
      purpose: values.purpose || 'What are you looking for?',
      propertyType: values.property_type || 'Property type not selected yet',
      location: location || 'Location not selected yet',
      budgetRange,
      bedrooms: values.bedrooms ? formatCompact(values.bedrooms, 'Bedrooms') : 'Bedrooms not selected yet',
      bathrooms: values.bathrooms ? formatCompact(values.bathrooms, 'Bathrooms') : 'Bathrooms not selected yet',
      moveIn: values.move_in_timeline || 'Move-in timeline not selected yet',
      features: values.features.length ? values.features.join(' · ') : 'Must-haves not selected yet',
      alternativeAreas: alternativeAreas.length ? alternativeAreas.join(' · ') : 'Also consider not selected yet',
    }
  }, [alternativeAreas, values])

  const completion = useMemo(() => {
    const checklist = [
      values.purpose,
      values.property_type,
      values.state,
      values.preferred_area,
      values.min_budget,
      values.max_budget,
      values.bedrooms,
      values.bathrooms,
      values.furnishing,
      values.move_in_timeline,
    ]

    const completeCount = checklist.filter(value => Boolean(value) && value !== 'Any' && value !== 'Flexible').length
    return Math.min(100, Math.round((completeCount / checklist.length) * 100))
  }, [values])

  function updateField<K extends keyof PropertyRequestFormValues>(field: K, value: PropertyRequestFormValues[K]) {
    setValues(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
  }

  function toggleFeature(feature: string) {
    setValues(prev => {
      const features = prev.features.includes(feature)
        ? prev.features.filter(item => item !== feature)
        : [...prev.features, feature]
      return { ...prev, features }
    })
  }

  function validate() {
    const nextErrors: Record<string, string> = {}

    if (!values.purpose) nextErrors.purpose = 'Purpose is required.'

    if (!values.property_type || values.property_type === 'Other') {
      nextErrors.property_type = 'Property type is required.'
    }

    if (!values.state) nextErrors.state = 'Preferred state is required.'
    if (!values.preferred_area) nextErrors.preferred_area = 'Preferred area is required.'
    if (!values.min_budget || Number(values.min_budget) <= 0) nextErrors.min_budget = 'Minimum budget is required.'
    if (!values.max_budget || Number(values.max_budget) <= 0) nextErrors.max_budget = 'Maximum budget is required.'

    if (Number(values.min_budget) > Number(values.max_budget)) {
      nextErrors.max_budget = 'Maximum budget cannot be lower than minimum budget.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Please sign in to continue.')

      let { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle() as { data: { id: string } | null }

      if (!tenant) {
        const meta = user.user_metadata ?? {}
        const tenantPayload = {
          user_id: user.id,
          full_name: meta.full_name ?? meta.name ?? user.email?.split('@')[0] ?? 'User',
          email: user.email ?? null,
          avatar_url: meta.avatar_url ?? meta.picture ?? null,
          provider: user.app_metadata?.provider ?? 'email',
        }

        const { data: createdTenant, error: insertError } = await supabase
          .from('tenants')
          .insert(tenantPayload)
          .select('id')
          .single() as { data: { id: string } | null; error?: { code?: string; message?: string } | null }

        if (insertError && (insertError.code === 'PGRST204' || insertError.message?.includes('provider'))) {
          const { data: createdTenantWithoutProvider, error: fallbackInsertError } = await supabase
            .from('tenants')
            .insert({
              user_id: user.id,
              full_name: tenantPayload.full_name,
              email: tenantPayload.email,
              avatar_url: tenantPayload.avatar_url,
            })
            .select('id')
            .single() as { data: { id: string } | null; error?: { code?: string; message?: string } | null }

          if (fallbackInsertError) throw fallbackInsertError
          tenant = createdTenantWithoutProvider
        } else if (insertError) {
          throw insertError
        } else {
          tenant = createdTenant
        }
      }

      if (!tenant) throw new Error('Tenant profile not found.')

      const payload = {
        tenant_id: tenant.id,
        purpose: values.purpose,
        property_type: values.property_type,
        state: values.state,
        preferred_area: values.preferred_area,
        alternative_areas: values.alternative_areas
          ? values.alternative_areas.split(',').map(item => item.trim()).filter(Boolean)
          : null,
        min_budget: Number(values.min_budget),
        max_budget: Number(values.max_budget),
        bedrooms: values.bedrooms ? Number(values.bedrooms) : null,
        bathrooms: values.bathrooms ? Number(values.bathrooms) : null,
        furnishing: values.furnishing || null,
        move_in_timeline: values.move_in_timeline || null,
        features: values.features.length ? values.features : null,
        notes: values.notes.trim() || null,
      }

      let result: PropertyRequest | null = null

      if (editingRequest) {
        const { data, error } = await supabase
          .from('property_requests')
          .update({
            ...payload,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingRequest.id)
          .select()
          .single()

        if (error) throw error
        result = data as PropertyRequest
      } else {
        const { data, error } = await supabase
          .from('property_requests')
          .insert({
            ...payload,
            status: 'submitted',
          })
          .select()
          .single()

        if (error) throw error
        result = data as PropertyRequest
      }

      onSuccess?.(result)
      setValues({ ...defaultValues, ...initialValues })
      setErrors({})
    } catch (error) {
      console.error('[property request create]', error)
      setErrors({ form: error instanceof Error ? error.message : 'Unable to save request.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#F8FAFF_0%,#F7F9FC_100%)] p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] md:p-6 lg:p-7">
      <div className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Livarex Property Concierge</p>
          <h1 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-900 md:text-[2rem]">Find what feels right.</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 md:text-base">
            Tell us what you&apos;re looking for and Livarex will help you find properties that match your lifestyle.
          </p>
        </div>

        {editingRequest && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Cancel edit
          </button>
        )}
      </div>

      <form id="property-request-form" onSubmit={handleSubmit} className="space-y-6">
        {errors.form && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{errors.form}</div>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,0.9fr)]">
          <div className="space-y-6">
            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 md:p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">What are you looking for?</h2>
                <p className="mt-1 text-sm text-slate-500">Choose how you want to move.</p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {PURPOSE_OPTIONS.map(({ value, title, description, icon: Icon }) => {
                  const selected = values.purpose === value

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateField('purpose', value)}
                      className={`group rounded-2xl border p-4 text-left transition-all duration-200 ${
                        selected
                          ? 'border-blue-600 bg-blue-600 text-white shadow-[0_14px_30px_rgba(37,99,235,0.22)]'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${selected ? 'bg-white/15 text-white' : 'bg-white text-blue-600'}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        {selected && <Check className="h-4 w-4 text-white" />}
                      </div>

                      <div className="mt-4">
                        <p className="text-base font-bold">{title}</p>
                        <p className={`mt-1 text-sm ${selected ? 'text-blue-50' : 'text-slate-500'}`}>{description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
              {errors.purpose && <p className="text-sm text-red-500">{errors.purpose}</p>}
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 md:p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">What kind of place feels right?</h2>
                <p className="mt-1 text-sm text-slate-500">Select the style you&apos;re after.</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {PROPERTY_TYPE_OPTIONS.map(option => {
                  const selected = values.property_type === option

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateField('property_type', option)}
                      className={`rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition-all duration-200 ${
                        selected
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-[0_10px_25px_rgba(37,99,235,0.08)]'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span>{option}</span>
                        {selected && <Check className="h-4 w-4 text-blue-700" />}
                      </span>
                    </button>
                  )
                })}
              </div>

              {showCustomPropertyType && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3">
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Custom property type</label>
                  <input
                    value={values.property_type === 'Other' ? '' : values.property_type}
                    onChange={e => updateField('property_type', e.target.value)}
                    placeholder="Townhouse, duplex villa..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500"
                  />
                </div>
              )}

              {errors.property_type && <p className="text-sm text-red-500">{errors.property_type}</p>}
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 md:p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Where would you like to live?</h2>
                <p className="mt-1 text-sm text-slate-500">Tell us the locations you have in mind.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">State</label>
                  <select
                    value={values.state}
                    onChange={e => updateField('state', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                  >
                    <option value="">Select state</option>
                    {stateOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  {errors.state && <p className="mt-1 text-sm text-red-500">{errors.state}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">Preferred area</label>
                  <input
                    value={values.preferred_area}
                    onChange={e => updateField('preferred_area', e.target.value)}
                    placeholder="Lekki"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                  {errors.preferred_area && <p className="mt-1 text-sm text-red-500">{errors.preferred_area}</p>}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold text-slate-700">Also consider</label>
                  <span className="text-xs font-medium text-slate-400">Optional</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {alternativeAreas.map(area => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => {
                        const updated = values.alternative_areas
                          .split(',')
                          .map(item => item.trim())
                          .filter(item => item && item !== area)
                          .join(', ')

                        updateField('alternative_areas', updated)
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700"
                    >
                      {area}
                      <span className="text-blue-500">×</span>
                    </button>
                  ))}

                  <div className="flex-1 min-w-[160px]">
                    <input
                      value={values.alternative_areas}
                      onChange={e => updateField('alternative_areas', e.target.value)}
                      placeholder="Ajah, Chevron, Yaba"
                      className="w-full rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 md:p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">What&apos;s comfortable for you?</h2>
                <p className="mt-1 text-sm text-slate-500">Set your preferred budget range.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Minimum budget</label>
                  <MoneyInput
                    value={values.min_budget}
                    onChange={value => updateField('min_budget', value)}
                    placeholder="200,000"
                    className="rounded-2xl border border-slate-200 bg-slate-50"
                  />
                  {errors.min_budget && <p className="text-sm text-red-500">{errors.min_budget}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Maximum budget</label>
                  <MoneyInput
                    value={values.max_budget}
                    onChange={value => updateField('max_budget', value)}
                    placeholder="3,000,000"
                    className="rounded-2xl border border-slate-200 bg-slate-50"
                  />
                  {errors.max_budget && <p className="text-sm text-red-500">{errors.max_budget}</p>}
                </div>
              </div>

              {(values.min_budget || values.max_budget) && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
                  <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                    <span>Budget range</span>
                    <span>{formatCurrency(values.min_budget)} • {formatCurrency(values.max_budget)}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-blue-100">
                    <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(100, Math.max(20, completion))}%` }} />
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 md:p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">How much space do you need?</h2>
                <p className="mt-1 text-sm text-slate-500">Choose the layout that suits your day-to-day life.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Bedrooms</label>
                  <div className="flex flex-wrap gap-2">
                    {['Studio', '1', '2', '3', '4', '5+'].map(option => {
                      const selected = values.bedrooms === option
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => updateField('bedrooms', option)}
                          className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                            selected
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Bathrooms</label>
                  <div className="flex flex-wrap gap-2">
                    {['Any', '1', '2', '3', '4+'].map(option => {
                      const selected = values.bathrooms === option
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => updateField('bathrooms', option)}
                          className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                            selected
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 md:p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">How should it feel?</h2>
                <p className="mt-1 text-sm text-slate-500">Refine the home experience you prefer.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Furnishing</label>
                  <div className="grid grid-cols-2 gap-2">
                    {FURNISHING_OPTIONS.map(option => {
                      const selected = values.furnishing === option
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => updateField('furnishing', option)}
                          className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${
                            selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Move-in timeline</label>
                  <div className="grid grid-cols-2 gap-2">
                    {MOVE_IN_OPTIONS.map(option => {
                      const selected = values.move_in_timeline === option
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => updateField('move_in_timeline', option)}
                          className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${
                            selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 md:p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">What matters most?</h2>
                <p className="mt-1 text-sm text-slate-500">Select anything you consider essential.</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {FEATURE_OPTIONS.map(({ label, icon: Icon }) => {
                  const selected = values.features.includes(label)

                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleFeature(label)}
                      className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition-all duration-200 ${
                        selected
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-[0_10px_22px_rgba(37,99,235,0.08)]'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-xl ${selected ? 'bg-blue-600 text-white' : 'bg-white text-slate-500'}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span>{label}</span>
                      </span>
                      {selected && <Check className="h-4 w-4 text-blue-700" />}
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 md:p-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Anything else we should know?</h2>
                <p className="mt-1 text-sm text-slate-500">Share anything that would help us understand your ideal home.</p>
              </div>

              <textarea
                value={values.notes}
                onChange={e => updateField('notes', e.target.value)}
                rows={4}
                placeholder="Quiet estate, good access roads, natural light, close to work…"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </section>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-slate-500">Your request can be updated while our team is reviewing it.</div>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.25)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {submitting ? 'Submitting your request…' : 'Submit Property Request'}
              </button>
            </div>
          </div>

          <aside className="xl:sticky xl:top-24 xl:h-fit">
            <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Your Request</p>
                  <h3 className="mt-2 text-xl font-black text-slate-900">Live summary</h3>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700">
                  {completion}%
                </span>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  <span>Request completeness</span>
                  <span>{completion}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-blue-600 transition-all duration-200" style={{ width: `${completion}%` }} />
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-slate-500">
                    <KeyRound className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-semibold uppercase tracking-[0.12em]">Purpose</span>
                  </div>
                  <p className="mt-2 text-base font-bold text-slate-900">{summary.purpose}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-semibold uppercase tracking-[0.12em]">Property type</span>
                  </div>
                  <p className="mt-2 text-base font-bold text-slate-900">{summary.propertyType}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-slate-500">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-semibold uppercase tracking-[0.12em]">Location</span>
                  </div>
                  <p className="mt-2 text-base font-bold text-slate-900">{summary.location}</p>
                  <p className="mt-1 text-xs text-slate-500">{summary.alternativeAreas}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Wallet className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-semibold uppercase tracking-[0.12em]">Budget</span>
                  </div>
                  <p className="mt-2 text-base font-bold text-slate-900">{summary.budgetRange}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-2 text-slate-500">
                      <BedDouble className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-semibold uppercase tracking-[0.12em]">Bedrooms</span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-slate-900">{summary.bedrooms}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Bath className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-semibold uppercase tracking-[0.12em]">Bathrooms</span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-slate-900">{summary.bathrooms}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-slate-500">
                    <CalendarRange className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-semibold uppercase tracking-[0.12em]">Move-in</span>
                  </div>
                  <p className="mt-2 text-base font-bold text-slate-900">{summary.moveIn}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-semibold uppercase tracking-[0.12em]">Must-haves</span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-900">{summary.features}</p>
                </div>
              </div>

              <button
                type="submit"
                form="property-request-form"
                disabled={submitting}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(37,99,235,0.25)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {submitting ? 'Submitting your request…' : 'Submit Property Request'}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </aside>
        </div>
      </form>
    </div>
  )
}
