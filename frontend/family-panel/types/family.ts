export interface FamilyProfile {
  id: number
  user_id: number
  access_code: string
  display_name: string
  province: number | null
  city: number | null
  province_name: string | null
  city_name: string | null
  address: string
  created_at: string
}
