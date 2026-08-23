import { useEffect, useRef, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, dashboardPathFor, type AppRole } from "@/lib/use-auth";
import { toast } from "sonner";

/**
 * Soft role gate. The central /_authenticated route already enforces
 * role-based deep-link gating server-side, so this component never blocks
 * rendering with a spinner. It only fires a redirect once roles are loaded
 * and confirmed insufficient — children render immediately otherwise.
 */
export function RoleGate({
  allow,
  exclusive = false,
  children,
}: {
  allow: AppRole[];
  /** When true, only the listed roles pass — admin/IT get no implicit override. */
  exclusive?: boolean;
  children: ReactNode;
}) {
  const { roles, primaryRole, rolesLoaded, session } = useAuth();
  const navigate = useNavigate();
  const customerOnly = allow.length === 1 && allow[0] === "customer";
  const systemOverride = !exclusive && !customerOnly && (roles.includes("admin") || roles.includes("it"));
  const allowed = systemOverride || allow.some((r) => roles.includes(r));
  const toasted = useRef(false);

  useEffect(() => {
    if (!session || !rolesLoaded) return;
    if (!allowed) {
      if (!toasted.current) {
        toasted.current = true;
        toast.error("Redirecting you to your dashboard.");
      }
      navigate({ to: dashboardPathFor(primaryRole), replace: true });
    }
  }, [rolesLoaded, allowed, primaryRole, navigate, session]);

  return <>{children}</>;
}
