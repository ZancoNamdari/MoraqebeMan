export const ROUTES = {
  login: "/login",
  dashboard: "/dashboard",
  patientDetail: (id: number | string) => `/patients/detail?id=${id}`,
  terms: "/terms",
  identity: "/profile/identity",
  serviceAreas: "/profile/service-areas",
  experience: "/profile/experience",
  skills: "/profile/skills",
  patientNotes: "/patient-notes",
  references: "/profile/references",
  history: "/history",
  blacklistAppeal: "/blacklist-appeal",
}
