import { addSSEClient, removeSSEClient } from "@/lib/sse";
import { NextRequest } from "next/server";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const clientId = randomUUID();

  const stream = new ReadableStream({
    start(controller) {
      addSSEClient(clientId, controller);

      // Send initial heartbeat
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "CONNECTED" })}\n\n`)
      );

      // Heartbeat every 20s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "HEARTBEAT" })}\n\n`
            )
          );
        } catch {
          clearInterval(heartbeat);
        }
      }, 20000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        removeSSEClient(clientId);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
