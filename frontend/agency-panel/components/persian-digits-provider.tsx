"use client"

import { useEffect } from "react"

// Western 0-9 -> Persian ۰-۹. Only ever applied to rendered TEXT
// NODES (see convertSubtree below) — never to attributes, so a
// <select>'s `value`/an <option>'s `value` (what the app's own logic
// reads on change) stays the real Western-digit string underneath;
// only what the person visually sees is swapped. Controlled
// <input>/<textarea> values live as a DOM property, not a text-node
// child, so this walker never touches what someone is actively
// typing into a form field either.
const DIGIT_MAP: Record<string, string> = {
  "0": "۰", "1": "۱", "2": "۲", "3": "۳", "4": "۴",
  "5": "۵", "6": "۶", "7": "۷", "8": "۸", "9": "۹",
}
const WESTERN_DIGIT_RE = /[0-9]/g
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "NOSCRIPT"])

function convertSubtree(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.nodeValue
    if (text && WESTERN_DIGIT_RE.test(text)) {
      node.nodeValue = text.replace(WESTERN_DIGIT_RE, (d) => DIGIT_MAP[d])
    }
    return
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return
  const el = node as Element
  if (SKIP_TAGS.has(el.tagName)) return
  // Array.from — childNodes is live, and later steps below (the
  // MutationObserver) can otherwise trigger a NodeList that shifts
  // under us mid-iteration.
  for (const child of Array.from(el.childNodes)) convertSubtree(child)
}

/**
 * Renders nothing — mounted once in app/layout.tsx so every page in
 * this panel gets Persian digits everywhere a number is shown
 * (dates, phone numbers, stage counts, IDs, …) without every
 * component having to format its own numbers by hand. Runs an
 * initial full-document pass on mount, then a MutationObserver keeps
 * re-converting anything React adds or changes afterward — each pass
 * is idempotent (a string with no Western digits left is a no-op), so
 * there's no risk of it looping on its own output.
 */
export function PersianDigitsProvider() {
  useEffect(() => {
    convertSubtree(document.body)

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          convertSubtree(mutation.target)
        } else {
          mutation.addedNodes.forEach((n) => convertSubtree(n))
        }
      }
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [])

  return null
}
