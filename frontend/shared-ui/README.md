# shared-ui — مرجع مشترک کامپوننت‌ها

## این پوشه چیست، و چیستنیست

این یک **پکیج npm زنده نیست** که پنل‌ها در زمان اجرا از آن import کنند.
این یک **مرجع/منبع** است — نسخه اصلی هر کامپوننتی که در همه پنل‌های
این پروژه (family-panel، caregiver-panel، supervisor-panel، agency-panel،
superuser-panel، admin-panel) تکرار شده.

## چرا یک پکیج واقعی نساختیم

این ریپازیتوری **مونوریپو با npm/pnpm workspaces نیست** — هر پنل یک
اپلیکیشن Next.js کاملاً مستقل با `package.json`، `node_modules`، و
build خودش است (دقیقاً طبق سند معماری پلتفرم، بخش «ساختار ریپازیتوری»).
تبدیل این ساختار به یک مونوریپوی واقعی با پکیج مشترک، یعنی:

- بازنویسی `tsconfig.json`/`next.config.ts` هر ۶ پنل موجود
- ریسک واقعی رگرسیون در پنل‌هایی که همین الان کار می‌کنند و تست شده‌اند
- برای پروژه‌ای با این مقیاس (نسخه ۲ سند معماری: «هزینه عملیاتی را از
  توسعه محصول جلو نزنید»)، این هزینه به نفع محصول نیست — دقیقاً همان
  استدلالی که مونولیت را به میکروسرویس ترجیح داد.

## قرارداد واقعی: کپی، نه import

وقتی پنل جدیدی می‌سازید (همان‌طور که در agency-panel و superuser-panel
انجام شد):

```bash
cp shared-ui/components/ui/*.tsx frontend/<new-panel>/components/ui/
cp shared-ui/components/forms/fields.tsx frontend/<new-panel>/components/forms/
cp shared-ui/hooks/*.ts* frontend/<new-panel>/hooks/
cp shared-ui/lib/utils.ts frontend/<new-panel>/lib/
cp shared-ui/lib/api.ts frontend/<new-panel>/services/api.ts
```

سپس هر تغییر مخصوص همان پنل (رنگ‌بندی، متن فارسی، منطق) را روی نسخه
کپی‌شده اعمال کنید.

## چه چیزی اینجاست

| فایل | توضیح |
|---|---|
| `components/ui/button.tsx`، `card.tsx`، `input.tsx`، `label.tsx`، `skeleton.tsx`، `badge.tsx` | پریمیتیوهای shadcn/ui — یکسان در همه پنل‌ها |
| `components/forms/fields.tsx` | `Field`/`ChoiceSelect`/`CheckboxGroup` — کمکی‌های فرم سبک، بدون وابستگی جدید (ساخته‌شده برای agency-panel، بدون نیاز به پورت کردن کل زنجیره Select/Checkbox رادیکس) |
| `hooks/useauth.ts` | الگوی احراز هویت (fetch کاربر، هدایت به ورود در صورت نبود توکن) |
| `lib/utils.ts` | تابع `cn()` (ادغام کلاس‌های Tailwind) |
| `lib/api.ts` | نمونه axios با interceptor توکن — در هر پنل باید در `services/api.ts` کپی شود |

## اگر روزی واقعاً یک مونوریپو خواستید

اگر تعداد پنل‌ها یا فرکانس تغییرات مشترک آن‌قدر زیاد شد که این قرارداد
کپی‌محور دیگر جواب نداد، این پوشه دقیقاً همان چیزی است که باید به یک
پکیج واقعی (با npm/pnpm workspaces) تبدیل شود — محتوای آن از قبل واحد
و آماده است؛ فقط ساختار بسته‌بندی تغییر می‌کند، نه خودِ کد.
