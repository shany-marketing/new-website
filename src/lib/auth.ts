import NextAuth from "next-auth";
import type { Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { query, queryOne } from "./db";
import { getHotelPlan } from "./plan";
import { NextResponse } from "next/server";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await queryOne<{
          id: string;
          email: string;
          password_hash: string;
          name: string | null;
          hotel_id: string | null;
          role: string;
          chain_name: string | null;
        }>(
          "SELECT id, email, password_hash, name, hotel_id, COALESCE(role, 'user') as role, chain_name FROM users WHERE email = $1",
          [credentials.email as string]
        );

        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        );
        if (!valid) return null;

        // For chain managers, load all their assigned hotels from the access table
        let hotelIds: string[] | undefined;
        if (user.role === "chain_manager") {
          const rows = await query<{ hotel_id: string }>(
            "SELECT hotel_id FROM chain_hotel_access WHERE user_id = $1",
            [user.id]
          );
          hotelIds = rows.map((r) => r.hotel_id);
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          hotelId: user.hotel_id,
          hotelIds,
          role: user.role,
          chainName: user.chain_name,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.hotelId = user.hotelId;
        token.hotelIds = user.hotelIds;
        token.role = user.role ?? "user";
        token.chainName = user.chainName;
      }
      // Refresh role + plan + hotelIds from DB on each token refresh
      if (token.id) {
        try {
          const dbUser = await queryOne<{ role: string; hotel_id: string | null; chain_name: string | null }>(
            "SELECT COALESCE(role, 'user') as role, hotel_id, chain_name FROM users WHERE id = $1",
            [token.id as string]
          );
          if (dbUser) {
            token.role = dbUser.role;
            token.hotelId = dbUser.hotel_id;
            token.chainName = dbUser.chain_name;
          }
          // Refresh chain manager hotel list so newly assigned hotels appear immediately
          if (token.role === "chain_manager") {
            const rows = await query<{ hotel_id: string }>(
              "SELECT hotel_id FROM chain_hotel_access WHERE user_id = $1",
              [token.id as string]
            );
            token.hotelIds = rows.map((r) => r.hotel_id);
          }
        } catch {
          // keep existing token values on DB error
        }
      }
      if (token.hotelId) {
        try {
          token.plan = await getHotelPlan(token.hotelId as string);
        } catch {
          token.plan = "free";
        }
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.hotelId = token.hotelId as string | undefined;
      session.user.hotelIds = token.hotelIds as string[] | undefined;
      session.user.plan = (token.plan as string) ?? "free";
      session.user.role = (token.role as string) ?? "user";
      session.user.chainName = (token.chainName as string) ?? undefined;
      return session;
    },
  },
});

// ── Authorization Helpers ──────────────────────────────────────────

/**
 * Require an authenticated user. Returns session or a 401 response.
 */
export async function requireAuth(): Promise<
  { session: Session; error?: never } | { session?: never; error: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}

/**
 * Require that the authenticated user has access to a specific hotel.
 * - Admins can access any hotel.
 * - Regular users can only access their own hotel.
 * Returns session or a 401/403 response.
 */
export async function requireHotelAccess(hotelId: string): Promise<
  { session: Session; error?: never } | { session?: never; error: NextResponse }
> {
  const result = await requireAuth();
  if (result.error) return result;

  const { session } = result;
  const isAdmin = session.user.role === "admin";
  const isChainManager = session.user.role === "chain_manager";
  const ownsHotel = session.user.hotelId === hotelId;
  const hasChainAccess = isChainManager && (session.user.hotelIds ?? []).includes(hotelId);

  if (!isAdmin && !ownsHotel) {
    // Check chain_manager access
    if (session.user.role === "chain_manager") {
      const access = await queryOne(
        "SELECT 1 FROM chain_hotel_access WHERE user_id = $1 AND hotel_id = $2",
        [session.user.id, hotelId]
      );
      if (access) return { session };
    }


    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { session };
}

/**
 * Require admin role. Returns session or a 403 response.
 */
export async function requireAdmin(): Promise<
  { session: Session; error?: never } | { session?: never; error: NextResponse }
> {
  const result = await requireAuth();
  if (result.error) return result;

  if (result.session.user.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { session: result.session };
}

/**
 * Get all hotel IDs a chain manager has access to.
 */
export async function getChainHotelIds(userId: string): Promise<string[]> {
  const rows = await query<{ hotel_id: string }>(
    "SELECT hotel_id FROM chain_hotel_access WHERE user_id = $1",
    [userId]
  );
  return rows.map((r) => r.hotel_id);
}
