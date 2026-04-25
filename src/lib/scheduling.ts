import { addDays } from "date-fns";
import {
  APPOINTMENT_SLOT_TIMES,
  compareAppointmentSlots,
  formatAppointmentDate,
  getTimeSortValue,
  parseAppointmentDate,
} from "@/lib/datetime";
import { getBusyCalendarSlots } from "@/lib/google-calendar";
import { loadAppointments, type Appointment } from "@/lib/storage";

type SlotConflictSource = "appointments" | "google-calendar";

export type AppointmentSlot = {
  date: string;
  time: string;
};

export type SlotAvailabilityResult = {
  available: boolean;
  source?: SlotConflictSource;
};

function isBlockingStatus(status: string) {
  return ["pending", "accepted", "completed"].includes(status);
}

function normalizeDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isWeekday(date: Date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

export async function isSlotAvailable(
  slot: AppointmentSlot,
  excludeAppointmentId?: string,
): Promise<SlotAvailabilityResult> {
  const appointments = await loadAppointments();

  const appointmentConflict = appointments.some(
    (appointment) =>
      appointment.id !== excludeAppointmentId &&
      isBlockingStatus(appointment.status) &&
      appointment.date === slot.date &&
      appointment.time === slot.time,
  );

  if (appointmentConflict) {
    return { available: false, source: "appointments" };
  }

  const busySlots = await getBusyCalendarSlots(slot.date, slot.date);
  const calendarConflict = busySlots.some(
    (busySlot) => busySlot.date === slot.date && busySlot.time === slot.time,
  );

  if (calendarConflict) {
    return { available: false, source: "google-calendar" };
  }

  return { available: true };
}

export async function findNextAvailableSlot(
  preferredSlot: AppointmentSlot,
  options?: {
    excludeAppointmentId?: string;
    searchDays?: number;
  },
) {
  const searchDays = options?.searchDays ?? 30;
  const preferredDate = parseAppointmentDate(preferredSlot.date);
  const preferredTimeValue = getTimeSortValue(preferredSlot.time);
  const busySlots = await getBusyCalendarSlots(
    preferredSlot.date,
    normalizeDate(addDays(preferredDate, searchDays)),
  );
  const busySlotSet = new Set(busySlots.map((slot) => `${slot.date}|${slot.time}`));
  const appointments = await loadAppointments();
  const blockedAppointmentSet = new Set(
    appointments
      .filter(
        (appointment) =>
          appointment.id !== options?.excludeAppointmentId &&
          isBlockingStatus(appointment.status),
      )
      .map((appointment) => `${appointment.date}|${appointment.time}`),
  );

  for (let dayOffset = 0; dayOffset <= searchDays; dayOffset += 1) {
    const date = addDays(preferredDate, dayOffset);

    if (!isWeekday(date)) {
      continue;
    }

    const isoDate = normalizeDate(date);
    const slotTimes = [...APPOINTMENT_SLOT_TIMES].sort((a, b) => {
      if (dayOffset === 0) {
        return getTimeSortValue(a) - getTimeSortValue(b);
      }

      return getTimeSortValue(a) - getTimeSortValue(b);
    });

    for (const time of slotTimes) {
      if (dayOffset === 0 && getTimeSortValue(time) < preferredTimeValue) {
        continue;
      }

      const key = `${isoDate}|${time}`;
      if (blockedAppointmentSet.has(key) || busySlotSet.has(key)) {
        continue;
      }

      return {
        date: isoDate,
        time,
        displayDate: formatAppointmentDate(isoDate),
      };
    }
  }

  return null;
}

export async function reserveBestAvailableSlot(
  requestedSlot: AppointmentSlot,
  options?: {
    excludeAppointmentId?: string;
    searchDays?: number;
  },
) {
  const availability = await isSlotAvailable(
    requestedSlot,
    options?.excludeAppointmentId,
  );

  if (availability.available) {
    return {
      requested: requestedSlot,
      assigned: {
        ...requestedSlot,
        displayDate: formatAppointmentDate(requestedSlot.date),
      },
      rescheduled: false,
    };
  }

  const nextSlot = await findNextAvailableSlot(requestedSlot, options);

  if (!nextSlot) {
    return null;
  }

  return {
    requested: requestedSlot,
    assigned: nextSlot,
    rescheduled: compareAppointmentSlots(requestedSlot, nextSlot) !== 0,
    conflictSource: availability.source,
  };
}

export function buildRescheduleLog(
  requestedSlot: AppointmentSlot,
  assignedSlot: AppointmentSlot,
  notePrefix = "Requested slot was unavailable.",
) {
  return {
    status: "rescheduled",
    timestamp: new Date().toISOString(),
    note: `${notePrefix} Moved from ${formatAppointmentDate(
      requestedSlot.date,
    )} at ${requestedSlot.time} to ${formatAppointmentDate(
      assignedSlot.date,
    )} at ${assignedSlot.time}.`,
  };
}

export function appointmentSummary(appointment: Pick<Appointment, "date" | "time">) {
  return `${formatAppointmentDate(appointment.date)} at ${appointment.time}`;
}
