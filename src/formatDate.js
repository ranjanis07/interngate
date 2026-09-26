/**
 * Formats a date-time string (e.g. "2026-09-30T14:30") into a clean 12-hour format:
 * "Sep 30, 2026 at 2:30 PM"
 */
export function formatDateTime12Hour(dtStr) {
  if (!dtStr || typeof dtStr !== "string") return "";
  try {
    // If already in 12-hour text format, return as is
    if (dtStr.includes(" AM") || dtStr.includes(" PM")) {
      return dtStr;
    }

    const d = new Date(dtStr);
    if (isNaN(d.getTime())) {
      return dtStr;
    }

    const datePart = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const timePart = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return `${datePart} at ${timePart}`;
  } catch (e) {
    return dtStr;
  }
}

/**
 * Predefined 12-hour time slots strictly between 9:00 AM and 5:00 PM
 * with 30-minute intervals for faculty review scheduling.
 */
export const REVIEW_TIME_SLOTS = [
  { value: "09:00", label: "09:00 AM" },
  { value: "09:30", label: "09:30 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "10:30", label: "10:30 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "11:30", label: "11:30 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "12:30", label: "12:30 PM" },
  { value: "13:00", label: "01:00 PM" },
  { value: "13:30", label: "01:30 PM" },
  { value: "14:00", label: "02:00 PM" },
  { value: "14:30", label: "02:30 PM" },
  { value: "15:00", label: "03:00 PM" },
  { value: "15:30", label: "03:30 PM" },
  { value: "16:00", label: "04:00 PM" },
  { value: "16:30", label: "04:30 PM" },
  { value: "17:00", label: "05:00 PM" },
];
