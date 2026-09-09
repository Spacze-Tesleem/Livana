import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { PropertyRequest } from '@/types'

const PURPOSE_OPTIONS = ['Rent', 'Lease', 'Buy']
const PROPERTY_TYPE_OPTIONS = [
  'Self-contained',
  'Mini flat',
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
const FEATURE_OPTIONS = ['Parking', 'Security', 'Stable electricity', 'Water', 'Gated estate', 'Serviced apartment', 'BQ', 'Balcony', 'Other']

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
  open: boolean
  onOpenChange: (value: boolean) => void
  initialValues?: Partial<PropertyRequestFormValues>
  onSuccess?: (request: PropertyRequest) => void
}

export default function PropertyRequestForm({ open, onOpenChange, initialValues, onSuccess }: PropertyRequestFormProps) {
  const [values, setValues] = useState<PropertyRequestFormValues>({ ...defaultValues, ...initialValues })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setValues({ ...defaultValues, ...initialValues })
    setErrors({})
  }, [open, initialValues])

  const stateOptions = useMemo(() => ['Lagos', 'Ogun', 'Abuja', 'Rivers', 'Enugu', 'Kaduna', 'Kano'], [])

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
    if (!values.property_type) nextErrors.property_type = 'Property type is required.'
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

      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('user_id', user.id)
        .single() as { data: { id: string } | null }

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
        status: 'submitted',
      }

      const { data, error } = await supabase
        .from('property_requests')
        .insert(payload)
        .select()
        .single()

      if (error) throw error

      onSuccess?.(data as PropertyRequest)
      onOpenChange(false)
    } catch (error) {
      console.error('[property request create]', error)
      setErrors({ form: error instanceof Error ? error.message : 'Unable to save request.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 md:items-center md:p-6">
      <div className="h-[95vh] w-full overflow-y-auto rounded-t-3xl bg-white md:max-w-2xl md:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3 md:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">New request</p>
            <h2 className="text-lg font-extrabold text-gray-900">Property Request</h2>
          </div>
          <button type="button" onClick={() => onOpenChange(false)} className="rounded-xl border border-gray-200 p-2 text-gray-500 transition hover:bg-gray-50">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-4 md:p-6">
          {errors.form && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{errors.form}</div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Purpose</label>
              <div className="grid grid-cols-3 gap-2">
                {PURPOSE_OPTIONS.map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateField('purpose', option)}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                      values.purpose === option
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {errors.purpose && <p className="mt-1 text-xs text-red-500">{errors.purpose}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Property Type</label>
              <select
                value={values.property_type}
                onChange={e => updateField('property_type', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:bg-white"
              >
                <option value="">Select a property type</option>
                {PROPERTY_TYPE_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {errors.property_type && <p className="mt-1 text-xs text-red-500">{errors.property_type}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Preferred State</label>
              <select
                value={values.state}
                onChange={e => updateField('state', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:bg-white"
              >
                <option value="">Select state</option>
                {stateOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {errors.state && <p className="mt-1 text-xs text-red-500">{errors.state}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Preferred Area</label>
              <input
                value={values.preferred_area}
                onChange={e => updateField('preferred_area', e.target.value)}
                placeholder="Lekki"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:bg-white"
              />
              {errors.preferred_area && <p className="mt-1 text-xs text-red-500">{errors.preferred_area}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Alternative Areas</label>
              <input
                value={values.alternative_areas}
                onChange={e => updateField('alternative_areas', e.target.value)}
                placeholder="Ajah, Yaba, Ikeja"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Min Budget</label>
              <input
                type="number"
                min="0"
                value={values.min_budget}
                onChange={e => updateField('min_budget', e.target.value)}
                placeholder="2000000"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:bg-white"
              />
              {errors.min_budget && <p className="mt-1 text-xs text-red-500">{errors.min_budget}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Max Budget</label>
              <input
                type="number"
                min="0"
                value={values.max_budget}
                onChange={e => updateField('max_budget', e.target.value)}
                placeholder="3000000"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:bg-white"
              />
              {errors.max_budget && <p className="mt-1 text-xs text-red-500">{errors.max_budget}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Bedrooms</label>
              <input
                type="number"
                min="0"
                value={values.bedrooms}
                onChange={e => updateField('bedrooms', e.target.value)}
                placeholder="2"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Bathrooms</label>
              <input
                type="number"
                min="0"
                value={values.bathrooms}
                onChange={e => updateField('bathrooms', e.target.value)}
                placeholder="2"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Furnishing</label>
              <select
                value={values.furnishing}
                onChange={e => updateField('furnishing', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:bg-white"
              >
                {FURNISHING_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Move-in Timeline</label>
              <select
                value={values.move_in_timeline}
                onChange={e => updateField('move_in_timeline', e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:bg-white"
              >
                {MOVE_IN_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Must-have Features</label>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {FEATURE_OPTIONS.map(feature => (
                  <label key={feature} className="flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={values.features.includes(feature)}
                      onChange={() => toggleFeature(feature)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {feature}
                  </label>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Additional Notes</label>
              <textarea
                value={values.notes}
                onChange={e => updateField('notes', e.target.value)}
                rows={4}
                placeholder="Tell us about your ideal setup, any must-have features, or timeline details."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {submitting ? 'Saving...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
