"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { User } from "@/types"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/layout/sheet"
import { Menu, Bell, MessageSquare, Briefcase, PlusCircle, LayoutDashboard } from "lucide-react"
import { cn, getInitials } from "@/lib/utils"
import type { UserRole } from "@/types"

const navLinks: Array<{ href: string; label: string; icon: any; roles: UserRole[] }> = [
  { href: "/gigs", label: "Browse Gigs", icon: Briefcase, roles: ["editor", "agency", "client"] },
  { href: "/gigs/post", label: "Post a Gig", icon: PlusCircle, roles: ["client"] },
  { href: "/messages", label: "Messages", icon: MessageSquare, roles: ["client", "editor", "agency"] },
  { href: "/notifications", label: "Notifications", icon: Bell, roles: ["client", "editor", "agency"] },
]

export function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data } = await supabase.from("users").select("*").eq("id", session.user.id).single()
        setUser(data as User)
      }
      setLoading(false)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data } = await supabase.from("users").select("*").eq("id", session.user.id).single()
        setUser(data as User)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth")
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  const filteredLinks = navLinks.filter((link) => {
    if (!user) return false
    return link.roles.some((r: UserRole) => user.roles.includes(r))
  })

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold tracking-tight">
              VEC
            </Link>
            {user && (
              <div className="hidden md:flex items-center gap-1">
                {filteredLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <Button
                      variant={isActive(link.href) ? "secondary" : "ghost"}
                      size="sm"
                      className="gap-2"
                    >
                      <link.icon className="h-4 w-4" />
                      {link.label}
                    </Button>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {loading ? null : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatar_url || ""} />
                      <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-sm font-medium truncate">{user.full_name || user.email}</div>
                  <div className="px-2 py-0.5 text-xs text-muted-foreground capitalize">{user.roles.join(", ")}</div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push(`/profile/${user.id}`)}>
                    View Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/profile/edit")}>
                    Edit Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => router.push("/auth")}>Sign In</Button>
                <Button onClick={() => router.push("/auth")}>Get Started</Button>
              </div>
            )}

            {user && (
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <div className="flex flex-col gap-2 mt-8">
                    {filteredLinks.map((link) => (
                      <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
                        <Button variant={isActive(link.href) ? "secondary" : "ghost"} className="w-full justify-start gap-3">
                          <link.icon className="h-5 w-5" />
                          {link.label}
                        </Button>
                      </Link>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
