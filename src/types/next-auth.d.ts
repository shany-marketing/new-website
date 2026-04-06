import "next-auth";

declare module "next-auth" {
  interface User {
    hotelId?: string | null;
    /** Populated for chain_manager: all hotels they can access */
    hotelIds?: string[];
    role?: string;
    chainName?: string | null;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      hotelId?: string | null;
      /** Populated for chain_manager: all hotels they can access */
      hotelIds?: string[];
      plan?: string;
      role?: string;
      chainName?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    hotelId?: string | null;
    /** Populated for chain_manager: all hotels they can access */
    hotelIds?: string[];
    plan?: string;
    role?: string;
    chainName?: string | null;
  }
}
