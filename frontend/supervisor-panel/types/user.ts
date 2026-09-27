export interface User {
  id: number
  username: string
  first_name: string
  last_name: string
  national_id: string | null
  email: string
  phone_number: string
  role: string
  is_phone_verified: boolean
}
