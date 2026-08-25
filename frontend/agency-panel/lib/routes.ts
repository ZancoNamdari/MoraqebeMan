export const ROUTES = {
  login: "/login",
  dashboard: "/dashboard",
  families: "/families",
  caregivers: "/caregivers",
  supervisors: "/supervisors",
  patients: "/patients",
  patientMatch: (patientId: number) => `/patients/${patientId}/match`,
}
