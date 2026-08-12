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
          <a href={PANEL_URLS.supervisor} className="text-sm text-muted-foreground hover:text-rose-700 hover:underline">
            ورود ناظران و کارکنان
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-pink-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 top-40 h-56 w-56 rounded-full bg-emerald-100/50 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-300 to-rose-400 text-3xl shadow-lg shadow-pink-300/40">
            🌸
          </div>
          <h1 className="text-3xl font-bold text-rose-950 sm:text-4xl">مراقبت از سالمندان، در کنار خانواده</h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            خانواده و بیمار هرکدام حساب مستقل خود را دارند و با یک کد امن به هم متصل می‌شوند.
            مراقبان حرفه‌ای گزارش مراقبت ثبت می‌کنند و همه اعضای خانواده — نه فقط یک نفر — می‌توانند
            وضعیت و روند مراقبت را ببینند.
          </p>
        </div>
      </section>

      {/* Who is this for */}
      <section className="mx-auto max-w-5xl px-4 pb-16">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <RoleCard
            icon="👪"
            title="برای خانواده"
            description="اطلاعات سالمند خود را ثبت کنید، پرسشنامه سازگاری را تکمیل کنید، و با کد بیمار به سایر اعضای خانواده اجازه دسترسی بدهید."
            cta="ورود / ثبت‌نام خانواده"
            href={PANEL_URLS.family}
          />
          <RoleCard
            icon="🧓"
            title="برای بیمار / سالمند"
            description="حساب و پروفایل شخصی خود را داشته باشید، کد اختصاصی خود را با فرزندانتان به اشتراک بگذارید، و ببینید چه کسی به اطلاعات شما دسترسی دارد."
            cta="ورود / ثبت‌نام بیمار"
            href={PANEL_URLS.patient}
          />
          <RoleCard
            icon="👩‍⚕️"
            title="برای مراقبان"
            description="بیماران تحت مراقبت خود را ببینید و گزارش‌های مراقبت (دارو، تغذیه، علائم حیاتی و...) را برای خانواده ثبت کنید."
            cta="ورود مراقبان"
            href={PANEL_URLS.caregiver}
          />
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-pink-100 bg-pink-50/40">
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h2 className="text-center text-2xl font-bold text-rose-950">چطور کار می‌کند؟</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <Step number="۱" title="ثبت‌نام با شماره موبایل" description="بدون نیاز به نام کاربری یا رمز عبور — فقط شماره موبایل و یک کد پیامکی." />
            <Step number="۲" title="اتصال با کد" description="هر بیمار و هر عضو خانواده کد اختصاصی خود را دارد — با یک کد، همه اعضا به‌طور برابر به وضعیت بیمار دسترسی دارند." />
            <Step number="۳" title="پیگیری روند مراقبت" description="گزارش‌های مراقبان، وضعیت فعلی، و تاریخچه کامل در یک جا در دسترس همه اعضای مجاز خانواده است." />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-pink-100">
        <div className="mx-auto max-w-5xl px-4 py-8 text-center text-sm text-muted-foreground">
          مراقب من — پلتفرم مراقبت خانوادگی از سالمندان
        </div>
      </footer>
    </div>
  )
}

function RoleCard({
  icon, title, description, cta, href,
}: { icon: string; title: string; description: string; cta: string; href: string }) {
  return (
    <Card className="border-pink-100 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-pink-100">
      <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-200 to-rose-300 text-2xl">
          {icon}
        </div>
        <h3 className="font-bold text-rose-950">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
        <a href={href} className="w-full">
          <Button className="w-full bg-gradient-to-l from-pink-400 to-rose-400 shadow-md shadow-pink-200/50 hover:from-pink-500 hover:to-rose-500">
            {cta}
          </Button>
        </a>
      </CardContent>
    </Card>
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
