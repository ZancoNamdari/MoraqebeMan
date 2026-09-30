export const ROUTES = {
  login: "/login",
  dashboard: "/dashboard",
  dashboardCaregivers: "/dashboard/caregivers",
  dashboardPatients: "/dashboard/patients",
  dashboardStaff: "/dashboard/staff",
  dashboardFinancial: "/dashboard/financial",
  families: "/families",
  caregivers: "/caregivers",
  supervisors: "/supervisors",
  patients: "/patients",
  patientMatch: (patientId: number) => `/patients/${patientId}/match`,
  // Reverse direction of the same idea — once a caregiver's own
  // documents are done, the agency looks for a suitable patient FOR
  // THEM rather than the other way around. See match/[id]/page.tsx
  // under caregivers for how this reuses the existing engine.
  caregiverMatch: (caregiverId: number) => `/caregivers/${caregiverId}/match`,
  complaints: "/complaints",
  blacklistAppeals: "/blacklist-appeals",
  candidates: "/candidates",
  patientsBank: "/patients-bank",
  matching: "/matching",
  episodicServices: "/episodic-services",
  analytics: "/analytics",
  financial: "/financial",
  settings: "/settings",
  admins: "/admins",
  employees: "/employees",
  caregiverPerformance: "/caregivers/performance",
  caregiverActivity: "/caregivers/activity",
  caregiverSettings: "/caregivers/settings",
}
