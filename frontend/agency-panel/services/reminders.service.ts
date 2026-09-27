import { api } from "./api"
import type { ReminderPipelineOption, ReminderRule, UpsertReminderRulePayload } from "@/types/reminders"

export const remindersService = {
  async pipelines(agencyId: number) {
    const { data } = await api.get(`/api/agencies/${agencyId}/reminder-pipelines/`)
    return data as ReminderPipelineOption[]
  },

  async list(agencyId: number, pipelineKey?: string) {
    const { data } = await api.get(`/api/agencies/${agencyId}/reminder-rules/`, {
      params: pipelineKey ? { pipeline_key: pipelineKey } : undefined,
    })
    return data as ReminderRule[]
  },

  async create(agencyId: number, payload: UpsertReminderRulePayload) {
    const { data } = await api.post(`/api/agencies/${agencyId}/reminder-rules/`, payload)
    return data as ReminderRule
  },

  async update(agencyId: number, ruleId: number, payload: Partial<UpsertReminderRulePayload>) {
    const { data } = await api.patch(`/api/agencies/${agencyId}/reminder-rules/${ruleId}/`, payload)
    return data as ReminderRule
  },

  async remove(agencyId: number, ruleId: number) {
    await api.delete(`/api/agencies/${agencyId}/reminder-rules/${ruleId}/`)
  },
}
