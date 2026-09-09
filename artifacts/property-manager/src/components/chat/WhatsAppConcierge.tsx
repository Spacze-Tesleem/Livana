import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  BedDouble,
  Building2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Home,
  MapPin,
  MessageSquareText,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react'
import { formatNaira } from '../../lib/currency'
import { useLocation } from '../../lib/navigation'
import {
  createClient,
  getSupabaseImageUrl,
  isSupabaseConfigured,
} from '../../lib/supabase'
import {
  getPlatformSettings,
  phoneToWaLink,
} from '../../lib/platform-settings'
import {
  buildWhatsAppMessage,
  generateReferenceCode,
  getWhatsAppPhoneNumber,
  type ConciergeEnquiryType,
} from '../../lib/whatsapp-config'

type ViewMode = 'home' | 'form'

type PropertyContext = {
  id: string
  title: string
  city: string
  price: number
  type: string
  image: string | null
}

type ConciergeFormState = {
  name: string
  email: string
  phone: string
  purpose: string
  propertyType: string
  preferredLocation: string
  minBudget: string
  maxBudget: string
  bedrooms: string
  details: string
  propertyId: string | null
}

const MENU_OPTIONS = [
  {
    title: 'Find a Property',
    desc: 'Tell us the home or rental you have in mind.',
    enquiryType: 'find_property',
    icon: Home,
  },
  {
    title: 'Request a Property',
    desc: 'Share your preferred layout, area and budget.',
    enquiryType: 'request_property',
    icon: MessageSquareText,
  },
  {
    title: 'List My Property',
    desc: 'Tell us about your property and we’ll guide you.',
    enquiryType: 'list_property',
    icon: Building2,
  },
  {
    title: 'Book an Inspection',
    desc: 'Request a viewing for a listing you like.',
    enquiryType: 'book_inspection',
    icon: CalendarCheck,
  },
  {
    title: 'General Enquiry',
    desc: 'Ask a general question about Livarex.',
    enquiryType: 'general_enquiry',
    icon: Sparkles,
  },
] as const

const defaultForm: ConciergeFormState = {
  name: '',
  email: '',
  phone: '',
  purpose: 'Rent',
  propertyType: 'Apartment',
  preferredLocation: '',
  minBudget: '',
  maxBudget: '',
  bedrooms: '',
  details: '',
  propertyId: null,
}

