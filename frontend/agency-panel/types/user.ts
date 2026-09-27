export interface User {
  id: number
  username: string
  first_name?: string
  last_name?: string
  email: string
  phone_number: string
  role: string
  is_phone_verified: boolean
}
