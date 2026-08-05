export const ROUTES = {
  login: "/login",
  dashboard: "/dashboard",
  caregivers: "/caregivers",
  newCaregiver: "/caregivers/new",
  review: "/caregivers/review",
  caregiverDetail: (id: number | string) => `/caregivers/${id}`,
}
