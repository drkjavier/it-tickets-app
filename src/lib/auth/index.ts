import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@/generated/prisma/client";

export type { Role };

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-change-in-production"
);

const COOKIE_NAME = "auth_token";

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(payload.exp || "7d")
    .sign(JWT_SECRET);
}

export async function verifyToken(
  token: string
): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const { default: prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) return null;

  return user;
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function requireRole(user: AuthUser | null, ...roles: Role[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

export function canManageProject(user: AuthUser | null): boolean {
  return user?.role === "ADMIN";
}

export function canViewEnvironments(user: AuthUser | null): boolean {
  return user?.role === "ADMIN" || user?.role === "IT";
}

export function canAssignTicket(user: AuthUser | null): boolean {
  return user?.role === "ADMIN";
}

export function canAutoAssign(user: AuthUser | null): boolean {
  return user?.role === "ADMIN" || user?.role === "IT";
}

export function canManageSubtasks(user: AuthUser | null): boolean {
  return user?.role === "ADMIN" || user?.role === "IT";
}

export function canChangeStatusToTerminated(
  user: AuthUser | null,
  ticketCreatorId: string
): boolean {
  return user?.id === ticketCreatorId;
}

export function isTerminated(status: string): boolean {
  return status === "TERMINATED";
}
