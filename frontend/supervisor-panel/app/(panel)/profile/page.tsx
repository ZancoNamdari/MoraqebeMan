"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/useauth"
import { authService } from "@/services/auth.service"

export default function ProfilePage() {
  const { user, loading } = useAuth(["admin", "superuser"])

  // Profile fields
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")

  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState("")
  const [profileError, setProfileError] = useState("")

  useEffect(() => {
    if (!user) return
    setFirstName(user.first_name || "")
    setLastName(user.last_name || "")
    setEmail(user.email || "")
    setPhoneNumber(user.phone_number || "")
  }, [user])

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState("")
  const [passwordError, setPasswordError] = useState("")

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  async function handleSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setProfileMessage("")
    setProfileError("")
    setSavingProfile(true)

    try {
      await authService.updateProfile({
        first_name: firstName,
        last_name: lastName,
        email,
        phone_number: phoneNumber,
      })
      setProfileMessage("اطلاعات پروفایل با موفقیت به‌روزرسانی شد.")
    } catch (error: any) {
      const message =
        error?.response?.data?.phone_number?.[0] ||
        error?.response?.data?.email?.[0] ||
        error?.response?.data?.detail ||
        "به‌روزرسانی اطلاعات با خطا مواجه شد."
      setProfileError(message)
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    setPasswordMessage("")
    setPasswordError("")

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("لطفاً تمام فیلدها را تکمیل کنید.")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("رمز عبور جدید و تکرار آن یکسان نیستند.")
      return
    }

    if (newPassword.length < 8) {
      setPasswordError("رمز عبور جدید باید حداقل ۸ کاراکتر باشد.")
      return
    }

    try {
      setChangingPassword(true)

      await authService.changePassword(
        currentPassword,
        newPassword
      )

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

      setPasswordMessage("رمز عبور با موفقیت تغییر کرد.")
    } catch (error: any) {
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.response?.data?.new_password?.[0] ||
        error?.response?.data?.current_password?.[0] ||
        "تغییر رمز عبور انجام نشد. رمز فعلی را بررسی کنید."

      setPasswordError(message)
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">
          در حال دریافت اطلاعات...
        </p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            پروفایل من
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            اطلاعات حساب کاربری و تنظیمات امنیتی
          </p>
        </div>

        {/* Editable profile information */}
        <section className="rounded-2xl border border-border bg-background p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">
              اطلاعات حساب کاربری
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              نام، ایمیل و شماره موبایل قابل ویرایش است. تغییر شماره موبایل، نیاز به تأیید مجدد دارد.
            </p>
          </div>

          <form onSubmit={handleSaveProfile}>
            <div className="grid gap-5 sm:grid-cols-2">
              <EditableField label="نام" value={firstName} onChange={setFirstName} />
              <EditableField label="نام خانوادگی" value={lastName} onChange={setLastName} />
              <ReadOnlyField label="نام کاربری" value={user.username} />
              <ReadOnlyField label="کد ملی" value={user.national_id || "ثبت نشده"} />
              <EditableField label="ایمیل" value={email} onChange={setEmail} type="email" />
              <EditableField label="شماره موبایل" value={phoneNumber} onChange={setPhoneNumber} dir="ltr" />
            </div>

            {profileError && (
              <div className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {profileError}
              </div>
            )}

            {profileMessage && (
              <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {profileMessage}
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingProfile ? "در حال ذخیره..." : "ذخیره تغییرات"}
              </button>
            </div>
          </form>
        </section>

        {/* Change password */}
        <section className="mt-6 rounded-2xl border border-border bg-background p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">
              تغییر رمز عبور
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              برای امنیت بیشتر، رمز عبور حساب خود را تغییر دهید.
            </p>
          </div>

          <form onSubmit={handleChangePassword}>
            <div className="space-y-5">
              <PasswordField
                label="رمز عبور فعلی"
                value={currentPassword}
                onChange={setCurrentPassword}
                showPassword={showCurrentPassword}
                onToggle={() =>
                  setShowCurrentPassword((value) => !value)
                }
              />

              <PasswordField
                label="رمز عبور جدید"
                value={newPassword}
                onChange={setNewPassword}
                showPassword={showNewPassword}
                onToggle={() =>
                  setShowNewPassword((value) => !value)
                }
              />

              <PasswordField
                label="تکرار رمز عبور جدید"
                value={confirmPassword}
                onChange={setConfirmPassword}
                showPassword={showConfirmPassword}
                onToggle={() =>
                  setShowConfirmPassword((value) => !value)
                }
              />

              {passwordError && (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {passwordError}
                </div>
              )}

              {passwordMessage && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {passwordMessage}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {changingPassword
                    ? "در حال تغییر..."
                    : "تغییر رمز عبور"}
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}

function EditableField({
  label,
  value,
  onChange,
  type = "text",
  dir,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  dir?: string
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-foreground">
        {label}
      </label>

      <input
        type={type}
        value={value}
        dir={dir}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
      />
    </div>
  )
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-foreground">
        {label}
      </label>

      <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        {value}
      </div>
    </div>
  )
}

function PasswordField({
  label,
  value,
  onChange,
  showPassword,
  onToggle,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  showPassword: boolean
  onToggle: () => void
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-foreground">
        {label}
      </label>

      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 pl-20 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/10"
          autoComplete="new-password"
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {showPassword ? "پنهان" : "نمایش"}
        </button>
      </div>
    </div>
  )
}
