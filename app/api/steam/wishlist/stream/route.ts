import { getSession } from "@/lib/session";
import { streamWishlistGames } from "@/lib/integrations/steam";

export const maxDuration = 60;

function sseEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET() {
  const session = await getSession();
  if (!session.steamConnected || !session.steamId) {
    return new Response(sseEvent("error", { message: "Steam is not connected." }), {
      status: 401,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const push = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sseEvent(event, data)));
      };

      try {
        push("status", { stage: "loading", message: "Loading wishlist..." });
        const finalProgress = await streamWishlistGames(session.steamId!, {
          onItem(item) {
            push("item", item);
          },
          onProgress(progress) {
            push("progress", progress);
          },
        });

        push("done", {
          ...finalProgress,
          message:
            finalProgress.failed > 0
              ? "Some games could not be loaded due to rate limits."
              : "Wishlist loaded successfully.",
        });
      } catch (error) {
        push("error", {
          message: error instanceof Error ? error.message : "Failed to stream wishlist.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
