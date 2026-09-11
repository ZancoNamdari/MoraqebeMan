import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PANEL_URLS } from "@/lib/panel-urls"
import { ARTICLES } from "@/lib/articles-data"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">

          <a href="/" className="flex items-center gap-2.5">
            <HexIcon className="h-9 w-9 shrink-0 text-primary-strong" />
            <span className="text-base font-bold text-foreground">
              مراقب من
            </span>
          </a>

          <nav className="flex items-center gap-5">
            <a
              href="#how"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              چطور کار می‌کند
            </a>

            <a
              href="#roles"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground md:inline"
            >
              برای چه کسانی؟
            </a>

            <a
              href="#articles"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground lg:inline"
            >
              مطالب
            </a>

            <Button asChild size="sm">
              <a href={PANEL_URLS.family}>شروع کنید</a>
            </Button>
          </nav>

        </div>
      </header>


      {/* Hero */}
      <section className="hex-field relative overflow-hidden border-b border-border/70">
        <div className="relative mx-auto max-w-4xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pb-24 sm:pt-28">

          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-secondary px-4 py-1.5 text-sm font-medium text-primary-strong">
            <HexDot />
            انتخابی آگاهانه برای یک همراهی بهتر
          </div>

          <h1 className="mx-auto mt-7 max-w-3xl text-4xl font-extrabold leading-[1.25] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            مراقبت از سالمندان،
            <br />
            با سازگاری واقعی
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
            مراقب من کمک می‌کند مراقبی متناسب با نیازها، ویژگی‌ها و
            سبک زندگی سالمند پیدا کنید؛ تا مراقبت فقط یک خدمت نباشد،
            بلکه یک همراهی درست و انسانی باشد.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <a href={PANEL_URLS.family}>
                برای عزیزانم مراقب می‌خواهم
              </a>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
            >
              <a href={PANEL_URLS.caregiver}>
                می‌خواهم مراقب شوم
              </a>
            </Button>
          </div>

          <p className="mt-5 text-xs text-muted-foreground">
            برای خانواده‌ها، سالمندان، مراقبان و مجموعه‌های مراقبتی
          </p>

        </div>
      </section>


      {/* Mission */}
      <section className="hex-field hex-field--on-deep relative overflow-hidden bg-deep">
        <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-24">

          <p className="text-sm font-semibold text-deep-muted">
            چرا مراقب من؟
          </p>

          <h2 className="mt-4 text-2xl font-bold leading-[1.7] text-deep-foreground sm:text-3xl">
            مراقبت خوب فقط به پیدا کردن یک مراقب ختم نمی‌شود؛
            به ساختن یک رابطه درست بستگی دارد.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-deep-muted">
            ما باور داریم سالمند باید احساس امنیت، احترام و استقلال داشته باشد
            و خانواده بتواند با خیال راحت مسیر مراقبت را دنبال کند.
            برای همین، انتخاب مراقب را بر اساس سازگاری واقعی طراحی کرده‌ایم.
          </p>

        </div>
      </section>


      {/* How it works */}
      <section
        id="how"
        className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28"
      >
        <div className="mx-auto max-w-2xl text-center">

          <span className="text-sm font-semibold text-primary-strong">
            ساده و شفاف
          </span>

          <h2 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">
            چطور کار می‌کند؟
          </h2>

          <p className="mt-3 leading-7 text-muted-foreground">
            از معرفی نیازهای شما تا شروع مراقبت، مسیر را قدم‌به‌قدم همراهتان هستیم.
          </p>

        </div>

        <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">

          <Step
            number="۱"
            title="نیازهایتان را بگویید"
            description="نیازها، شرایط و ویژگی‌های سالمند را مشخص می‌کنید."
          />

          <Step
            number="۲"
            title="پرسشنامه سازگاری"
            description="ویژگی‌های سالمند و مراقبان بررسی می‌شود تا تناسب واقعی مشخص شود."
          />

          <Step
            number="۳"
            title="مراقب مناسب را ببینید"
            description="گزینه‌های مناسب بر اساس میزان سازگاری مرتب می‌شوند."
          />

          <Step
            number="۴"
            title="مراقبت را شروع کنید"
            description="پس از انتخاب، مسیر مراقبت را دنبال می‌کنید و گزارش‌ها را در اختیار دارید."
          />

        </div>
      </section>


      {/* Compatibility */}
      <section className="border-y border-border/70 bg-muted/50">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-12 px-4 py-20 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center">

          <div>
            <span className="text-sm font-semibold text-primary-strong">
              تفاوت مراقب من
            </span>

            <h2 className="mt-3 text-2xl font-bold leading-relaxed text-foreground sm:text-3xl">
              فقط به دنبال «مراقب موجود» نیستیم؛
              دنبال «مراقب مناسب» هستیم.
            </h2>

            <p className="mt-5 leading-8 text-muted-foreground">
              تجربه مراقبت زمانی بهتر می‌شود که شخصیت، عادت‌ها، نیازها
              و شرایط سالمند در کنار مهارت‌های مراقب دیده شوند.
              سیستم تطبیق مراقب من این ویژگی‌ها را در کنار هم بررسی می‌کند
              تا انتخاب، آگاهانه‌تر و متناسب‌تر باشد.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">

            <FeatureCard
              title="شخصیت"
              description="ویژگی‌های فردی و سبک ارتباط"
            />

            <FeatureCard
              title="نیازها"
              description="شرایط و نیازهای مراقبتی سالمند"
            />

            <FeatureCard
              title="سبک زندگی"
              description="عادت‌ها، علایق و ترجیحات"
            />

            <FeatureCard
              title="مهارت"
              description="توانایی و تجربه مراقب"
            />

          </div>

        </div>
      </section>


      {/* Roles */}
      <section
        id="roles"
        className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28"
      >
        <div className="mx-auto max-w-2xl text-center">

          <span className="text-sm font-semibold text-primary-strong">
            یک پلتفرم، مسیرهای متفاوت
          </span>

          <h2 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">
            شما با چه نقشی وارد مراقب من می‌شوید؟
          </h2>

          <p className="mt-3 leading-7 text-muted-foreground">
            هر فرد مسیر مخصوص خودش را دارد.
          </p>

        </div>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2">

          <ChoiceCard
            icon="family"
            question="نیاز به مراقب دارید؟"
            description="برای پدر، مادر یا یکی از عزیزانتان به دنبال مراقب مناسب هستید."
            cta="ورود خانواده"
            href={PANEL_URLS.family}
          />

          <ChoiceCard
            icon="caregiver"
            question="مراقب هستید؟"
            description="به‌عنوان مراقب سالمند به خانواده‌ها و مجموعه‌های مراقبتی بپیوندید."
            cta="ورود مراقبان"
            href={PANEL_URLS.caregiver}
          />

          <ChoiceCard
            icon="agency"
            question="مجموعه یا آژانس مراقبتی دارید؟"
            description="مراقبان و مراجعان خود را مدیریت کنید و فرآیند مراقبت را یکپارچه‌تر کنید."
            cta="ورود آژانس‌ها"
            href={PANEL_URLS.agency}
          />

          <ChoiceCard
            icon="supervisor"
            question="از طرف یک آژانس فعالیت می‌کنید؟"
            description="اطلاعات سالمندان و مراقبان را ثبت و فرآیندهای مراقبتی را مدیریت کنید."
            cta="ورود کارکنان آژانس"
            href={PANEL_URLS.supervisor}
          />

        </div>

        <p className="mt-7 text-center text-sm text-muted-foreground">
          سالمند یا بیمار هستید و حساب مستقل می‌خواهید؟{" "}
          <a
            href={PANEL_URLS.patient}
            className="font-medium text-primary-strong hover:underline"
          >
            ورود به حساب شخصی
          </a>
        </p>

      </section>


      {/* Articles — now linking to real, full article pages */}
      <section
        id="articles"
        className="border-t border-border/70 bg-muted/40"
      >
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">

          <div className="mx-auto max-w-2xl text-center">

            <span className="text-sm font-semibold text-primary-strong">
              از مراقبت بیشتر بدانید
            </span>

            <h2 className="mt-3 text-2xl font-bold text-foreground sm:text-3xl">
              دیدگاه و مطالب مراقب من
            </h2>

            <p className="mt-3 leading-7 text-muted-foreground">
              مطالبی درباره سالمندی، مراقبت، انتخاب مراقب و تجربه خانواده‌ها.
            </p>

          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {ARTICLES.map((article) => (
              <ArticleCard
                key={article.slug}
                slug={article.slug}
                title={article.title}
                accentFrom={article.accentFrom}
                accentTo={article.accentTo}
              />
            ))}
          </div>

        </div>
      </section>


      {/* Footer */}
      <footer className="border-t border-deep-border bg-deep">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">

          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">

            {/* Brand */}
            <div>
              <a href="/" className="flex items-center gap-2.5">
                <HexIcon className="h-8 w-8 text-deep-foreground/80" />
                <span className="text-base font-semibold text-deep-foreground">مراقب من</span>
              </a>
              <p className="mt-4 text-sm leading-7 text-deep-muted">
                همراهی هماهنگ با شخصیت شما — انتخاب هوشمند مراقب، بر پایهٔ سازگاری واقعی.
              </p>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="text-sm font-semibold text-deep-foreground">دسترسی سریع</h4>
              <div className="mt-4 flex flex-col gap-2.5 text-sm text-deep-muted">
                <a href="#how" className="transition-colors hover:text-deep-foreground">چطور کار می‌کند</a>
                <a href="#roles" className="transition-colors hover:text-deep-foreground">برای چه کسانی؟</a>
                <a href="#articles" className="transition-colors hover:text-deep-foreground">مطالب</a>
              </div>
            </div>

            {/* Staff access */}
            <div>
              <h4 className="text-sm font-semibold text-deep-foreground">کارکنان و تیم</h4>
              <div className="mt-4 flex flex-col gap-2.5 text-sm text-deep-muted">
                <a href={PANEL_URLS.supervisor} className="transition-colors hover:text-deep-foreground">پنل ناظر پلتفرم</a>
                <a href={PANEL_URLS.admin} className="transition-colors hover:text-deep-foreground">پنل ادمین</a>
                <a href={PANEL_URLS.agency} className="transition-colors hover:text-deep-foreground">ورود آژانس‌ها</a>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-sm font-semibold text-deep-foreground">تماس با ما</h4>
              <div className="mt-4 flex flex-col gap-2.5 text-sm text-deep-muted">
                <p>
                  <span className="text-deep-foreground/70">تلفن دفتر: </span>
                  <a href="tel:02166178697" dir="ltr" className="transition-colors hover:text-deep-foreground">
                    021-66178697
                  </a>
                </p>
                <p className="leading-7">
                  <span className="text-deep-foreground/70">آدرس: </span>
                  تهران، جنب مترو نواب، خیابان آذربایجان (غربی)، پلاک ۵۷۶
                </p>
                <p>
                  <span className="text-deep-foreground/70">تماس با مدیرعامل: </span>
                  <a href="tel:09031695391" dir="ltr" className="transition-colors hover:text-deep-foreground">
                    0903-1695391
                  </a>
                </p>
                <p>
                  <span className="text-deep-foreground/70">ایمیل مدیرعامل: </span>
                  <a
                    href="mailto:elhamesmaili@ma.iut.ac.ir"
                    dir="ltr"
                    className="break-all transition-colors hover:text-deep-foreground"
                  >
                    elhamesmaili@ma.iut.ac.ir
                  </a>
                </p>
              </div>
            </div>

          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-deep-border pt-6 text-xs text-deep-muted sm:flex-row">
            <p>© {new Date().getFullYear()} مراقب من. تمامی حقوق محفوظ است.</p>
            <p>ساخته‌شده با دقت، برای مراقبتی که ارزشش را دارد.</p>
          </div>

        </div>
      </footer>

    </div>
  )
}


