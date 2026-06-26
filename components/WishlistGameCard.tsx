import { GoogleCalendarLink } from "@/components/GoogleCalendarLink";
import type { WishlistGame } from "@/lib/integrations/types";

type WishlistGameCardProps = {
  game: WishlistGame;
  selected: boolean;
  disabled: boolean;
  animationDelayMs?: number;
  onToggle: (checked: boolean) => void;
};

export function WishlistGameCard({
  game,
  selected,
  disabled,
  animationDelayMs = 0,
  onToggle,
}: WishlistGameCardProps) {
  const checkboxId = `game-select-${game.appId}`;

  return (
    <li
      className="wishlist-item-enter min-w-0 rounded-xl border border-border bg-surface p-4"
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      <label
        htmlFor={checkboxId}
        className="flex min-h-11 cursor-pointer items-start gap-3 py-1"
      >
        <input
          id={checkboxId}
          type="checkbox"
          className="mt-1 size-5 shrink-0 accent-accent"
          checked={selected}
          disabled={disabled}
          onChange={(event) => onToggle(event.target.checked)}
        />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 break-words font-semibold text-foreground">
            {game.name}
          </p>
          <p className="mt-1 text-xs text-muted">Release: {game.releaseDateText}</p>
          <p className="hidden text-xs text-muted min-[400px]:block">
            App ID: {game.appId}
          </p>
        </div>
      </label>
      <div className="mt-3 min-w-0">
        <GoogleCalendarLink game={game} />
      </div>
    </li>
  );
}
