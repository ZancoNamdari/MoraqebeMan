export interface PlatformAgencyListItem {
  id: number
  company_name: string
  license_number: string
  access_code: string
  owner_phone_number: string
  owner_username: string
  created_at: string
}

export interface CreateAgencyPayload {
  company_name: string
  license_number?: string
  first_name: string
  last_name: string
  phone_number: string
  email?: string
}
