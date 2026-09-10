import { useState } from "react"
import { addMonths, format, getMonth, getYear, parseISO, setMonth, setYear, subMonths } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type View = "days" | "months" | "years"

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

interface DatePickerProps {
  value?: string
  onChange: (value: string | undefined) => void
  placeholder?: string
  id?: string
}

export function DatePicker({ value, onChange, placeholder = "Seleccionar fecha", id }: DatePickerProps) {
  const selected = value ? parseISO(value) : undefined
  const [view, setView] = useState<View>("days")
  const [displayMonth, setDisplayMonth] = useState(selected ?? new Date())

  const year = getYear(displayMonth)
  const month = getMonth(displayMonth)
  const baseYear = Math.floor(year / 12) * 12
  const years = Array.from({ length: 12 }, (_, i) => baseYear + i)

  function toggleView() {
    setView((v) => (v === "days" ? "months" : v === "months" ? "years" : "months"))
  }

  return (
    <Popover onOpenChange={(open) => { if (!open) setView("days") }}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}
        >
          <CalendarIcon className="mr-2 size-4" />
          {selected ? format(selected, "d 'de' MMMM 'de' yyyy", { locale: es }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {/* Header compartido */}
        <div className="flex items-center justify-between px-3 pt-3 pb-1">
          {view !== "years" ? (
            <Button variant="ghost" size="icon" className="size-7"
              onClick={() => setDisplayMonth(subMonths(displayMonth, 1))}>
              <ChevronLeftIcon className="size-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="size-7"
              onClick={() => setDisplayMonth(setYear(displayMonth, baseYear - 12))}>
              <ChevronLeftIcon className="size-4" />
            </Button>
          )}

          <button onClick={toggleView} className="text-sm font-medium hover:underline capitalize px-1">
            {view === "years"
              ? `${baseYear} – ${baseYear + 11}`
              : format(displayMonth, "MMMM yyyy", { locale: es })}
          </button>

          {view !== "years" ? (
            <Button variant="ghost" size="icon" className="size-7"
              onClick={() => setDisplayMonth(addMonths(displayMonth, 1))}>
              <ChevronRightIcon className="size-4" />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="size-7"
              onClick={() => setDisplayMonth(setYear(displayMonth, baseYear + 12))}>
              <ChevronRightIcon className="size-4" />
            </Button>
          )}
        </div>

        {view === "days" && (
          <Calendar
            mode="single"
            selected={selected}
            month={displayMonth}
            onMonthChange={setDisplayMonth}
            onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : undefined)}
            locale={es}
            components={{
              Nav: () => <></>,
              MonthCaption: () => <></>,
            }}
          />
        )}

        {view === "months" && (
          <div className="grid grid-cols-3 gap-1 p-3">
            {MONTHS.map((m, i) => (
              <Button
                key={m}
                variant={i === month ? "default" : "ghost"}
                size="sm"
                className="text-xs"
                onClick={() => { setDisplayMonth(setMonth(displayMonth, i)); setView("days") }}
              >
                {m}
              </Button>
            ))}
          </div>
        )}

        {view === "years" && (
          <div className="grid grid-cols-3 gap-1 p-3">
            {years.map((y) => (
              <Button
                key={y}
                variant={y === year ? "default" : "ghost"}
                size="sm"
                className="text-xs"
                onClick={() => { setDisplayMonth(setYear(displayMonth, y)); setView("months") }}
              >
                {y}
              </Button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
