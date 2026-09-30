export interface PatientQuestionnaireOption {
  value: string
  text: string
}

export interface PatientQuestionnaireQuestion {
  field: string
  question: string
  options: PatientQuestionnaireOption[]
}

// Twelve questions, seven axes — transcribed straight from
// backend/apps/families/models.py's PatientCompatibilityQuestionnaire
// (field names, choice values, and Persian option labels must match
// that model's TextChoices exactly, since these are saved verbatim
// through AgencyPatientQuestionnaireView). Unlike
// CAREGIVER_QUESTIONNAIRE's generic a/b/c/d options, each field here
// has its own real, differently-worded choice set — reusable scales
// (AgreementScale, IntensityScale, YesNoPartial, AcceptanceScale,
// DisturbanceScale) are still shared across the questions that use
// them, exactly as the model shares them.
export const PATIENT_QUESTIONNAIRE: PatientQuestionnaireQuestion[] = [
  {
    field: "religious_beliefs_priority",
    question: "اهمیت باورهای دینی برای این سالمند در نحوه ارائه مراقبت",
    options: [
      { value: "strongly_agree", text: "کاملاً موافقم" },
      { value: "somewhat_agree", text: "تاحدی موافق" },
      { value: "somewhat_disagree", text: "تاحدی مخالف" },
      { value: "strongly_disagree", text: "کاملاً مخالف" },
    ],
  },
  {
    field: "new_treatment_openness",
    question: "باز بودن این سالمند به پذیرش روش‌های درمانی یا مراقبتی جدید",
    options: [
      { value: "very_high", text: "خیلی زیاد" },
      { value: "moderate", text: "نسبتاً" },
      { value: "low", text: "کم" },
      { value: "none", text: "اصلاً" },
    ],
  },
  {
    field: "caregiver_as_family_member",
    question: "آیا مایل است مراقب مانند یکی از اعضای خانواده با او رفتار کند؟",
    options: [
      { value: "yes", text: "بله" },
      { value: "no", text: "خیر" },
      { value: "partially", text: "تاحدی" },
    ],
  },
  {
    field: "respectful_disagreement_acceptance",
    question: "پذیرش نظرات مخالفِ محترمانه از سوی مراقب",
    options: [
      { value: "fully_accept", text: "کاملاً می‌پذیرم" },
      { value: "mostly_accept", text: "نسبتاً می‌پذیرم" },
      { value: "reluctantly_accept", text: "به سختی می‌پذیرم" },
      { value: "reject", text: "قطعاً رد می‌کنم" },
    ],
  },
  {
    field: "privacy_comfort_with_caregiver",
    question: "احساس راحتی این سالمند در حضور مراقب در فضای خصوصی خانه",
    options: [
      { value: "yes", text: "بله" },
      { value: "no", text: "خیر" },
      { value: "partially", text: "تاحدی" },
    ],
  },
  {
    field: "noise_smell_sensitivity",
    question: "حساسیت این سالمند به صدا و بوهای غیرمعمول",
    options: [
      { value: "very_high", text: "خیلی زیاد" },
      { value: "moderate", text: "نسبتاً" },
      { value: "low", text: "کم" },
      { value: "none", text: "اصلاً" },
    ],
  },
  {
    field: "meal_time_strictness",
    question: "اهمیت رعایت دقیق زمان وعده‌های غذایی",
    options: [
      { value: "very_strict", text: "بسیار مهم است و باید دقیقاً رعایت شود" },
      { value: "moderately_strict", text: "نسبتاً مهم است، کمی تأخیر قابل قبول است" },
      { value: "flexible", text: "چندان مهم نیست، انعطاف‌پذیر است" },
      { value: "not_important", text: "اهمیتی ندارد" },
    ],
  },
  {
    field: "special_diet_preference",
    question: "آیا رژیم غذایی خاصی مورد نیاز یا ترجیح این سالمند است؟",
    options: [
      { value: "yes", text: "بله" },
      { value: "no", text: "خیر" },
      { value: "partially", text: "تاحدی" },
    ],
  },
  {
    field: "medication_timing_priority",
    question: "اهمیت رعایت دقیق زمان‌بندی داروها",
    options: [
      { value: "very_strict", text: "بسیار مهم است و باید دقیقاً رعایت شود" },
      { value: "moderately_strict", text: "نسبتاً مهم است، کمی تأخیر قابل قبول است" },
      { value: "flexible", text: "چندان مهم نیست، انعطاف‌پذیر است" },
      { value: "not_important", text: "اهمیتی ندارد" },
    ],
  },
  {
    field: "accent_customs_annoyance",
    question: "میزان آزردگی این سالمند از لهجه یا رسوم فرهنگی متفاوتِ مراقب",
    options: [
      { value: "not_at_all", text: "اصلاً" },
      { value: "slightly", text: "کمی" },
      { value: "a_lot", text: "زیاد" },
      { value: "very_much", text: "خیلی زیاد" },
    ],
  },
  {
    field: "cultural_respect_expectation",
    question: "آیا این سالمند انتظار دارد فرهنگ و رسوم او از سوی مراقب محترم شمرده شود؟",
    options: [
      { value: "yes", text: "بله" },
      { value: "no", text: "خیر" },
      { value: "partially", text: "تاحدی" },
    ],
  },
  {
    field: "willingness_to_express_opinion",
    question: "میزان آمادگی این سالمند برای بیان نظر و خواسته‌های خود به مراقب",
    options: [
      { value: "very_willing", text: "همیشه نظر خود را بیان می‌کند" },
      { value: "somewhat_willing", text: "بیشتر مواقع نظر خود را می‌گوید" },
      { value: "rarely_willing", text: "به‌ندرت نظر خود را بیان می‌کند" },
      { value: "not_willing", text: "تمایلی به بیان نظر ندارد" },
    ],
  },
]
