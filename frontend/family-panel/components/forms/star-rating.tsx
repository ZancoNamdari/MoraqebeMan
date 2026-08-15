"use client"

export function StarRating({ value, onChange, size = "text-lg" }: { value: number; onChange: (v: number) => void; size?: string }) {
  return (
    <div className="flex gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n} type="button" onClick={() => onChange(n)}
          className={`${size} leading-none transition-transform hover:scale-110`}
          aria-label={`${n} ستاره`}
        >
          {n <= value ? "★" : "☆"}
        </button>
      ))}
    </div>
  )
}
