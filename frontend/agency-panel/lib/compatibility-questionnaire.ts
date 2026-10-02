export interface CaregiverQuestionnaireOption {
  value: "0" | "50" | "100"
  text: string
}

export interface CaregiverQuestionnaireQuestion {
  field: string
  question: string
  options: CaregiverQuestionnaireOption[]
}

export interface CaregiverQuestionnaireSection {
  title: string
  questions: CaregiverQuestionnaireQuestion[]
}

export const CAREGIVER_QUESTIONNAIRE: CaregiverQuestionnaireSection[] = [
  {
    title: "سازگاری عمومی",
    questions: [
      {
        field: "religiosity_level",
        question: "به‌طور کلی چقدر مذهبی هستید؟",
        options: [
          { value: "0", text: "مذهبی نیستم" },
          { value: "50", text: "تا حدی مذهبی هستم" },
          { value: "100", text: "کاملاً مذهبی هستم" },
        ],
      },
      {
        field: "family_compatibility_level",
        question: "سازگاری شما با خانواده یا کارفرمای محل کار چقدر است؟",
        options: [
          { value: "0", text: "سازگار نیستم" },
          { value: "50", text: "تا حدی سازگار هستم" },
          { value: "100", text: "کاملاً سازگار هستم" },
        ],
      },
      {
        field: "patience_level",
        question: "چقدر صبور هستید؟",
        options: [
          { value: "0", text: "صبور نیستم" },
          { value: "50", text: "متوسط" },
          { value: "100", text: "کاملاً صبور هستم" },
        ],
      },
      {
        field: "clinical_compatibility_level",
        question: "میزان سازگاری بالینی شما (رعایت دستورات پزشکی و شرایط درمانی سالمند) چقدر است؟",
        options: [
          { value: "0", text: "سازگار نیستم" },
          { value: "50", text: "تا حدی سازگار هستم" },
          { value: "100", text: "کاملاً سازگار هستم" },
        ],
      },
    ],
  },
]