/* -------------------------------------------------------------------------- */
/* Icons */
/* -------------------------------------------------------------------------- */

function HexIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 46"
      fill="none"
      className={className}
      aria-hidden="true"
    >
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


function HexDot() {
  return (
    <span
      className="h-1.5 w-1.5 rounded-full bg-primary-strong"
      aria-hidden="true"
    />
  )
}


/* -------------------------------------------------------------------------- */
/* Step */
/* -------------------------------------------------------------------------- */

function Step({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="text-center">

      <div className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center">

        <svg
          viewBox="0 0 40 46"
          fill="none"
          className="absolute inset-0 h-full w-full text-primary-strong"
          aria-hidden="true"
        >
          <path
            d="M20 1 38 12v22L20 45 2 34V12Z"
            fill="currentColor"
          />
        </svg>

        <span className="relative text-base font-bold text-primary-foreground">
          {number}
        </span>

      </div>

      <h4 className="font-semibold text-foreground">
        {title}
      </h4>

      <p className="mt-2 text-sm leading-7 text-muted-foreground">
        {description}
      </p>

    </div>
  )
}


/* -------------------------------------------------------------------------- */
/* Feature Card */
/* -------------------------------------------------------------------------- */

function FeatureCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 h-2 w-8 rounded-full bg-primary/30" />

      <h3 className="font-bold text-foreground">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  )
}