function WhatsAppConcierge() {
  const [location] = useLocation()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<ViewMode>('home')
  const [selectedEnquiry, setSelectedEnquiry] = useState<ConciergeEnquiryType | null>(null)
  const [propertyContext, setPropertyContext] = useState<PropertyContext | null>(null)
  const [form, setForm] = useState<ConciergeFormState>(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const quickTitle = useMemo(() => {
    if (!selectedEnquiry) return 'Property concierge'
    return MENU_OPTIONS.find(option => option.enquiryType === selectedEnquiry)?.title ?? 'Property concierge'
  }, [selectedEnquiry])

  useEffect(() => {
    if (!open) return

    let active = true

    const loadPropertyContext = async () => {
      const match = (location || '').match(/^\/listings\/([^/?#]+)/)
      if (!match || !isSupabaseConfigured()) {
        if (active) setPropertyContext(null)
        return
      }

      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('properties')
          .select('id, title, city, price, type, property_images(storage_path, is_cover, sort_order)')
          .eq('id', decodeURIComponent(match[1]))
          .maybeSingle()

        if (!active || !data) {
          setPropertyContext(null)
          return
        }

        const images = Array.isArray(data.property_images) ? data.property_images : []
        const cover = images
          .slice()
          .sort((a: any, b: any) => {
            if (a.is_cover) return -1
            if (b.is_cover) return 1
            return (a.sort_order ?? 0) - (b.sort_order ?? 0)
          })[0]

        if (!active) return

        setPropertyContext({
          id: String(data.id),
          title: String(data.title ?? 'Property'),
          city: String(data.city ?? ''),
          price: Number(data.price ?? 0),
          type: String(data.type ?? 'rent'),
          image: cover?.storage_path ? getSupabaseImageUrl(cover.storage_path, 240) : null,
        })
      } catch {
        if (active) setPropertyContext(null)
      }
    }

    loadPropertyContext()

    return () => {
      active = false
    }
  }, [location, open])

  useEffect(() => {
    if (!open || !propertyContext) return

    setForm(prev => ({
      ...prev,
      propertyType: prev.propertyType || propertyContext.type || 'Apartment',
      propertyId: propertyContext.id,
      preferredLocation: prev.preferredLocation || propertyContext.city,
      details: prev.details || `I am interested in ${propertyContext.title} in ${propertyContext.city}.`,
    }))
  }, [open, propertyContext])

  function updateField<K extends keyof ConciergeFormState>(field: K, value: ConciergeFormState[K]) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  function selectOption(option: (typeof MENU_OPTIONS)[number]) {
    setSelectedEnquiry(option.enquiryType)
    setView('form')

    setForm(prev => ({
      ...prev,
      purpose: option.title === 'Find a Property' ? 'Rent' : prev.purpose,
      propertyType: option.enquiryType === 'book_inspection' ? propertyContext?.type || prev.propertyType : prev.propertyType,
      details:
        option.enquiryType === 'book_inspection' && propertyContext
          ? `I would like to book an inspection for ${propertyContext.title} in ${propertyContext.city}.`
          : prev.details,
      propertyId: propertyContext?.id ?? prev.propertyId,
    }))
  }

  function goHome() {
    setView('home')
    setError(null)
    setSelectedEnquiry(null)
    setForm(defaultForm)
  }

  function validateForm() {
    if (!form.name.trim()) return 'Please enter your name.'

    if (!form.phone.trim() && !form.email.trim()) {
      return 'Please add either a phone number or email address.'
    }

    if (selectedEnquiry === 'find_property' || selectedEnquiry === 'request_property') {
      if (!form.preferredLocation.trim()) {
        return 'Please add a preferred location.'
      }
    }

    if (selectedEnquiry === 'book_inspection' && !propertyContext) {
      return 'Please select a property to inspect.'
    }

    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const referenceCode = generateReferenceCode(selectedEnquiry ?? 'general_enquiry')
      const phone = form.phone.trim() || (await getWhatsAppPhoneNumber())
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        enquiry_type: selectedEnquiry ?? 'general_enquiry',
        purpose: form.purpose || undefined,
        property_type: form.propertyType || undefined,
        preferred_location: form.preferredLocation || undefined,
        min_budget: form.minBudget || undefined,
        max_budget: form.maxBudget || undefined,
        bedrooms: form.bedrooms || undefined,
        details: form.details || undefined,
        message: selectedEnquiry ? undefined : 'General enquiry',
        source_page: location || undefined,
        reference_code: referenceCode,
        property_id: propertyContext?.id ?? form.propertyId ?? undefined,
      }

      const message = buildWhatsAppMessage(payload)
      const agentPhone = await getWhatsAppPhoneNumber()

      if (isSupabaseConfigured()) {
        try {
          const supabase = createClient()
          await supabase.from('whatsapp_leads').insert({
            tenant_id: null,
            name: payload.name,
            email: payload.email ?? null,
            phone: payload.phone ?? null,
            enquiry_type: payload.enquiry_type,
            property_id: payload.property_id ?? null,
            purpose: payload.purpose ?? null,
            property_type: payload.property_type ?? null,
            preferred_location: payload.preferred_location ?? null,
            min_budget: payload.min_budget ? Number(payload.min_budget) : null,
            max_budget: payload.max_budget ? Number(payload.max_budget) : null,
            bedrooms: payload.bedrooms ? Number(payload.bedrooms) : null,
            details: payload.details ?? null,
            message: payload.details ?? payload.message ?? null,
            source_page: payload.source_page ?? null,
            reference_code: payload.reference_code ?? null,
            status: 'new',
          })
        } catch (leadError) {
          console.error('[WhatsAppConcierge] Lead capture failed:', leadError)
        }
      }

      window.open(phoneToWaLink(agentPhone, message), '_blank', 'noopener,noreferrer')
      setOpen(false)
      setView('home')
      setSelectedEnquiry(null)
      setForm(defaultForm)
    } catch (caughtError) {
      console.error('[WhatsAppConcierge] handoff failed:', caughtError)
      setError('Something went wrong while preparing your WhatsApp message.')
    } finally {
      setSubmitting(false)
    }
  }

  const launcherLabel = open ? 'Open' : 'Need property help?'

  return (
    <>
      <style>{`
        .wa-panel-scroll { scrollbar-width: thin; scrollbar-color: rgba(148, 163, 184, 0.5) transparent; }
        .wa-panel-scroll::-webkit-scrollbar { width: 7px; }
        .wa-panel-scroll::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.45); border-radius: 9999px; }
      `}</style>

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Livarex Property Assistant"
          className="fixed bottom-5 right-5 z-[9999] flex items-center gap-2 rounded-2xl border border-emerald-200 bg-[#25D366] px-3 py-3 text-sm font-bold text-white shadow-[0_18px_35px_rgba(37,211,102,0.35)] transition hover:bg-[#1ebc5b]"
        >
          <MessageSquareText className="h-4 w-4" />
          <span className="hidden sm:inline">{launcherLabel}</span>
        </button>
      )}

      <div
        className={`fixed bottom-5 right-5 z-[9999] overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.12)] transition-all duration-300 ${open ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-5'} w-[calc(100vw-24px)] max-w-[400px] max-h-[85vh]`}
        role="dialog"
        aria-modal="false"
        aria-label="Livarex Property Assistant"
      >
        <div className="flex h-full max-h-[85vh] flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-3">
              {view === 'form' && (
                <button
                  type="button"
                  onClick={goHome}
                  aria-label="Back"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}

              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Livarex</p>
                <h3 className="mt-0.5 text-base font-black text-slate-900">Property Assistant</h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close widget"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E6F9EE] text-[#25D366]">
                <MessageSquareText className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Tell us what you need and continue with our team on WhatsApp.</p>
              </div>
            </div>
          </div>

          {view === 'home' ? (
            <div className="wa-panel-scroll flex-1 overflow-y-auto px-4 py-4">
              {propertyContext && (
                <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">You’re viewing</p>
                  <div className="mt-2 flex gap-3">
                    {propertyContext.image && (
                      <img
                        src={propertyContext.image}
                        alt={propertyContext.title}
                        className="h-16 w-16 rounded-2xl object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{propertyContext.title}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5" />
                        {propertyContext.city}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-blue-700">{formatNaira(propertyContext.price)}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-2">
                <p className="text-2xl font-black tracking-[-0.05em] text-slate-900">Hi there 👋</p>
                <p className="mt-1 text-sm text-slate-500">How can we help you today?</p>
              </div>

              <div className="space-y-2">
                {MENU_OPTIONS.map(option => {
                  const Icon = option.icon

                  return (
                    <button
                      key={option.title}
                      type="button"
                      onClick={() => selectOption(option)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <Icon className="h-4 w-4" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-slate-900">{option.title}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">{option.desc}</span>
                      </span>

                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="wa-panel-scroll flex-1 overflow-y-auto px-4 py-4">
              <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{quickTitle}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedEnquiry === 'book_inspection'
                    ? 'Tell us who you are and we’ll continue this request on WhatsApp.'
                    : 'Share a few quick details so our team can prepare the right message.'}
                </p>
              </div>

              {error && (
                <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold text-slate-700">Name</span>
                    <input
                      value={form.name}
                      onChange={e => updateField('name', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                      placeholder="Your name"
                    />
                  </label>

                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold text-slate-700">Phone</span>
                    <input
                      value={form.phone}
                      onChange={e => updateField('phone', e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                      placeholder="+234..."
                    />
                  </label>
                </div>

                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-slate-700">Email</span>
                  <input
                    value={form.email}
                    onChange={e => updateField('email', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                    placeholder="you@example.com"
                  />
                </label>

                {(selectedEnquiry === 'find_property' || selectedEnquiry === 'request_property') && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm">
                        <span className="mb-1 block font-semibold text-slate-700">Purpose</span>
                        <select
                          value={form.purpose}
                          onChange={e => updateField('purpose', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                        >
                          <option value="Rent">Rent</option>
                          <option value="Lease">Lease</option>
                          <option value="Buy">Buy</option>
                        </select>
                      </label>

                      <label className="block text-sm">
                        <span className="mb-1 block font-semibold text-slate-700">Property type</span>
                        <select
                          value={form.propertyType}
                          onChange={e => updateField('propertyType', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                        >
                          <option value="Apartment">Apartment</option>
                          <option value="Mini Flat">Mini Flat</option>
                          <option value="Self-contained">Self-contained</option>
                          <option value="Bungalow">Bungalow</option>
                          <option value="Duplex">Duplex</option>
                          <option value="Commercial">Commercial</option>
                          <option value="Land">Land</option>
                          <option value="Other">Other</option>
                        </select>
                      </label>
                    </div>

                    <label className="block text-sm">
                      <span className="mb-1 block font-semibold text-slate-700">Preferred location</span>
                      <input
                        value={form.preferredLocation}
                        onChange={e => updateField('preferredLocation', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                        placeholder="Lekki, Lagos"
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-sm">
                        <span className="mb-1 block font-semibold text-slate-700">Min budget</span>
                        <input
                          value={form.minBudget}
                          onChange={e => updateField('minBudget', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                          placeholder="2000000"
                        />
                      </label>

                      <label className="block text-sm">
                        <span className="mb-1 block font-semibold text-slate-700">Max budget</span>
                        <input
                          value={form.maxBudget}
                          onChange={e => updateField('maxBudget', e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                          placeholder="3000000"
                        />
                      </label>
                    </div>

                    <label className="block text-sm">
                      <span className="mb-1 block font-semibold text-slate-700">Bedrooms</span>
                      <div className="flex flex-wrap gap-2">
                        {['Studio', '1', '2', '3', '4', '5+'].map(option => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => updateField('bedrooms', option)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                              form.bedrooms === option
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-slate-200 bg-slate-50 text-slate-600'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </label>
                  </>
                )}

                {selectedEnquiry === 'list_property' && (
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold text-slate-700">Property details</span>
                    <textarea
                      value={form.details}
                      onChange={e => updateField('details', e.target.value)}
                      rows={4}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                      placeholder="Tell us about the property you want to list."
                    />
                  </label>
                )}

                {selectedEnquiry === 'book_inspection' && propertyContext && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">Property selected</p>
                    <div className="mt-2 flex items-start gap-3">
                      {propertyContext.image && (
                        <img src={propertyContext.image} alt={propertyContext.title} className="h-14 w-14 rounded-xl object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900">{propertyContext.title}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="h-3.5 w-3.5" />
                          {propertyContext.city}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-blue-700">{formatNaira(propertyContext.price)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {(selectedEnquiry === 'general_enquiry' || selectedEnquiry === 'book_inspection') && (
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold text-slate-700">Additional details</span>
                    <textarea
                      value={form.details}
                      onChange={e => updateField('details', e.target.value)}
                      rows={4}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                      placeholder={selectedEnquiry === 'general_enquiry' ? 'Ask us anything about Livarex.' : 'Share your preferred inspection time or questions.'}
                    />
                  </label>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-[0_16px_30px_rgba(37,211,102,0.28)] transition hover:bg-[#1ebc5b] disabled:cursor-not-allowed disabled:bg-emerald-300"
                >
                  {submitting ? 'Preparing WhatsApp…' : 'Continue on WhatsApp'}
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default WhatsAppConcierge
