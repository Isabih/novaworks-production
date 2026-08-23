import { createServerFn } from "@tanstack/react-start";
import { requireMysqlAuth } from "@/integrations/mysql/auth-middleware";
import { sendSms, type SmsMode } from "./sms.server";

export const sendSmsTest = createServerFn({ method: "POST" })
  .middleware([requireMysqlAuth])
  .validator((d: { to: string; message: string; mode: SmsMode }) => d)
  .handler(async ({ data, context }) => {
    if (!context.roles.includes("it")) throw new Error("Only IT can test SMS");
    const to = String(data.to || "").trim();
    const message = String(data.message || "").trim();
    if (!to) throw new Error("Enter a destination phone number");
    if (!message) throw new Error("Enter a test message");
    try {
      const payload = await sendSms(to, message, data.mode, "it_test");
      return { ok: true, status: "sent", payload };
    } catch (error: any) {
      return {
        ok: false,
        status: "failed",
        error: error?.message || "SMS test failed",
        providerStatus: error?.providerStatus ?? null,
        providerPayload: error?.providerPayload ?? null,
        endpoint: error?.endpoint ?? null,
      };
    }
  });
