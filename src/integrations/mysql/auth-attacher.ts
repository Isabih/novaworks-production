import { createMiddleware } from "@tanstack/react-start";

export const attachMysqlAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("novaworks_session") : null;
  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});
