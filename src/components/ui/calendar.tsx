import * as React from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  getMonth,
  getYear,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday as isTodayFn,
  isWithinInterval,
  setMonth,
  setYear,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface CalendarRange {
  from?: Date;
  to?: Date;
}

type BaseCalendarProps = {
  className?: string;
  numberOfMonths?: number;
  showOutsideDays?: boolean;
  initialFocus?: boolean;
  disabled?: (day: Date) => boolean;
  withDropdowns?: boolean;
  yearRange?: {
    start: number;
    end: number;
  };
};

type SingleCalendarProps = BaseCalendarProps & {
  mode?: "single";
  selected?: Date;
  onSelect?: (day?: Date) => void;
};

type RangeCalendarProps = BaseCalendarProps & {
  mode: "range";
  selected?: CalendarRange;
  onSelect?: (range?: CalendarRange) => void;
};

export type CalendarProps = SingleCalendarProps | RangeCalendarProps;

const WEEKDAY_LABELS = Array.from({ length: 7 }, (_, index) =>
  format(addDays(startOfWeek(new Date(), { weekStartsOn: 0 }), index), "EEE"),
);

const getMonthMatrix = (month: Date) => {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });

  const weeks: Date[][] = [];
  let current = start;

  while (current <= end) {
    const week: Date[] = [];
    for (let index = 0; index < 7; index++) {
      week.push(current);
      current = addDays(current, 1);
    }
    weeks.push(week);
  }

  return weeks;
};

const resolveInitialMonth = (
  mode: CalendarProps["mode"],
  selected: CalendarProps["selected"],
): Date => {
  if (mode === "range") {
    const range = selected as CalendarRange | undefined;
    if (range?.from) return startOfMonth(range.from);
    if (range?.to) return startOfMonth(range.to);
  } else {
    const single = selected as Date | undefined;
    if (single) return startOfMonth(single);
  }
  return startOfMonth(new Date());
};

const getSortedRange = (from?: Date, to?: Date) => {
  if (!from || !to) return { start: from, end: to };
  return isAfter(from, to) ? { start: to, end: from } : { start: from, end: to };
};

const MONTH_LABELS = Array.from({ length: 12 }, (_, index) => format(new Date(2000, index, 1), "MMMM"));

const clampYearRange = (range?: { start: number; end: number }) => {
  if (!range) {
    const currentYear = new Date().getFullYear();
    return { start: currentYear - 60, end: currentYear + 20 };
  }
  const start = Math.min(range.start, range.end);
  const end = Math.max(range.start, range.end);
  return { start, end };
};

