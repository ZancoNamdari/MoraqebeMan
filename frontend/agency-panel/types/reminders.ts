// Shared across every pipeline that carries reminder badges — the
// patient overview board, the caregiver-candidate board, and خدمات
// مقطعی — since apps.reminders on the backend computes them all the
// same way and returns this exact shape from each one's own
// serializer's `active_reminders` field.
export type ReminderColor = "red" | "amber" | "blue"

export interface ActiveReminder {
  label: string
  color: ReminderColor
  days_elapsed: number
}

export interface ReminderPipelineStage {
  value: string
  label: string
}

export interface ReminderPipelineOption {
  key: string
  label: string
  stages: ReminderPipelineStage[]
}

export interface ReminderRule {
  id: number
  pipeline_key: string
  pipeline_label: string
  anchor_stage: string
  anchor_stage_display: string
  display_stage: string
  display_stage_display: string
  days_threshold: number
  label: string
  color: ReminderColor
  color_display: string
  is_active: boolean
}

export interface UpsertReminderRulePayload {
  pipeline_key: string
  anchor_stage: string
  display_stage: string
  days_threshold: number
  label: string
  color?: ReminderColor
  is_active?: boolean
}
