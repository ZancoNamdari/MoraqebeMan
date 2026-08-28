#!/usr/bin/env python3
"""Migrate the common "sticky header, single title, single action row"
pattern to <AppHeader>. Handles the majority-case files; special-shaped
headers (icon+title, JSX title, tab subheader, colored header) are done
by hand alongside this.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "frontend"

FILES = [
    "agency-panel/app/caregivers/page.tsx",
    "agency-panel/app/dashboard/page.tsx",
    "agency-panel/app/families/page.tsx",
    "agency-panel/app/patients/[id]/match/page.tsx",
    "agency-panel/app/patients/page.tsx",
    "agency-panel/app/supervisors/page.tsx",
    "superuser-panel/app/agencies/page.tsx",
    "superuser-panel/app/analytics/page.tsx",
    "patient-panel/app/access/page.tsx",
    "patient-panel/app/care/page.tsx",
    "patient-panel/app/profile/page.tsx",
    "patient-panel/app/questionnaire/page.tsx",
]

HEADER_RE = re.compile(
    r'<header className="sticky top-0 z-10 border-b(?: border-border)? bg-background/90 backdrop-blur">\s*'
    r'<div className="mx-auto flex max-w-(\w+) items-center justify-between p-4">\s*'
    r'<h1 className="font-bold text-foreground">(.*?)</h1>\s*'
    r'(.*?)'
    r'</div>\s*'
    r'</header>',
    re.DOTALL,
)

IMPORT_RE = re.compile(r'(import \{ Skeleton \} from "@/components/ui/skeleton"\n)')


def migrate(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")

    def repl(m: re.Match) -> str:
        width, title, actions = m.group(1), m.group(2), m.group(3).strip()
        return f'<AppHeader title="{title}" maxWidth="max-w-{width}">\n        {actions}\n      </AppHeader>'

    new_text, n = HEADER_RE.subn(repl, text)
    if n != 1:
        print(f"SKIP (header pattern not matched exactly once, got {n}): {path}")
        return False

    if 'components/layout/app-header' not in new_text:
        new_text, n2 = IMPORT_RE.subn(
            r'\1import { AppHeader } from "@/components/layout/app-header"\n', new_text
        )
        if n2 != 1:
            print(f"WARN: could not anchor AppHeader import in {path} (skeleton import not found) — inserting after last ui import")
            # fallback: insert after the last "@/components/ui/..." import line
            lines = new_text.split("\n")
            last_ui_import = max(
                (i for i, l in enumerate(lines) if l.startswith('import') and '@/components/ui/' in l),
                default=None,
            )
            if last_ui_import is None:
                print(f"FAIL: no anchor found for import in {path}")
                return False
            lines.insert(last_ui_import + 1, 'import { AppHeader } from "@/components/layout/app-header"')
            new_text = "\n".join(lines)

    path.write_text(new_text, encoding="utf-8")
    print(f"OK: {path}")
    return True


def main():
    ok = 0
    for rel in FILES:
        path = ROOT / rel
        if migrate(path):
            ok += 1
    print(f"\n{ok}/{len(FILES)} migrated")


if __name__ == "__main__":
    main()
