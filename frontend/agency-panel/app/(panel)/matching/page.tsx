"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Search, Sparkles, Star, AlertTriangle, ChevronLeft,
  ThumbsUp, ThumbsDown, GitMerge, HeartHandshake,
} from "lucide-react"
import { useAuth } from "@/hooks/useauth"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { agencyService } from "@/services/agency.service"
import { agencyManagementService } from "@/services/agency_management.service"
import { cn } from "@/lib/utils"
import type { AgencyPatient, AgencyCaregiverSuggestion, AgencySuggestionsResponse } from "@/types/agency_management"

const STAGE_LABEL: Record<string, string> = {
  registration: "ثبت‌نام ورود",
  phone_coordination: "هماهنگی تلفنی",
  dispatched: "اعزام",
  caregiver_confirmed: "تایید پرستار",
  first_week_followup: "هفته اول: پیگیری اولیه",
  contract_confirmed: "قرارداد بسته و تایید شده",
  expired: "منقضی‌ها",
}

// Stages before a caregiver has actually been sent out — this is the
// window where matching is the whole point of the card, so these are
// the ones surfaced first / counted by the "نیاز به تطبیق" filter.
const NEEDS_MATCH_STAGES = new Set(["registration", "phone_coordination"])

const CONFIDENCE_LABEL: Record<string, string> = { high: "اطمینان بالا", medium: "اطمینان متوسط", low: "اطمینان پایین" }
const CONFIDENCE_DOT: Record<string, string> = { high: "bg-emerald-500", medium: "bg-amber-500", low: "bg-slate-400" }
const CONFIDENCE_BADGE: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-800 border-emerald-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
}

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return null
  const pct = Math.max(0, Math.min(100, score))
  const barColor = pct >= 85 ? "bg-emerald-500" : pct >= 70 ? "bg-primary-strong" : pct >= 50 ? "bg-amber-500" : "bg-slate-400"
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full", barColor)} style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-[11px] font-bold text-slate-600" dir="ltr">{pct}</span>
    </div>
  )
}

