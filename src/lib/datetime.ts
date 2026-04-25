const TIME_ZONE = "Asia/Kolkata";
const TIME_ZONE_OFFSET = "+05:30";

export const APPOINTMENT_TIME_ZONE = TIME_ZONE;
export const APPOINTMENT_TIME_ZONE_OFFSET = TIME_ZONE_OFFSET;
export const APPOINTMENT_SLOT_TIMES = [
  "10:00 AM",
  "11:30 AM",
  "2:00 PM",
  "4:30 PM",
  "6:00 PM",
] as const;

export function parseTimeLabel(time: string) {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    throw new Error(`Invalid time label: ${time}`);
  }

  let hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours !== 12) {
    hours += 12;
  }

  if (period === "AM" && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
}

export function parseAppointmentDate(date: string) {
  return new Date(`${date}T12:00:00`);
}

export function formatAppointmentDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: TIME_ZONE,
  }).format(parseAppointmentDate(date));
}

export function getTimeSortValue(time: string) {
  const { hours, minutes } = parseTimeLabel(time);
  return hours * 60 + minutes;
}

export function compareAppointmentSlots(
  a: { date: string; time: string },
  b: { date: string; time: string },
) {
  if (a.date !== b.date) {
    return a.date.localeCompare(b.date);
  }

  return getTimeSortValue(a.time) - getTimeSortValue(b.time);
}

export function buildCalendarDateTime(date: string, time: string) {
  const { hours, minutes } = parseTimeLabel(time);
  const dateTime = `${date}T${String(hours).padStart(2, "0")}:${String(
    minutes,
  ).padStart(2, "0")}:00${TIME_ZONE_OFFSET}`;

  return {
    dateTime,
    timeZone: TIME_ZONE,
  };
}
