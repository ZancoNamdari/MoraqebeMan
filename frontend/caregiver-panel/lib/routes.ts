export const ROUTES = {
  login: "/login",
  dashboard: "/dashboard",
  patientDetail: (id: number | string) => `/patients/detail?id=${id}`,
}
