import { Button } from "@/components/ui/button"
import { PANEL_URLS } from "@/lib/panel-urls"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <HexIcon className="h-9 w-9 shrink-0 text-primary-strong" />
            <span className="text-base font-bold text-foreground">مراقب من</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#how" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">
              چطور کار می‌کند
            </a>
            <a href="#staff" className="text-sm text-muted-foreground hover:text-foreground">
              کارکنان و تیم
            </a>
            <Button asChild size="sm">
              <a href={PANEL_URLS.family}>شروع کنید</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero — mission-first, not feature-first */}
      <section className="hex-field relative overflow-hidden border-b border-border/70">
        <div className="relative mx-auto max-w-3xl px-4 pb-16 pt-20 text-center sm:px-6 sm:pb-20 sm:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-secondary px-4 py-1.5 text-sm font-medium text-primary-strong">
            یک پلتفرم، سه طرف یک رابطهٔ مراقبت
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.2] text-foreground sm:text-5xl">
            مراقبت از سالمندان، با سازگاری واقعی
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            مراقب من بهترین مراقب را بر اساس سازگاری
            واقعی — نه فقط در دسترس‌بودن — به خانواده پیشنهاد می‌دهد؛ و مسیر مراقبت را از
            اولین معرفی تا گزارش روزانه، شفاف نگه می‌دارد.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <a href={PANEL_URLS.family}>برای عزیزانم مراقب می‌خواهم</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <a href={PANEL_URLS.caregiver}>می‌خواهم مراقب شوم</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Mission — the "why", on a deep contrasting section like Honor's dark bands */}
      <section className="hex-field hex-field--on-deep relative overflow-hidden bg-deep">
        <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
          <p className="text-sm font-semibold uppercase tracking-wide text-deep-muted">
            چرا مراقب من
          </p>
          <h2 className="mt-4 text-2xl font-bold leading-relaxed text-deep-foreground sm:text-3xl">
            جمعیت ایران در حال سالمند شدن است — و بار مراقبت اغلب بی‌سروصدا روی دوش
            یک نفر در خانواده می‌افتد. ما معتقدیم انتخاب مراقب باید آگاهانه باشد، نه
            تصادفی.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-deep-muted">
            مأموریت ما ساختن رابطه‌ای است که هم به سالمند کرامت و استقلال می‌دهد، هم به
            خانواده آرامش خاطر، و هم به مراقب حرفه‌ای، جایگاهی که سزاوار آن است.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">چطور کار می‌کند</h2>
          <p className="mt-3 text-muted-foreground">
            چهار مرحله، از ثبت‌نام تا شروع واقعی مراقبت.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <Step
            number="۱"
            title="ثبت‌نام"
            description="خانواده، مراقب، یا آژانس — هرکدام حساب مخصوص خودش را می‌سازد."
          />
          <Step
            number="۲"
            title="تکمیل پرسشنامه"
            description="سوالات سازگاری فرهنگی و روانی، هم برای مراقب و هم برای سالمند."
          />
          <Step
            number="۳"
            title="پیشنهاد تطبیق"
            description="سیستم گزینه‌های واقعاً سازگار را رتبه‌بندی می‌کند، نه یک لیست تصادفی."
          />
          <Step
            number="۴"
            title="شروع مراقبت"
            description="خانواده روند را دنبال می‌کند؛ مراقب گزارش روزانه ثبت می‌کند."
          />
        </div>
      </section>

      {/* The choice — actual entry point of the whole platform */}
      <section className="border-y border-border/70 bg-muted/60">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              مسیر ورود خود را انتخاب کنید
            </h2>
            <p className="mt-3 text-muted-foreground">
              خانواده، مراقب، یا آژانس — هرکدام حساب مخصوص خودش را می‌سازد و مسیر متفاوتی دارد.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <ChoiceCard
              question="نیاز به مراقب دارید؟"
              description="برای پدر، مادر، یا یکی از عزیزانتان به‌دنبال مراقب مناسب می‌گردید."
              cta="ثبت‌نام / ورود خانواده"
              href={PANEL_URLS.family}
            />
            <ChoiceCard
              question="مراقب هستید؟"
              description="می‌خواهید به‌عنوان مراقب سالمند در پلتفرم ثبت‌نام کنید و کار پیدا کنید."
              cta="ثبت‌نام / ورود مراقبان"
              href={PANEL_URLS.caregiver}
            />
            <ChoiceCard
              question="صاحب یا مدیر یک آژانس مراقبتی هستید؟"
              description="آژانس شما مراقب و سالمند دارد و می‌خواهید از تطبیق هوشمند استفاده کنید."
              cta="ورود آژانس‌ها"
              href={PANEL_URLS.agency}
            />
            <ChoiceCard
              question="سوپروایزر یا کارمند یک آژانس هستید؟"
              description="از طرف آژانس خود، اطلاعات مراقب و سالمند را ثبت می‌کنید."
              cta="ورود سوپروایزر آژانس"
              href={PANEL_URLS.agency}
            />
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            سالمند یا بیمار هستید و خودتان حساب مستقل می‌خواهید؟{" "}
            <a href={PANEL_URLS.patient} className="font-medium text-primary-strong hover:underline">
              از اینجا وارد شوید
            </a>
          </p>
        </div>
      </section>

      {/* Staff / internal links — deliberately understated, not a marketing section */}
      <section id="staff" className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h3 className="text-center text-sm font-semibold text-muted-foreground">
          ورود کارکنان و تیم مراقب من
        </h3>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <a href={PANEL_URLS.supervisor} className="text-primary-strong hover:underline">پنل ناظر پلتفرم</a>
          <a href={PANEL_URLS.admin} className="text-primary-strong hover:underline">پنل ادمین</a>
          {/* <a href={PANEL_URLS.superuser} className="text-primary-strong hover:underline">پنل سوپریوزر</a> */}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-deep-border bg-deep">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <HexIcon className="h-7 w-7 text-deep-foreground/80" />
              <span className="text-sm font-semibold text-deep-foreground">مراقب من</span>
            </div>
            <p className="text-sm text-deep-muted">
              پلتفرم تطبیق مراقب و سالمند — بر پایهٔ سازگاری واقعی
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function HexIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 46" fill="none" className={className} aria-hidden="true">
      <path
        d="M20 1 38 12v22L20 45 2 34V12Z"
        fill="currentColor"
        fillOpacity="0.14"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  )
}

function ChoiceCard({
  question, description, cta, href,
}: { question: string; description: string; cta: string; href: string }) {
  return (
    <a href={href} className="group block">
      <div className="flex h-full flex-col items-center gap-3 rounded-2xl border border-border bg-card p-8 text-center shadow-sm transition duration-200 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-lg group-hover:shadow-primary/10">
        <HexIcon className="h-12 w-12 text-primary-strong" />
        <h3 className="font-bold text-foreground">{question}</h3>
        <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        <Button variant="outline" className="w-full">
          {cta}
        </Button>
      </div>
    </a>
  )
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center">
        <svg viewBox="0 0 40 46" fill="none" className="absolute inset-0 h-full w-full text-primary-strong" aria-hidden="true">
          <path d="M20 1 38 12v22L20 45 2 34V12Z" fill="currentColor" />
        </svg>
        <span className="relative text-base font-bold text-primary-foreground">{number}</span>
      </div>
      <h4 className="font-semibold text-foreground">{title}</h4>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  )
}
