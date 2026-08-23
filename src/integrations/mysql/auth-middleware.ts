import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { bearer, getSessionUser } from "@/lib/auth.server";

export const requireMysqlAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  if (!request) throw new Error("Unauthorized");
  const token = bearer(request);
  const user = await getSessionUser(token);
  if (!user) throw new Error("Unauthorized: session expired");
  return next({ context: { userId: user.id, user, roles: user.roles, token } });
});