/* -------------------------------------------------------------------------- */
/* Choice Card */
/* -------------------------------------------------------------------------- */

function ChoiceCard({
  icon,
  question,
  description,
  cta,
  href,
}: {
  icon: "family" | "caregiver" | "agency" | "supervisor"
  question: string
  description: string
  cta: string
  href: string
}) {
  return (
    <a href={href} className="group block">

      <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-7 text-center shadow-sm transition duration-200 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-lg group-hover:shadow-primary/10 sm:p-8">

        <RoleIcon type={icon} />

        <h3 className="mt-5 font-bold text-foreground">
          {question}
        </h3>

        <p className="mt-3 flex-1 text-sm leading-7 text-muted-foreground">
          {description}
        </p>

        <span className="mt-6 inline-flex w-full items-center justify-center rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary-strong">
          {cta}
        </span>

      </div>

    </a>
  )
}


/* -------------------------------------------------------------------------- */
/* Role Icon */
/* -------------------------------------------------------------------------- */

function RoleIcon({
  type,
}: {
  type: "family" | "caregiver" | "agency" | "supervisor"
}) {
  const labels = {
    family: "خانواده",
    caregiver: "مراقب",
    agency: "آژانس",
    supervisor: "کارمند آژانس",
  }

  return (
    <div
      className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary-strong"
      aria-label={labels[type]}
    >
      <HexIcon className="h-8 w-8" />
    </div>
  )
}


/* -------------------------------------------------------------------------- */
/* Article Card — now a real link to a full article page, not a
   "به‌زودی" placeholder */
/* -------------------------------------------------------------------------- */

function ArticleCard({
  slug,
  title,
  accentFrom,
  accentTo,
}: {
  slug: string
  title: string
  accentFrom: string
  accentTo: string
}) {
  return (
    <Link href={`/articles/${slug}`} className="group block">
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition duration-200 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-primary/10">
        <div
          className={
            "relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br " +
            accentFrom +
            " " +
            accentTo
          }
        >
          <HexIcon className="h-16 w-16 text-foreground/20" />
        </div>

        <div className="flex flex-1 flex-col gap-2 p-5">
          <span className="text-xs font-semibold text-primary-strong">
            خواندن مقاله
          </span>

          <h3 className="font-bold leading-relaxed text-foreground">
            {title}
          </h3>
        </div>
      </article>
    </Link>
  )
}
