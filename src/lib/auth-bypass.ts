import { createSession, setSessionCookie } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

const CUSTOMER_BYPASS_PHONE = "8010004096";

export function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizePhone(value: string) {
  return normalizeDigits(value).slice(-10);
}

export function getAuthBypass(rawPhone: string) {
  const digits = normalizeDigits(rawPhone);
  const adminCode = process.env.AUTH_ADMIN_BYPASS_CODE;
  const customerCode = process.env.AUTH_CUSTOMER_BYPASS_CODE;

  if (adminCode && digits === normalizeDigits(adminCode)) {
    const phone = normalizePhone(process.env.ADMIN_PHONE ?? "");
    if (!phone) return null;
    return { phone, name: "Admin", redirect: "/admin" };
  }

  if (customerCode && digits === normalizeDigits(customerCode)) {
    return { phone: CUSTOMER_BYPASS_PHONE, name: "Customer", redirect: "/book" };
  }

  return null;
}

export async function createBypassSession(userInfo: { phone: string; name: string }) {
  const { data: user, error: userLookupError } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("phone", userInfo.phone)
    .maybeSingle();

  if (userLookupError) {
    console.error("Bypass account lookup failed:", userLookupError.message);
  }

  let sessionUser = user;
  if (!sessionUser) {
    const { data: newUser, error: createUserError } = await supabaseAdmin
      .from("users")
      .upsert({ phone: userInfo.phone, name: userInfo.name }, { onConflict: "phone" })
      .select()
      .single();

    if (createUserError || !newUser) {
      throw new Error("Failed to create bypass account");
    }

    sessionUser = newUser;
  }

  const token = await createSession(sessionUser.id);
  return setSessionCookie(token);
}
