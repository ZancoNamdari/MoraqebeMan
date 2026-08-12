export const PANEL_URLS = {
  family: process.env.NEXT_PUBLIC_FAMILY_PANEL_URL || "http://localhost:3001",
  patient: process.env.NEXT_PUBLIC_PATIENT_PANEL_URL || "http://localhost:3003",
  caregiver: process.env.NEXT_PUBLIC_CAREGIVER_PANEL_URL || "http://localhost:3002",
  supervisor: process.env.NEXT_PUBLIC_SUPERVISOR_PANEL_URL || "http://localhost:3000",
}
