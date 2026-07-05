/* eslint-disable @typescript-eslint/no-explicit-any */
import { decodeDemoSession } from "@/lib/demo-session";

const DEMO_WRITE_ERROR = { message: "Demo mode: connect Supabase in .env.local to save data." };

function createDemoQuery(isWrite: boolean): any {
  const proxy: any = new Proxy(() => {}, {
    get(_target, prop) {
      if (prop === "then") {
        const result = isWrite
          ? { data: null, error: DEMO_WRITE_ERROR, count: 0 }
          : { data: [], error: null, count: 0 };
        return (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
      }
      if (prop === "maybeSingle" || prop === "single") {
        return async () => ({ data: null, error: isWrite ? DEMO_WRITE_ERROR : null });
      }
      if (prop === "insert" || prop === "update" || prop === "upsert" || prop === "delete") {
        return () => createDemoQuery(true);
      }
      return () => proxy;
    },
  });
  return proxy;
}

export function createDemoSupabaseClient(options: {
  getSessionCookie: () => string | undefined;
  clearSessionCookie: () => void;
}): any {
  return {
    auth: {
      async getUser() {
        const demo = decodeDemoSession(options.getSessionCookie());
        return {
          data: {
            user: demo
              ? { id: demo.id, email: demo.email, user_metadata: { full_name: demo.fullName } }
              : null,
          },
          error: null,
        };
      },
      async signOut() {
        options.clearSessionCookie();
        return { error: null };
      },
      async signInWithPassword() {
        return { data: {}, error: { message: "Demo mode signs you in automatically." } };
      },
      async signUp() {
        return { data: { user: null, session: null }, error: { message: "Demo mode signs you up automatically." } };
      },
      async signInWithOAuth() {
        return { data: { url: null }, error: { message: "Google sign-in requires Supabase configuration." } };
      },
      async exchangeCodeForSession() {
        return { data: {}, error: null };
      },
    },
    from() {
      return createDemoQuery(false);
    },
  };
}
