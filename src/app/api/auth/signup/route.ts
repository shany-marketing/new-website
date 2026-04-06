import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query, queryOne } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, isChainManager, chainName } = body;

    // Type validation
    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 255) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    if (password.length < 8 || password.length > 72) {
      return NextResponse.json(
        { error: "Password must be between 8 and 72 characters" },
        { status: 400 }
      );
    }

    // Name validation (optional but limit length)
    if (name && (typeof name !== "string" || name.length > 100)) {
      return NextResponse.json(
        { error: "Name must be under 100 characters" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await queryOne(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Chain manager validation
    const role = isChainManager ? "chain_manager" : "user";
    const cleanChainName = isChainManager && typeof chainName === "string" ? chainName.trim() : null;
    if (isChainManager && (!cleanChainName || cleanChainName.length === 0)) {
      return NextResponse.json(
        { error: "Chain name is required for chain managers" },
        { status: 400 }
      );
    }
    if (cleanChainName && cleanChainName.length > 100) {
      return NextResponse.json(
        { error: "Chain name must be under 100 characters" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await queryOne<{ id: string; email: string }>(
      `INSERT INTO users (email, password_hash, name, role, chain_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email`,
      [email, passwordHash, name || null, role, cleanChainName]
    );

    return NextResponse.json({
      id: user!.id,
      email: user!.email,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
