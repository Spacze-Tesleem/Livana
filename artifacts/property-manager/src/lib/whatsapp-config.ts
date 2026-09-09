import { DEFAULT_PLATFORM, getPlatformSettings } from './platform-settings'

export type ConciergeEnquiryType =
  | 'find_property'
  | 'request_property'
  | 'list_property'
  | 'book_inspection'
  | 'general_enquiry'

export interface WhatsAppLeadPayload {
  name: string
  email?: string
  phone?: string
  enquiry_type: ConciergeEnquiryType
  purpose?: string
  property_type?: string
  preferred_location?: string
  min_budget?: string
  max_budget?: string
  bedrooms?: string
  details?: string
  message?: string
  source_page?: string
  reference_code?: string
  property_id?: string | null
}

const ENQUIRY_PREFIX: Record<ConciergeEnquiryType, string> = {
  find_property: 'LRX-FIND',
  request_property: 'LRX-REQ',
  list_property: 'LRX-LIST',
  book_inspection: 'LRX-INSPECT',
  general_enquiry: 'LRX-HELP',
}

export async function getWhatsAppPhoneNumber(): Promise<string> {
  try {
    const settings = await getPlatformSettings()
    return settings.phone || DEFAULT_PLATFORM.phone
  } catch {
    return DEFAULT_PLATFORM.phone
  }
}

export function generateReferenceCode(enquiry_type: ConciergeEnquiryType): string {
  const now = Date.now()
  const suffix = String(now % 1000000).padStart(6, '0')
  return `${ENQUIRY_PREFIX[enquiry_type]}-${suffix}`
}

export function buildWhatsAppMessage(payload: WhatsAppLeadPayload): string {
  const lines = [
    `Hi Livarex, I’d like to ${describeEnquiry(payload.enquiry_type)}.`,
    `Reference: ${payload.reference_code || 'N/A'}`,
  ]

  if (payload.name) lines.push(`Name: ${payload.name}`)
  if (payload.email) lines.push(`Email: ${payload.email}`)
  if (payload.phone) lines.push(`Phone: ${payload.phone}`)
  if (payload.property_id) lines.push(`Property ID: ${payload.property_id}`)
  if (payload.purpose) lines.push(`Purpose: ${payload.purpose}`)
  if (payload.property_type) lines.push(`Property type: ${payload.property_type}`)
  if (payload.preferred_location) lines.push(`Preferred location: ${payload.preferred_location}`)
  if (payload.min_budget || payload.max_budget) {
    const budgetLine = [payload.min_budget ? `Min budget: ${payload.min_budget}` : null, payload.max_budget ? `Max budget: ${payload.max_budget}` : null].filter(Boolean).join(' • ')
    lines.push(budgetLine)
  }
  if (payload.bedrooms) lines.push(`Bedrooms: ${payload.bedrooms}`)
  if (payload.details) lines.push(`Details: ${payload.details}`)
  if (payload.message) lines.push(`Message: ${payload.message}`)
  if (payload.source_page) lines.push(`Source page: ${payload.source_page}`)

  return lines.join('\n')
}

function describeEnquiry(enquiry_type: ConciergeEnquiryType): string {
  switch (enquiry_type) {
    case 'find_property':
      return 'find a property'
    case 'request_property':
      return 'request a property'
    case 'list_property':
      return 'list my property'
    case 'book_inspection':
      return 'book an inspection'
    case 'general_enquiry':
      return 'ask a general question'
    default:
      return 'get help'
  }
}
