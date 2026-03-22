// Smart Crawler — Types
// Remplacement de TurboMock pour DemoDrop 3

export interface WebhookPayload {
  contactId: string
  locationId: string
  pit: string
  website?: string
  facebook_url?: string
  instagram_url?: string
  linkedin_url?: string
  company_name?: string
  first_name?: string
  email?: string
}

export interface CrawlResult {
  source: 'website' | 'facebook' | 'instagram' | 'linkedin'
  url: string
  content: string
  success: boolean
  error?: string
}

export interface ExtractedData {
  description: string
  industry: string
  services: string
  serviceAreas: string
  hours: string
  faq: string
}

export interface GHLCustomField {
  key: string
  field_value: string
}

export type DemoMode = 'with_site' | 'without_site'
