import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n";
import { jsonError, toErrorResponse } from "@/server/services/http";
import { z } from "zod";
import { parseJsonBody } from "@/server/services/request-security";

const localeSchema = z.object({ locale: z.string() });

export async function POST(request: Request) {
  try {
    const payload = await parseJsonBody(request, localeSchema, 1024);

    if (!isLocale(payload.locale)) {
      return jsonError("Invalid locale", 422);
    }

    const cookieStore = await cookies();
    cookieStore.set(LOCALE_COOKIE, payload.locale, {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
