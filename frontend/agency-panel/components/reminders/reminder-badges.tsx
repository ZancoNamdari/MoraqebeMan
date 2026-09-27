import { BellRing } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ActiveReminder } from "@/types/reminders"

const REMINDER_COLOR_CLASS: Record<string, string> = {
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-blue-100 text-blue-700",
}

/**
 * Renders whatever `active_reminders` a card's own serializer sent
 * along — same shape everywhere (patients, caregiver candidates,
 * خدمات مقطعی), since they all come from the one shared
 * apps.reminders engine on the backend. Nothing to configure here;
 * the agency-configurable part lives in Settings → یادآوری‌ها.
 */
export function ReminderBadges({ reminders }: { reminders?: ActiveReminder[] }) {
  if (!reminders || reminders.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {reminders.map((r, i) => (
        <span
          key={i}
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
            REMINDER_COLOR_CLASS[r.color] || REMINDER_COLOR_CLASS.red,
          )}
        >
          <BellRing className="h-2.5 w-2.5" /> {r.label} ({r.days_elapsed} روز)
        </span>
      ))}
    </div>
  )
}
