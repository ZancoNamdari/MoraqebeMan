export const ROUTES = {
  login: "/login",
  dashboard: "/dashboard",
  newPatient: "/patients/new",
  patientDetail: (id: number | string) => `/patients/detail?id=${id}`,
  complaints: "/complaints",
}