function SuggestionCard({ suggestion, rank }: { suggestion: AgencyCaregiverSuggestion; rank: number }) {
  const isTopPick = rank === 0
  return (
    <Card
      className={cn(
        "overflow-hidden transition-shadow hover:shadow-md",
        isTopPick ? "border-primary-strong/40 ring-1 ring-primary-strong/20" : "border-border"
      )}
    >
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {isTopPick && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary-strong px-2 py-0.5 text-[10px] font-bold text-white">
                  <Star className="h-3 w-3 fill-current" /> بهترین تطبیق
                </span>
              )}
              <p className="truncate text-sm font-bold text-foreground">{suggestion.caregiver_name}</p>
            </div>
            {suggestion.avg_rating !== null && (
              <div className="mt-0.5 flex items-center gap-0.5 text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn("h-3 w-3", i < Math.round(suggestion.avg_rating!) ? "fill-current" : "fill-none stroke-current opacity-30")} />
                ))}
                <span className="mr-1 text-[11px] text-muted-foreground" dir="ltr">{suggestion.avg_rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium", CONFIDENCE_BADGE[suggestion.match_confidence])}>
            <span className={cn("mr-1 inline-block h-1.5 w-1.5 rounded-full", CONFIDENCE_DOT[suggestion.match_confidence])} />
            {CONFIDENCE_LABEL[suggestion.match_confidence]}
          </span>
        </div>

        <ScoreBar score={suggestion.mcdm_score} />

        <p className="text-sm text-foreground/90">{suggestion.explanation.summary}</p>

        {(suggestion.explanation.strengths.length > 0 || suggestion.explanation.weaknesses.length > 0) && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {suggestion.explanation.strengths.length > 0 && (
              <div className="space-y-1 rounded-lg bg-emerald-50 p-2">
                {suggestion.explanation.strengths.map((point, i) => (
                  <p key={i} className="flex items-start gap-1.5 text-[11px] text-emerald-800">
                    <ThumbsUp className="mt-0.5 h-3 w-3 shrink-0" /> {point}
                  </p>
                ))}
              </div>
            )}
            {suggestion.explanation.weaknesses.length > 0 && (
              <div className="space-y-1 rounded-lg bg-amber-50 p-2">
                {suggestion.explanation.weaknesses.map((point, i) => (
                  <p key={i} className="flex items-start gap-1.5 text-[11px] text-amber-800">
                    <ThumbsDown className="mt-0.5 h-3 w-3 shrink-0" /> {point}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PatientListItem({ patient, selected, onClick }: {
  patient: AgencyPatient
  selected: boolean
  onClick: () => void
}) {
  const needsMatch = NEEDS_MATCH_STAGES.has(patient.pipeline_status)
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border p-3 text-right transition-colors",
        selected ? "border-primary-strong bg-primary/10" : "border-transparent hover:bg-muted"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-foreground">{patient.full_name}</p>
        {patient.is_urgent && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />}
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        <Badge variant={needsMatch ? "default" : "secondary"} className="px-1.5 py-0 text-[10px]">
          {STAGE_LABEL[patient.pipeline_status] || patient.pipeline_status}
        </Badge>
      </div>
    </button>
  )
}

export default function MatchingPage() {
  const { user, loading: authLoading } = useAuth(["agency", "agency_supervisor", "agency_admin"])

  const [agencyId, setAgencyId] = useState<number | null>(null)
  const [patients, setPatients] = useState<AgencyPatient[]>([])
  const [loadingPatients, setLoadingPatients] = useState(true)

  const [search, setSearch] = useState("")
  const [onlyNeedsMatch, setOnlyNeedsMatch] = useState(true)

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [suggestionsCache, setSuggestionsCache] = useState<Record<number, AgencySuggestionsResponse>>({})
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [suggestionError, setSuggestionError] = useState("")

  useEffect(() => {
    if (!user) return
    agencyService.me().then((profile) => {
      setAgencyId(profile.id)
      return agencyManagementService.listPatients(profile.id)
    }).then(setPatients).finally(() => setLoadingPatients(false))
  }, [user])

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      if (onlyNeedsMatch && !NEEDS_MATCH_STAGES.has(p.pipeline_status)) return false
      if (search.trim() && !p.full_name.toLowerCase().includes(search.trim().toLowerCase())) return false
      return true
    })
  }, [patients, search, onlyNeedsMatch])

  const needsMatchCount = useMemo(() => patients.filter((p) => NEEDS_MATCH_STAGES.has(p.pipeline_status)).length, [patients])

  function selectPatient(patient: AgencyPatient) {
    setSelectedId(patient.id)
    setSuggestionError("")
    if (agencyId === null || suggestionsCache[patient.id]) return
    setLoadingSuggestions(true)
    agencyManagementService.suggestCaregivers(agencyId, patient.id)
      .then((data) => setSuggestionsCache((prev) => ({ ...prev, [patient.id]: data })))
      .catch((err) => setSuggestionError(err?.response?.data?.detail || "دریافت پیشنهادها با خطا مواجه شد."))
      .finally(() => setLoadingSuggestions(false))
  }

  if (authLoading || !user) return null

  const selectedPatient = patients.find((p) => p.id === selectedId) || null
  const selectedSuggestions = selectedId !== null ? suggestionsCache[selectedId] : undefined

  return (
    <div className="flex h-full flex-col p-4 sm:p-6">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-foreground">فرآیند تطبیق</h1>
        <p className="text-xs text-muted-foreground">پیشنهاد بهترین مراقب برای هر خدمت‌گیرنده، بر اساس استخر مراقبان همین آژانس</p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        {/* Patient list */}
        <Card className="flex min-h-0 flex-col overflow-hidden lg:order-2">
          <div className="space-y-2 border-b border-border p-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جست‌وجوی خدمت‌گیرنده..."
                className="pr-9"
              />
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setOnlyNeedsMatch(true)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  onlyNeedsMatch ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
                )}
              >
                نیاز به تطبیق ({needsMatchCount})
              </button>
              <button
                onClick={() => setOnlyNeedsMatch(false)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  !onlyNeedsMatch ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
                )}
              >
                همه ({patients.length})
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {loadingPatients ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)
            ) : filteredPatients.length === 0 ? (
              <p className="p-4 text-center text-xs text-muted-foreground">
                {onlyNeedsMatch ? "همه‌ی خدمت‌گیرنده‌ها مراقب گرفته‌اند 🎉" : "خدمت‌گیرنده‌ای یافت نشد."}
              </p>
            ) : (
              filteredPatients.map((p) => (
                <PatientListItem key={p.id} patient={p} selected={p.id === selectedId} onClick={() => selectPatient(p)} />
              ))
            )}
          </div>
        </Card>

        {/* Suggestions detail */}
        <Card className="flex min-h-0 flex-col overflow-hidden lg:order-1">
          {!selectedPatient ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
              <GitMerge className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-foreground">یک خدمت‌گیرنده را از فهرست انتخاب کنید</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                پیشنهادهای مراقب — رتبه‌بندی‌شده بر اساس تطبیق ویژگی‌ها، امتیاز عینی و سابقهٔ عملکرد — همین‌جا نمایش داده می‌شود.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-border p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-primary-strong">
                    <HeartHandshake className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{selectedPatient.full_name}</p>
                    <p className="text-[11px] text-muted-foreground">{STAGE_LABEL[selectedPatient.pipeline_status]}</p>
                  </div>
                </div>
                {selectedSuggestions && (
                  <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                    <Sparkles className="h-3 w-3" /> {selectedSuggestions.suggestions.length} پیشنهاد
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {loadingSuggestions ? (
                  <>
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-32 rounded-xl" />
                  </>
                ) : suggestionError ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{suggestionError}</div>
                ) : !selectedSuggestions || selectedSuggestions.suggestions.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 p-8 text-center">
                    <ChevronLeft className="h-6 w-6 rotate-90 text-slate-300" />
                    <p className="text-sm text-muted-foreground">
                      هیچ مراقب مناسبی در استخر این آژانس یافت نشد — ابتدا مراقب به آژانس اضافه کنید.
                    </p>
                  </div>
                ) : (
                  selectedSuggestions.suggestions.map((s, i) => (
                    <SuggestionCard key={s.caregiver_user_id} suggestion={s} rank={i} />
                  ))
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
