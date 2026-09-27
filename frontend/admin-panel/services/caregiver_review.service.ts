import { api } from "./api"
import type { CaregiverDocumentField, CaregiverDocumentUpload, CaregiverFullProfile, CaregiverListItem } from "@/types/caregiver_review"

export const caregiverReviewService = {
  async list() {
    const { data } = await api.get("/api/supervisor/caregivers/")
    return data as CaregiverListItem[]
  },

  async fullProfile(userId: number) {
    const { data } = await api.get(`/api/supervisor/caregivers/${userId}/full/`)
    return data as CaregiverFullProfile
  },

  async approve(userId: number) {
    const { data } = await api.post(`/api/caregivers/${userId}/approve/`)
    return data as { detail: string; status: string; missing?: string[] }
  },

  async reject(userId: number, reason: string) {
    const { data } = await api.post(`/api/caregivers/${userId}/reject/`, { reason })
    return data as { detail: string; status: string; rejection_reason: string }
  },

  async blacklist(userId: number, reason: string) {
    const { data } = await api.post(`/api/caregivers/${userId}/blacklist/`, { reason })
    return data as { detail: string; status: string; blacklist_reason: string }
  },

  async unblacklist(userId: number) {
    const { data } = await api.post(`/api/caregivers/${userId}/unblacklist/`)
    return data as { detail: string; status: string }
  },

  // Reviewing one of the seven document-checklist uploads — agency
  // staff do the uploading (agency-panel); platform admin/superuser
  // reviews from here, same endpoints agency-panel's own
  // owner/supervisor also hits.
  async approveDocument(userId: number, documentType: CaregiverDocumentField) {
    const { data } = await api.post(`/api/caregivers/${userId}/documents/${documentType}/approve/`)
    return data as CaregiverDocumentUpload
  },

  async rejectDocument(userId: number, documentType: CaregiverDocumentField, reason: string) {
    const { data } = await api.post(`/api/caregivers/${userId}/documents/${documentType}/reject/`, { reason })
    return data as CaregiverDocumentUpload
  },
}
