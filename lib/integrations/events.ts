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

export function toGoogleEventPayload(event: EventTarget) {
  return {
    summary: event.title,
    description: event.description,
    start: { date: event.date },
    end: { date: event.date },
  };
}

function formatDateForICS(date: string) {
  return date.replaceAll("-", "");
}

function nextDay(date: string) {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
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
    rows.push(`SUMMARY:${event.title.replaceAll(",", "\\,")}`);
    rows.push(`DESCRIPTION:${event.description.replaceAll("\n", "\\n")}`);
    rows.push("END:VEVENT");
  }

  rows.push("END:VCALENDAR");
  return rows.join("\r\n");
}
