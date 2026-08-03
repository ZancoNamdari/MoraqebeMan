export const ROUTES = {
  login: "/login",
  dashboard: "/dashboard",
  caregivers: "/caregivers",
  newCaregiver: "/caregivers/new",
  caregiverDetail: (id: number | string) => `/caregivers/${id}`,
}
