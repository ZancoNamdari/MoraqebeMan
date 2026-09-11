export const ROUTES = {
  login: "/login",
  dashboard: "/dashboard",
  caregiverDetail: (userId: number) => `/caregivers/${userId}`,
  complaints: "/complaints",
  complaintDetail: (id: number) => `/complaints/${id}`,
  patientNotes: "/patient-notes",
  auditLogs: "/audit-logs",
  blacklistAppeals: "/blacklist-appeals",
  articles: "/articles",
  articleNew: "/articles/new",
  articleDetail: (id: number) => `/articles/${id}`,
}
