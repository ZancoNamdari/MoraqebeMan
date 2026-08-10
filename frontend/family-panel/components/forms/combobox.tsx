"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export interface ComboboxOption {
  id: number
  name: string
}

interface Props {
  options: ComboboxOption[]
  value: number | null
  onChange: (id: number | null) => void
  placeholder: string
  disabled?: boolean
  disabledPlaceholder?: string
}

/**
 * Type to filter, click to select — never free text. Typing narrows
 * the option list to names starting with what's typed (matching how a
 * supervisor would actually search: "می" -> "میدان ولیعصر" jumps
 * right there instead of scrolling a 128-item dropdown); the actual
 * selection always comes from clicking one of the filtered results,
 * same "mouse, not typing" principle as everything else in this
 * wizard — this just makes finding the right option in a long list
 * fast instead of scrolling blind.
 */
export function Combobox({ options, value, onChange, placeholder, disabled, disabledPlaceholder }: Props) {
  const selected = options.find((o) => o.id === value)
  const [query, setQuery] = useState(selected?.name ?? "")
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Keep the visible text in sync when the selection changes from
  // outside (e.g. province changing resets city, or resuming an
  // in-progress caregiver loads existing data).
  useEffect(() => {
    setQuery(selected?.name ?? "")
  }, [selected?.id])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery(selected?.name ?? "")
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.name])

  const filtered = query.trim()
    ? options.filter((o) => o.name.startsWith(query.trim()))
    : options

  function selectOption(option: ComboboxOption) {
    onChange(option.id)
    setQuery(option.name)
    setOpen(false)
  }

  function handleQueryChange(v: string) {
    setQuery(v)
    setOpen(true)
    if (value !== null) onChange(null) // typing invalidates the previous pick until a new one is clicked
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={disabled ? "" : query}
        disabled={disabled}
        placeholder={disabled ? disabledPlaceholder ?? placeholder : placeholder}
        onChange={(e) => handleQueryChange(e.target.value)}
        onFocus={() => setOpen(true)}
      />
      {open && !disabled && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {filtered.slice(0, 100).map((option) => (
            <li key={option.id}>
              <button
                type="button"
                className={cn(
                  "w-full rounded-sm px-2 py-1.5 text-right text-sm hover:bg-accent",
                  option.id === value && "bg-accent font-medium"
                )}
                onClick={() => selectOption(option)}
              >
                {option.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && !disabled && filtered.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover p-2 text-sm text-muted-foreground shadow-md">
          موردی یافت نشد
        </div>
      )}
    </div>
  )
}
