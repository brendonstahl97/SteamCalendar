import type { WishlistGame } from "@/lib/integrations/types";
import { gameToEvent, toGoogleCalendarTemplateUrl } from "@/lib/integrations/events";

type GoogleCalendarLinkProps = {
  game: WishlistGame;
  fullWidth?: boolean;
};

const linkClasses =
  "inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-surface-elevated px-3 py-2 text-center text-sm font-semibold text-balance text-foreground transition duration-200 hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-4";

export function GoogleCalendarLink({ game, fullWidth = true }: GoogleCalendarLinkProps) {
  const event = gameToEvent(game);
  if (!event) {
    return null;
  }

  const url = toGoogleCalendarTemplateUrl(event);
  if (!url) {
    return null;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${linkClasses} ${fullWidth ? "w-full" : "w-auto"}`}
    >
      Add to Google Calendar
    </a>
  );
}
