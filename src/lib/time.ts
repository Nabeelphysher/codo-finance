import { format, isValid, parse } from "date-fns";

/**
 * Returns the current time in display-friendly 12-hour format.
 */
export const getCurrentDisplayTime = () => format(new Date(), "hh:mm aa");

/**
 * Converts a 24-hour formatted time string (HH:mm) into 12-hour display format.
 */
export const format24HourToDisplay = (value?: string | null): string => {
  if (!value) {
    return "";
  }

  const parsed = parse(value, "HH:mm", new Date());
  if (!isValid(parsed)) {
    return "";
  }

  return format(parsed, "hh:mm aa");
};

/**
 * Converts a 12-hour display string (HH:MM AM/PM) into 24-hour format.
 */
export const displayTimeTo24Hour = (value: string): string | null => {
  if (!value) {
    return null;
  }

  const parsed = parse(value.trim().toUpperCase(), "hh:mm aa", new Date());
  if (!isValid(parsed)) {
    return null;
  }

  return format(parsed, "HH:mm");
};

/**
 * Combines a date (yyyy-MM-dd) and a 24-hour time (HH:mm) into an ISO timestamp.
 */
export const combineDateAndTime = (date: string, time24: string): string => {
  const parsed = parse(`${date} ${time24}`, "yyyy-MM-dd HH:mm", new Date());
  if (isValid(parsed)) {
    return parsed.toISOString();
  }

  const fallback = new Date(`${date}T${time24}:00`);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback.toISOString();
  }

  return new Date().toISOString();
};

