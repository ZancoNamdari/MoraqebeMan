export const ROUTES = {
  login: "/login",
  dashboard: "/dashboard",
  profile: "/profile",
  questionnaire: "/questionnaire",
  access: "/access",
  care: "/care",
  caregivers: "/caregivers",
  caregiverDetail: (id: number | string) => `/caregivers/detail?id=${id}`,
}
