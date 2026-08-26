import { getAuth } from "@/auth/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const dynamic = "force-dynamic";

const handler = (() => {
  let cached: ReturnType<typeof toNextJsHandler> | undefined;
  return () => {
    if (!cached) cached = toNextJsHandler(getAuth().handler);
    return cached;
  };
})();

export const GET = () => handler().GET;
export const POST = () => handler().POST;
