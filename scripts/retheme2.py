#!/usr/bin/env python3
"""Second pass:
1. Replace leftover brand-pink/brand-mint custom-token classes (these
   referenced CSS vars that only existed in the old admin/agency/superuser/
   supervisor globals.css and no longer exist) with the new primary teal.
2. Fix a real semantic regression from pass 1: error/rejected/validation
   states that used to render in rose/red now render in the brand teal
   (secondary/primary), which erases the "something's wrong" signal. These
   need to go to the destructive tokens instead.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "frontend"
SKIP_DIRS = {"landing-page", "node_modules"}

# --- Part A: brand-pink / brand-mint -> primary teal -----------------------
BRAND_RE = re.compile(
    r"\b(bg|text|border|from|via|to|ring|shadow)-brand-(pink|mint)(-strong)?(/\d+)?\b"
)
BRAND_MAP = {
    "bg-brand-pink": "bg-primary",
    "bg-brand-pink-strong": "bg-primary",
    "from-brand-pink": "from-primary",
    "from-brand-pink-strong": "from-primary",
    "via-brand-pink": "via-primary/80",
    "to-brand-mint": "to-primary/80",
    "to-brand-mint-strong": "to-primary",
    "shadow-brand-pink/20": "shadow-primary/20",
    "shadow-brand-pink/30": "shadow-primary/30",
}


def fix_brand_tokens(text: str) -> tuple[str, int]:
    count = 0

    def repl(m: re.Match) -> str:
        nonlocal count
        token = m.group(0)
        if token in BRAND_MAP:
            count += 1
            return BRAND_MAP[token]
        count += 1
        return "text-primary" if m.group(1) == "text" else "border-border" if m.group(1) == "border" else "ring-primary" if m.group(1) == "ring" else "bg-primary"

    new_text = BRAND_RE.sub(repl, text)
    return new_text, count


# --- Part B: error/rejected states that got mapped to brand teal -----------
# (old_substring, new_substring) exact string replacements, per file.
SEMANTIC_FIXES = {
    "supervisor-panel/components/forms/fields.tsx": [
        ('error && "ring-1 ring-primary/60 bg-secondary/60 p-2.5"',
         'error && "ring-1 ring-destructive/50 bg-destructive/5 p-2.5"'),
        ('{error && <p className="text-xs font-medium text-primary">{error}</p>}',
         '{error && <p className="text-xs font-medium text-destructive">{error}</p>}'),
    ],
    "family-panel/components/forms/fields.tsx": [
        ('error && "ring-1 ring-primary/60 bg-secondary/60 p-2.5"',
         'error && "ring-1 ring-destructive/50 bg-destructive/5 p-2.5"'),
        ('{error && <p className="text-xs font-medium text-primary">{error}</p>}',
         '{error && <p className="text-xs font-medium text-destructive">{error}</p>}'),
    ],
    "patient-panel/components/forms/fields.tsx": [
        ('error && "ring-1 ring-primary/60 bg-secondary/60 p-2.5"',
         'error && "ring-1 ring-destructive/50 bg-destructive/5 p-2.5"'),
        ('{error && <p className="text-xs font-medium text-primary">{error}</p>}',
         '{error && <p className="text-xs font-medium text-destructive">{error}</p>}'),
    ],
    "caregiver-panel/components/forms/fields.tsx": [
        ('error && "ring-1 ring-primary/60 bg-secondary/60 p-2.5"',
         'error && "ring-1 ring-destructive/50 bg-destructive/5 p-2.5"'),
        ('{error && <p className="text-xs font-medium text-primary">{error}</p>}',
         '{error && <p className="text-xs font-medium text-destructive">{error}</p>}'),
    ],
    "agency-panel/components/forms/fields.tsx": [
        ('error && "ring-1 ring-primary/60 bg-secondary/60 p-2.5"',
         'error && "ring-1 ring-destructive/50 bg-destructive/5 p-2.5"'),
        ('{error && <p className="text-xs font-medium text-primary">{error}</p>}',
         '{error && <p className="text-xs font-medium text-destructive">{error}</p>}'),
    ],
    "admin-panel/components/forms/fields.tsx": [
        ('error && "ring-1 ring-primary/60 bg-secondary/60 p-2.5"',
         'error && "ring-1 ring-destructive/50 bg-destructive/5 p-2.5"'),
        ('{error && <p className="text-xs font-medium text-primary">{error}</p>}',
         '{error && <p className="text-xs font-medium text-destructive">{error}</p>}'),
    ],
    "shared-ui/components/forms/fields.tsx": [
        ('error && "ring-1 ring-primary/60 bg-secondary/60 p-2.5"',
         'error && "ring-1 ring-destructive/50 bg-destructive/5 p-2.5"'),
        ('{error && <p className="text-xs font-medium text-primary">{error}</p>}',
         '{error && <p className="text-xs font-medium text-destructive">{error}</p>}'),
    ],
    "supervisor-panel/app/match/page.tsx": [
        ('{error && <p className="mb-2 text-sm text-primary">{error}</p>}',
         '{error && <p className="mb-2 text-sm text-destructive">{error}</p>}'),
    ],
    "supervisor-panel/app/match/weights/page.tsx": [
        ('{error && <p className="text-sm text-primary">{error}</p>}',
         '{error && <p className="text-sm text-destructive">{error}</p>}'),
    ],
    "supervisor-panel/app/caregivers/review/page.tsx": [
        ('rejected: "bg-secondary text-foreground"', 'rejected: "bg-destructive/10 text-destructive"'),
        ('message.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-border bg-secondary text-foreground"',
         'message.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-destructive/30 bg-destructive/10 text-destructive"'),
        ('questionnaireMessage.includes("خطا") ? "bg-secondary text-primary" : "bg-emerald-50 text-emerald-800"',
         'questionnaireMessage.includes("خطا") ? "bg-destructive/10 text-destructive" : "bg-emerald-50 text-emerald-800"'),
    ],
    "supervisor-panel/app/dashboard/page.tsx": [
        ('rejected: "bg-primary",', 'rejected: "bg-destructive",'),
        ('rejected: "text-primary",', 'rejected: "text-destructive",'),
    ],
    "family-panel/app/patients/detail/page.tsx": [
        ('{error && <p className="text-xs text-primary">{error}</p>}',
         '{error && <p className="text-xs text-destructive">{error}</p>}'),
    ],
    "family-panel/app/login/page.tsx": [
        ('{error && <div className="mb-3 rounded-md border border-border bg-secondary p-2.5 text-sm text-primary">{error}</div>}',
         '{error && <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">{error}</div>}'),
    ],
    "family-panel/app/dashboard/page.tsx": [
        ('connectMessage.kind === "success" ? "bg-emerald-50 text-emerald-800" : "bg-secondary text-primary"',
         'connectMessage.kind === "success" ? "bg-emerald-50 text-emerald-800" : "bg-destructive/10 text-destructive"'),
        ('agencyMessage.kind === "success" ? "bg-emerald-50 text-emerald-800" : "bg-secondary text-primary"',
         'agencyMessage.kind === "success" ? "bg-emerald-50 text-emerald-800" : "bg-destructive/10 text-destructive"'),
    ],
    "caregiver-panel/app/dashboard/page.tsx": [
        ('agencyMessage.kind === "success" ? "bg-emerald-50 text-emerald-800" : "bg-secondary text-primary"',
         'agencyMessage.kind === "success" ? "bg-emerald-50 text-emerald-800" : "bg-destructive/10 text-destructive"'),
    ],
    "caregiver-panel/app/login/page.tsx": [
        ('{error && <div className="mb-3 rounded-md border border-border bg-secondary p-2.5 text-sm text-primary">{error}</div>}',
         '{error && <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">{error}</div>}'),
    ],
    "patient-panel/app/access/page.tsx": [
        ('{error && <p className="text-xs text-primary">{error}</p>}',
         '{error && <p className="text-xs text-destructive">{error}</p>}'),
    ],
    "patient-panel/app/login/page.tsx": [
        ('{error && <div className="mb-3 rounded-md border border-border bg-secondary p-2.5 text-sm text-primary">{error}</div>}',
         '{error && <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">{error}</div>}'),
    ],
    "superuser-panel/app/agencies/page.tsx": [
        ('{error && <div className="rounded-md bg-secondary p-2 text-xs text-primary">{error}</div>}',
         '{error && <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}'),
    ],
    "agency-panel/app/patients/page.tsx": [
        ('{error && <div className="rounded-md bg-secondary p-2 text-xs text-primary">{error}</div>}',
         '{error && <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}'),
    ],
    "agency-panel/app/supervisors/page.tsx": [
        ('{error && <div className="rounded-md bg-secondary p-2 text-xs text-primary">{error}</div>}',
         '{error && <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</div>}'),
    ],
    "admin-panel/app/caregivers/[id]/page.tsx": [
        ('rejected: "bg-secondary text-foreground",', 'rejected: "bg-destructive/10 text-destructive",'),
        ('{error && <div className="rounded-lg border border-border bg-secondary p-3 text-sm text-primary">{error}</div>}',
         '{error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}'),
    ],
    "admin-panel/app/dashboard/page.tsx": [
        ('rejected: "bg-secondary text-foreground",', 'rejected: "bg-destructive/10 text-destructive",'),
    ],
    # multi-line "{error && (\n  <div className="rounded-md border border-border bg-secondary p-2.5 text-sm text-primary">"
    "admin-panel/app/login/page.tsx": [
        ('<div className="rounded-md border border-border bg-secondary p-2.5 text-sm text-primary">{error}</div>',
         '<div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">{error}</div>'),
    ],
    "agency-panel/app/login/page.tsx": [
        ('<div className="rounded-md border border-border bg-secondary p-2.5 text-sm text-primary">',
         '<div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">'),
    ],
    "superuser-panel/app/login/page.tsx": [
        ('<div className="rounded-md border border-border bg-secondary p-2.5 text-sm text-primary">',
         '<div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">'),
    ],
    "supervisor-panel/app/login/page.tsx": [
        ('<div className="rounded-md border border-border bg-secondary p-2.5 text-sm text-primary">',
         '<div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">'),
    ],
}


def main():
    total_brand = 0
    total_semantic = 0
    brand_files = 0
    semantic_files = 0

    for path in ROOT.rglob("*.tsx"):
        rel = path.relative_to(ROOT)
        if any(part in SKIP_DIRS for part in rel.parts):
            continue
        text = path.read_text(encoding="utf-8")
        new_text, n = fix_brand_tokens(text)
        if n:
            path.write_text(new_text, encoding="utf-8")
            brand_files += 1
            total_brand += n
            print(f"[brand] {rel}: {n} replacements")

    for rel_str, fixes in SEMANTIC_FIXES.items():
        path = ROOT / rel_str
        if not path.exists():
            print(f"[semantic] MISSING FILE: {rel_str}")
            continue
        text = path.read_text(encoding="utf-8")
        file_count = 0
        for old, new in fixes:
            if old not in text:
                print(f"[semantic] NOT FOUND in {rel_str}: {old[:80]}")
                continue
            text = text.replace(old, new)
            file_count += 1
        if file_count:
            path.write_text(text, encoding="utf-8")
            semantic_files += 1
            total_semantic += file_count
            print(f"[semantic] {rel_str}: {file_count} fixes")

    print(f"\nBrand-token fixes: {total_brand} across {brand_files} files")
    print(f"Semantic (error/rejected) fixes: {total_semantic} across {semantic_files} files")


if __name__ == "__main__":
    main()
