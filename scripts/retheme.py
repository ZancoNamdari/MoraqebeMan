#!/usr/bin/env python3
"""One-time mechanical pass: replace hardcoded pink/rose/fuchsia Tailwind
utility classes with the new teal design-token classes, across every panel
except landing-page (already hand-rebuilt). Exact-match table first (covers
every class actually found in the repo), then a defensive fallback regex for
anything the table misses.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "frontend"
SKIP_DIRS = {"landing-page", "node_modules"}

EXACT = {
    # borders
    "border-pink-100": "border-border",
    "border-pink-200": "border-border",
    "border-pink-300": "border-primary/30",
    "border-rose-200": "border-border",
    "border-rose-400": "border-primary/40",
    # text
    "text-rose-600": "text-primary",
    "text-rose-700": "text-primary",
    "text-rose-800": "text-foreground",
    "text-rose-900": "text-foreground",
    "text-rose-950": "text-foreground",
    "text-pink-100": "text-primary-foreground",
    # backgrounds
    "bg-rose-50": "bg-secondary",
    "bg-rose-50/60": "bg-secondary/60",
    "bg-rose-100": "bg-secondary",
    "bg-rose-200/40": "bg-accent/40",
    "bg-rose-500": "bg-primary",
    "bg-rose-600": "bg-primary",
    "bg-rose-700": "bg-primary",
    "bg-pink-50": "bg-secondary",
    "bg-pink-50/30": "bg-secondary/30",
    "bg-pink-50/40": "bg-secondary/40",
    "bg-pink-50/50": "bg-secondary/50",
    "bg-pink-50/60": "bg-secondary/60",
    "bg-pink-100": "bg-secondary",
    "bg-pink-200/40": "bg-accent/40",
    "bg-fuchsia-400/20": "bg-primary/20",
    # gradients
    "from-pink-50": "from-secondary",
    "from-pink-50/50": "from-secondary/50",
    "from-pink-200": "from-accent",
    "from-pink-300": "from-primary/80",
    "from-pink-400": "from-primary",
    "from-pink-500": "from-primary",
    "from-rose-50": "from-secondary",
    "from-rose-50/50": "from-secondary/50",
    "from-rose-50/60": "from-secondary/60",
    "via-pink-50": "via-background",
    "to-pink-50": "to-secondary",
    "to-rose-50": "to-secondary",
    "to-rose-300": "to-primary/70",
    "to-rose-400": "to-primary",
    "to-rose-500": "to-primary",
    # ring / shadow
    "ring-pink-200": "ring-primary/60",
    "ring-pink-300": "ring-primary",
    "ring-rose-400/60": "ring-primary/60",
    "shadow-pink-100": "shadow-primary/10",
    "shadow-pink-200/50": "shadow-primary/15",
    "shadow-pink-300/40": "shadow-primary/20",
}

FALLBACK_PREFIX = {
    "bg": "bg-secondary",
    "text": "text-primary",
    "border": "border-border",
    "from": "from-primary",
    "via": "via-background",
    "to": "to-primary",
    "ring": "ring-primary",
    "shadow": "shadow-primary/10",
    "divide": "divide-border",
    "outline": "outline-primary",
    "decoration": "decoration-primary",
}

CLASS_RE = re.compile(
    r"\b(bg|text|border|from|via|to|ring|shadow|divide|outline|decoration)-(pink|rose|fuchsia)-\d+(/\d+)?\b"
)


def replace_in_text(text: str) -> tuple[str, int]:
    count = 0

    def repl(m: re.Match) -> str:
        nonlocal count
        token = m.group(0)
        if token in EXACT:
            count += 1
            return EXACT[token]
        prefix = m.group(1)
        count += 1
        return FALLBACK_PREFIX.get(prefix, token)

    new_text = CLASS_RE.sub(repl, text)
    return new_text, count


def main():
    total_files = 0
    total_replacements = 0
    for path in ROOT.rglob("*.tsx"):
        if any(part in SKIP_DIRS for part in path.relative_to(ROOT).parts):
            continue
        text = path.read_text(encoding="utf-8")
        new_text, n = replace_in_text(text)
        if n:
            path.write_text(new_text, encoding="utf-8")
            total_files += 1
            total_replacements += n
            print(f"{path.relative_to(ROOT)}: {n} replacements")
    print(f"\nTotal: {total_replacements} replacements across {total_files} files")


if __name__ == "__main__":
    sys.exit(main())