const Calendar: React.FC<CalendarProps> = (props) => {
  const {
    className,
    numberOfMonths = 1,
    showOutsideDays = true,
    initialFocus: _initialFocus,
    mode = "single",
    selected,
    onSelect,
    disabled,
    withDropdowns = false,
    yearRange,
  } = props;

  const rangeValue = mode === "range" ? (selected as CalendarRange | undefined) : undefined;
  const singleValue = mode === "range" ? undefined : (selected as Date | undefined);
  const rangeOnSelect = mode === "range" ? (onSelect as RangeCalendarProps["onSelect"]) : undefined;
  const singleOnSelect = mode === "range" ? undefined : (onSelect as SingleCalendarProps["onSelect"]);
  const rangeFromTime = rangeValue?.from?.getTime();
  const rangeToTime = rangeValue?.to?.getTime();
  const singleTime = singleValue?.getTime();

  const initialMonth = React.useMemo(
    () => resolveInitialMonth(mode, selected),
    [mode, rangeFromTime, rangeToTime, singleTime, selected],
  );

  const [currentMonth, setCurrentMonth] = React.useState<Date>(initialMonth);
  const [hoveredDate, setHoveredDate] = React.useState<Date | null>(null);
  const resolvedYearRange = React.useMemo(() => clampYearRange(yearRange), [yearRange]);
  const yearOptions = React.useMemo(() => {
    const years: number[] = [];
    for (let year = resolvedYearRange.start; year <= resolvedYearRange.end; year++) {
      years.push(year);
    }
    return years;
  }, [resolvedYearRange.end, resolvedYearRange.start]);

  React.useEffect(() => {
    if (!isSameMonth(currentMonth, initialMonth)) {
      setCurrentMonth(initialMonth);
    }
  }, [currentMonth, initialMonth]);

  React.useEffect(() => {
    if (mode !== "range") {
      setHoveredDate(null);
    }
  }, [mode]);

  const months = React.useMemo(
    () => Array.from({ length: numberOfMonths }, (_, index) => startOfMonth(addMonths(currentMonth, index))),
    [currentMonth, numberOfMonths],
  );

  const handleDayClick = (day: Date) => {
    if (disabled?.(day)) return;

    if (mode === "range") {
      if (!rangeOnSelect) return;

      const range = rangeValue ?? {};
      if (!range.from || (range.from && range.to)) {
        rangeOnSelect({ from: day, to: undefined });
        return;
      }

      if (isBefore(day, range.from)) {
        rangeOnSelect({ from: day, to: range.from });
        return;
      }

      if (isSameDay(day, range.from)) {
        rangeOnSelect({ from: day, to: day });
        return;
      }

      rangeOnSelect({ from: range.from, to: day });
      return;
    }

    singleOnSelect?.(day);
  };

  const handlePreviousMonth = () => {
    setCurrentMonth((prev) => startOfMonth(addMonths(prev, -1)));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => startOfMonth(addMonths(prev, 1)));
  };

  const handleMonthDropdownChange = (value: string) => {
    const monthIndex = Number.parseInt(value, 10);
    if (Number.isNaN(monthIndex)) return;
    setCurrentMonth((prev) => startOfMonth(setMonth(prev, monthIndex)));
  };

  const handleYearDropdownChange = (value: string) => {
    const year = Number.parseInt(value, 10);
    if (Number.isNaN(year)) return;
    const clampedYear = Math.min(Math.max(year, resolvedYearRange.start), resolvedYearRange.end);
    setCurrentMonth((prev) => startOfMonth(setYear(prev, clampedYear)));
  };

  return (
    <div className={cn("p-3", className)}>
      <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
        {months.map((month, monthIndex) => {
          const monthMatrix = getMonthMatrix(month);
          const rangeEndPreview =
            mode === "range" && rangeValue?.from && !rangeValue?.to && hoveredDate
              ? hoveredDate
              : rangeValue?.to;
          const { start: rangeStart, end: rangeEnd } = getSortedRange(rangeValue?.from, rangeEndPreview ?? undefined);

          return (
            <div key={monthIndex} className="space-y-4">
              <div className="relative flex items-center justify-center gap-2 pt-1">
                {withDropdowns && monthIndex === 0 ? (
                  <>
                    <Select
                      value={String(getMonth(currentMonth))}
                      onValueChange={handleMonthDropdownChange}
                    >
                      <SelectTrigger className="h-8 w-[140px] justify-between">
                        <SelectValue placeholder={format(currentMonth, "MMMM")} />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {MONTH_LABELS.map((label, index) => (
                          <SelectItem key={label} value={String(index)}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={String(getYear(currentMonth))}
                      onValueChange={handleYearDropdownChange}
                    >
                      <SelectTrigger className="h-8 w-[100px] justify-between">
                        <SelectValue placeholder={format(currentMonth, "yyyy")} />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {yearOptions.map((yearOption) => (
                          <SelectItem key={yearOption} value={String(yearOption)}>
                            {yearOption}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                ) : (
                  <span className="text-sm font-medium">{format(month, "MMMM yyyy")}</span>
                )}
                {monthIndex === 0 && (
                  <button
                    type="button"
                    onClick={handlePreviousMonth}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                    )}
                    aria-label="Previous month"
                    disabled={
                      withDropdowns &&
                      getYear(currentMonth) === resolvedYearRange.start &&
                      getMonth(currentMonth) === 0
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
                {monthIndex === months.length - 1 && (
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                    )}
                    aria-label="Next month"
                    disabled={
                      withDropdowns &&
                      getYear(addMonths(currentMonth, numberOfMonths - 1)) === resolvedYearRange.end &&
                      getMonth(addMonths(currentMonth, numberOfMonths - 1)) === 11
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="w-full">
                <div className="grid grid-cols-7 gap-1 text-muted-foreground">
                  {WEEKDAY_LABELS.map((label) => (
                    <span key={label} className="w-9 text-center text-[0.8rem] font-normal">
                      {label}
                    </span>
                  ))}
                </div>

                <div className="mt-2 space-y-2">
                  {monthMatrix.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex w-full gap-1">
                      {week.map((day) => {
                        const isOutside = !isSameMonth(day, month);
                        const isDisabled = Boolean(disabled?.(day));

                        if (isOutside && !showOutsideDays) {
                          return <span key={day.getTime()} className="w-9" />;
                        }

                        const isSelectedSingle = singleValue ? isSameDay(day, singleValue) : false;
                        const isRangeStart = rangeStart ? isSameDay(day, rangeStart) : false;
                        const isRangeEnd = rangeEnd ? isSameDay(day, rangeEnd) : false;
                        const isInRange =
                          rangeStart &&
                          rangeEnd &&
                          isWithinInterval(day, { start: rangeStart, end: rangeEnd }) &&
                          !isRangeStart &&
                          !isRangeEnd;
                        const isToday = isTodayFn(day);

                        const dayClasses = cn(
                          buttonVariants({ variant: "ghost" }),
                          "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
                          "flex items-center justify-center text-sm",
                          isSelectedSingle || isRangeStart || isRangeEnd
                            ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                            : undefined,
                          isInRange ? "bg-primary/10 text-primary" : undefined,
                          isOutside ? "text-muted-foreground opacity-50" : undefined,
                          isDisabled ? "pointer-events-none opacity-30" : undefined,
                          isToday && !isSelectedSingle && !isRangeStart && !isRangeEnd ? "text-accent-foreground" : undefined,
                        );

                        const handleMouseEnter = () => {
                          if (mode === "range" && rangeValue?.from && !rangeValue?.to) {
                            setHoveredDate(day);
                          }
                        };

                        const handleMouseLeave = () => {
                          if (mode === "range" && rangeValue?.from && !rangeValue?.to) {
                            setHoveredDate(null);
                          }
                        };

                        return (
                          <button
                            key={day.getTime()}
                            type="button"
                            aria-label={format(day, "PPP")}
                            aria-selected={isSelectedSingle || isRangeStart || isRangeEnd || isInRange}
                            onClick={() => handleDayClick(day)}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                            disabled={isDisabled}
                            className={dayClasses}
                          >
                            <span className={cn("leading-none", isToday ? "font-semibold" : undefined)}>
                              {format(day, "d")}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

Calendar.displayName = "Calendar";

export { Calendar };
