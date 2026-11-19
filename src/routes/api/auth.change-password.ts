import { createFileRoute } from "@tanstack/react-router";
import { bearer, getSessionUser } from "@/lib/auth.server";

// Security gate: the legacy endpoint must never write a password directly.
// Stage 2 will replace this response with a verified request + independent IT approval flow.
export const Route = createFileRoute("/api/auth/change-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await getSessionUser(bearer(request));
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
        return Response.json(
          { error: "Password changes require email verification and IT approval. This workflow is being upgraded." },
          { status: 403 },
        );
      },
    },
  },
});
