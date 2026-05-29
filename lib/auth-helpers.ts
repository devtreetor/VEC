import { createClient } from "./supabase-server";
import { User } from "@/types";

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  return user as User | null;
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Authentication required");
  return user;
}

export async function requireRole(roles: string[]): Promise<User> {
  const user = await requireAuth();
  const hasRole = roles.some((r) => user.roles.includes(r as any));
  if (!hasRole) throw new Error("Insufficient permissions");
  return user;
}
