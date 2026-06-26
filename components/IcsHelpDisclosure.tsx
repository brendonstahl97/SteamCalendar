"use client";

import { useState } from "react";

const ICS_HELP_TEXT =
  "An .ics file is a standard calendar format. You can import it into most calendar apps (Google Calendar, Outlook, Thunderbird, and many mobile calendar apps) via Import or Add calendar.";

export function IcsHelpDisclosure() {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        className="inline-flex size-6 items-center justify-center rounded-full border border-border text-xs font-bold text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        aria-expanded={open}
        aria-controls="ics-help-text"
        aria-label="About .ics files"
        onClick={() => setOpen((prev) => !prev)}
      >
        i
      </button>
      {open && (
        <p
          id="ics-help-text"
          role="region"
          className="absolute left-0 top-full z-20 mt-2 w-64 rounded-lg border border-border bg-surface-elevated p-3 text-xs leading-relaxed text-muted shadow-lg"
        >
          {ICS_HELP_TEXT}
        </p>
      )}
    </span>
  );
}
