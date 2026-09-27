import { JSDOM } from "jsdom"

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" })
;(global as any).window = dom.window
;(global as any).document = dom.window.document
Object.defineProperty(global, "navigator", { value: dom.window.navigator, configurable: true })
;(global as any).HTMLElement = dom.window.HTMLElement
;(global as any).IS_REACT_ACT_ENVIRONMENT = true

import * as React from "react"
import { act } from "react"
import { createRoot } from "react-dom/client"
import { JalaliDatePicker } from "../components/forms/jalali-date-picker"

async function run() {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)

  let currentValue = ""
  const onChange = (v: string) => { currentValue = v }

  function renderPicker() {
    act(() => {
      root.render(React.createElement(JalaliDatePicker, { value: currentValue, onChange }))
    })
  }

  renderPicker()

  const selects = () => container.querySelectorAll("select")

  function setSelectValue(select: HTMLSelectElement, value: string) {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")!.set!
    nativeSetter.call(select, value)
    const event = new window.Event("change", { bubbles: true })
    select.dispatchEvent(event)
  }

  // Step 1: user picks DAY only (exactly the reported bug scenario —
  // selecting one field at a time, in day -> month -> year order)
  const [daySelect, monthSelect, yearSelect] = Array.from(selects()) as HTMLSelectElement[]
  act(() => { setSelectValue(daySelect, "15") })
  renderPicker()

  const daySelect2 = selects()[0] as HTMLSelectElement
  console.log("after selecting day=15, day dropdown shows:", JSON.stringify(daySelect2.value))
  if (daySelect2.value !== "15") {
    console.error("FAIL: day selection was lost after re-render (this was the original bug)")
    process.exit(1)
  }

  // Step 2: user picks MONTH
  const monthSelect2 = selects()[1] as HTMLSelectElement
  act(() => { setSelectValue(monthSelect2, "6") })
  renderPicker()

  const [daySelect3, monthSelect3] = Array.from(selects()) as HTMLSelectElement[]
  console.log("after selecting month=6, day shows:", JSON.stringify(daySelect3.value), "month shows:", JSON.stringify(monthSelect3.value))
  if (daySelect3.value !== "15" || monthSelect3.value !== "6") {
    console.error("FAIL: a previous selection was lost")
    process.exit(1)
  }

  // Step 3: user picks YEAR — now all three are set
  const yearSelect2 = selects()[2] as HTMLSelectElement
  act(() => { setSelectValue(yearSelect2, "1370") })
  renderPicker()

  const [daySelect4, monthSelect4, yearSelect4] = Array.from(selects()) as HTMLSelectElement[]
  console.log("after selecting year=1370, final state:", daySelect4.value, monthSelect4.value, yearSelect4.value)
  console.log("final onChange value reported to parent:", JSON.stringify(currentValue))

  if (daySelect4.value !== "15" || monthSelect4.value !== "6" || yearSelect4.value !== "1370") {
    console.error("FAIL: final dropdown state incorrect")
    process.exit(1)
  }
  if (currentValue !== "1370-06-15") {
    console.error("FAIL: onChange did not report the correct final date string")
    process.exit(1)
  }

  console.log()
  console.log("ALL CHECKS PASSED — date picker correctly retains partial selections and produces the right final value")
}

run()
