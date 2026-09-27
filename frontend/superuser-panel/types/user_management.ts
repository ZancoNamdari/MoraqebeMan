export type UserRole = "superuser" | "admin" | "agency" | "family" | "patient" | "caregiver"

export interface ManagedUser {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  phone_number: string
  role: UserRole
  is_phone_verified: boolean
}

export const ROLE_LABELS: Record<UserRole, string> = {
  superuser: "سوپریوزر",
  admin: "ادمین / کارشناس",
  agency: "آژانس / شرکت",
  family: "خانواده",
  patient: "بیمار / سالمند",
  caregiver: "مراقب",
}
