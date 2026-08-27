import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PANEL_URLS } from "@/lib/panel-urls"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/60 via-background to-background">
      {/* Header */}
      <header className="border-b border-pink-100 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌸</span>
            <span className="text-base font-bold text-rose-900">مراقب من</span>
          </div>
          <a href="#staff" className="text-sm text-muted-foreground hover:text-rose-700 hover:underline">
            کارکنان و تیم مراقب من
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-pink-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-2xl px-4 pt-14 pb-6 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-300 to-rose-400 text-3xl shadow-lg shadow-pink-300/40">
            🌸
          </div>
          <h1 className="text-3xl font-bold text-rose-950 sm:text-4xl">
            تطبیق هوشمند مراقب و سالمند
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
            به‌جای انتخاب دستی از روی یک لیست، سیستم تطبیق «مراقب من» بهترین مراقبان را
            بر اساس سازگاری واقعی پیشنهاد می‌دهد.
          </p>
        </div>
      </section>

      {/* The choice — this is the actual entry point of the whole page */}
      <section className="mx-auto max-w-4xl px-4 pb-6">
        <h2 className="mb-6 text-center text-xl font-bold text-rose-950">
          کدام یک از این‌هایید؟
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ChoiceCard
            icon="🧓"
            question="نیاز به مراقب دارید؟"
            description="برای پدر، مادر، یا یکی از عزیزانتان به دنبال مراقب مناسب می‌گردید."
            cta="ثبت‌نام / ورود خانواده"
            href={PANEL_URLS.family}
          />
          <ChoiceCard
            icon="👩‍⚕️"
            question="مراقب هستید؟"
            description="می‌خواهید به‌عنوان مراقب سالمند در پلتفرم ثبت‌نام کنید و کار پیدا کنید."
            cta="ثبت‌نام / ورود مراقبان"
            href={PANEL_URLS.caregiver}
          />
          <ChoiceCard
            icon="🏢"
            question="صاحب یا مدیر یک آژانس مراقبتی هستید؟"
            description="آژانس شما مراقب و سالمند دارد و می‌خواهید از تطبیق هوشمند استفاده کنید."
            cta="ورود آژانس‌ها"
            href={PANEL_URLS.agency}
          />
          <ChoiceCard
            icon="🧑‍💼"
            question="سوپروایزر یا کارمند یک آژانس هستید؟"
            description="از طرف آژانس خود، اطلاعات مراقب و سالمند را ثبت می‌کنید."
            cta="ورود سوپروایزر آژانس"
            href={PANEL_URLS.agency}
          />
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          سالمند یا بیمار هستید و خودتان حساب مستقل می‌خواهید؟{" "}
          <a href={PANEL_URLS.patient} className="font-medium text-rose-700 hover:underline">
            از اینجا وارد شوید
          </a>
        </p>
      </section>

      {/* How it works */}
      <section className="border-t border-pink-100 bg-pink-50/40">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <h2 className="text-center text-2xl font-bold text-rose-950">چطور کار می‌کند؟</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-4">
            <Step number="۱" title="ثبت‌نام" description="خانواده، مراقب، یا آژانس — هرکدام حساب مخصوص خودش را می‌سازد." />
            <Step number="۲" title="تکمیل پرسشنامه" description="سوالات سازگاری فرهنگی و روانی، برای مراقب و سالمند." />
            <Step number="۳" title="پیشنهاد تطبیق" description="سیستم گزینه‌های واقعاً سازگار را رتبه‌بندی می‌کند، نه یک لیست تصادفی." />
            <Step number="۴" title="شروع مراقبت" description="خانواده روند مراقبت را دنبال می‌کند؛ مراقب گزارش ثبت می‌کند." />
          </div>
        </div>
      </section>

      {/* Staff / internal links — deliberately understated, not a marketing section */}
      <section id="staff" className="mx-auto max-w-3xl px-4 py-12">
        <h3 className="text-center text-sm font-semibold text-muted-foreground">
          ورود کارکنان و تیم مراقب من
        </h3>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <a href={PANEL_URLS.supervisor} className="text-rose-700 hover:underline">پنل ناظر پلتفرم</a>
          <a href={PANEL_URLS.admin} className="text-rose-700 hover:underline">پنل ادمین</a>
          <a href={PANEL_URLS.superuser} className="text-rose-700 hover:underline">پنل سوپریوزر</a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-pink-100">
        <div className="mx-auto max-w-5xl px-4 py-8 text-center text-sm text-muted-foreground">
          مراقب من — پلتفرم تطبیق مراقب و سالمند
        </div>
      </footer>
    </div>
  )
}

function ChoiceCard({
  icon, question, description, cta, href,
}: { icon: string; question: string; description: string; cta: string; href: string }) {
  return (
    <a href={href} className="block">
      <Card className="h-full border-pink-100 transition hover:-translate-y-0.5 hover:border-pink-300 hover:shadow-lg hover:shadow-pink-100">
        <CardContent className="flex h-full flex-col items-center gap-3 p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-200 to-rose-300 text-2xl">
            {icon}
          </div>
          <h3 className="font-bold text-rose-950">{question}</h3>
          <p className="flex-1 text-sm text-muted-foreground">{description}</p>
          <Button variant="outline" className="w-full border-pink-200 text-rose-700 hover:bg-pink-50">
            {cta}
          </Button>
        </CardContent>
      </Card>
    </a>
  )
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-300 to-rose-400 text-sm font-bold text-white shadow-md shadow-pink-300/40">
        {number}
      </div>
      <h4 className="font-semibold text-rose-950">{title}</h4>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
