import createMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";

const handleI18nRouting = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const response = handleI18nRouting(request);
  return updateSession(request, response);
}

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and API routes handled elsewhere.
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
