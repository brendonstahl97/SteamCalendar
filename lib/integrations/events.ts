import { EventTarget, WishlistGame } from "@/lib/integrations/types";

export function gameToEvent(game: WishlistGame): EventTarget | null {
  if (!game.releaseDate) {
    return null;
  }
  return {
    title: `${game.name} Release`,
    date: game.releaseDate,
    description: `Steam release for ${game.name}\n${game.storeUrl}\nOriginal release text: ${game.releaseDateText}`,
  };
}

const GOOGLE_CALENDAR_TEMPLATE_BASE =
  "https://calendar.google.com/calendar/render?action=TEMPLATE";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const MAX_TEMPLATE_DETAILS_LENGTH = 800;

function isValidIsoDate(date: string): boolean {
  if (!ISO_DATE_RE.test(date)) {
    return false;
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function formatDateForICS(date: string) {
  return date.replaceAll("-", "");
}

function nextDay(date: string) {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function toGoogleCalendarTemplateUrl(event: EventTarget): string | null {
  if (!isValidIsoDate(event.date)) {
    return null;
  }

  const startDay = formatDateForICS(event.date);
  const endDay = formatDateForICS(nextDay(event.date));
  const details =
    event.description.length > MAX_TEMPLATE_DETAILS_LENGTH
      ? event.description.slice(0, MAX_TEMPLATE_DETAILS_LENGTH)
      : event.description;

  const params = new URLSearchParams();
  params.set("text", event.title);
  params.set("dates", `${startDay}/${endDay}`);
  params.set("details", details);

  return `${GOOGLE_CALENDAR_TEMPLATE_BASE}&${params.toString()}`;
}

function escapeICS(text: string): string {
  return text
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\r\n", "\\n")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\n");
}

export function toICS(events: EventTarget[]) {
  const rows = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Steam Wishlist Calendar//EN",
    "CALSCALE:GREGORIAN",
  ];

  for (const event of events) {
    const day = formatDateForICS(event.date);
    const endDay = formatDateForICS(nextDay(event.date));
    rows.push("BEGIN:VEVENT");
    rows.push(`UID:${crypto.randomUUID()}@steamwishlistcalendar`);
    rows.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`);
    rows.push(`DTSTART;VALUE=DATE:${day}`);
    rows.push(`DTEND;VALUE=DATE:${endDay}`);
    rows.push(`SUMMARY:${escapeICS(event.title)}`);
    rows.push(`DESCRIPTION:${escapeICS(event.description)}`);
    rows.push("END:VEVENT");
  }

  rows.push("END:VCALENDAR");
  return rows.join("\r\n");
}
