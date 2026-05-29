"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { User, UserRole, Gig, Application } from "@/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Briefcase, FileText, UserCheck, AlertCircle, PlusCircle } from "lucide-react"
import { formatDate, getInitials } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [gigs, setGigs] = useState<Gig[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push("/auth"); return }

      const { data: dbUser } = await supabase.from("users").select("*").eq("id", session.user.id).single()
      setUser(dbUser as User)

      if (dbUser?.roles.includes("client")) {
          const { data: clientGigs } = await supabase
            .from("gigs")
            .select("*")
            .eq("client_id", session.user.id)
            .order("created_at", { ascending: false })
            .limit(5)

          const fetchedGigs = clientGigs || [];
          setGigs(fetchedGigs)

          if (fetchedGigs.length > 0) {
            const { data: clientApps } = await supabase
              .from("applications")
              .select("*, gig:gig_id(*), applicant:applicant_id(*)")
              .in("gig_id", fetchedGigs.map((g: { id: string }) => g.id))
              .eq("is_withdrawn", false)
              .order("applied_at", { ascending: false })
              .limit(10)
            setApplications(clientApps || [])
          }
        }

      if (dbUser?.roles.some((r: UserRole) => r === "editor" || r === "agency")) {
        const { data: myApps } = await supabase
          .from("applications")
          .select("*, gig:gig_id(*, client:client_id(id, full_name, avatar_url))")
          .eq("applicant_id", session.user.id)
          .eq("is_withdrawn", false)
          .order("applied_at", { ascending: false })
          .limit(10)
        setApplications(myApps || [])
      }

      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><p className="text-muted-foreground">Loading...</p></div>
  if (!user) return null

  const isClient = user.roles.includes("client")
  const isEditorOrAgency = user.roles.some((r) => r === "editor" || r === "agency")

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user.full_name || user.email}</p>
        </div>
        <div className="flex gap-2">
          {user.roles.map((r) => (
            <Badge key={r} variant="secondary" className="capitalize">{r}</Badge>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {isClient && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Gigs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{user.active_gig_count} / 4</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{gigs.reduce((s, g) => s + g.applicant_count, 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Open Gigs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{gigs.filter((g) => g.status === "open").length}</div>
              </CardContent>
            </Card>
          </>
        )}
        {isEditorOrAgency && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{applications.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Profile Completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{user.profile_completion_pct}%</div>
                {user.profile_completion_pct < 50 && (
                  <p className="text-xs text-destructive mt-1">Complete 50% to apply for gigs</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Profile Public</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {user.is_public ? (
                    <Badge variant="default">Public</Badge>
                  ) : (
                    <Badge variant="outline">Private</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {isClient && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Your Gigs</h2>
              <Button size="sm" asChild>
                <Link href="/gigs/post"><PlusCircle className="h-4 w-4 mr-1" /> Post Gig</Link>
              </Button>
            </div>
            <div className="space-y-3">
              {gigs.length === 0 && (
                <p className="text-muted-foreground text-sm">No gigs yet. Post your first gig!</p>
              )}
              {gigs.map((gig) => (
                <Link key={gig.id} href={`/gigs/manage/${gig.id}`}>
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{gig.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={gig.status === "open" ? "default" : "secondary"}>{gig.status}</Badge>
                          <Badge variant="outline">{gig.gig_type}</Badge>
                          <span className="text-xs text-muted-foreground">{gig.applicant_count} applicants</span>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(gig.created_at)}</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
              {gigs.length > 0 && (
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/gigs/manage">View All Gigs</Link>
                </Button>
              )}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold mb-4">
            {isClient ? "Recent Applications" : "Your Applications"}
          </h2>
          <div className="space-y-3">
            {applications.length === 0 && (
              <p className="text-muted-foreground text-sm">
                {isClient ? "No applications yet." : "You haven't applied to any gigs yet."}
              </p>
            )}
            {applications.map((app) => (
              <Card key={app.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{app.gig?.title || "Gig"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{app.stage}</Badge>
                        {isClient && app.applicant && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={app.applicant.avatar_url || ""} />
                              <AvatarFallback className="text-[10px]">{getInitials(app.applicant.full_name)}</AvatarFallback>
                            </Avatar>
                            {app.applicant.full_name}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(app.applied_at)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {isEditorOrAgency && user.profile_completion_pct < 50 && (
        <Card className="mt-8 border-destructive/50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Profile completion is {user.profile_completion_pct}%</p>
              <p className="text-xs text-muted-foreground">Complete at least 50% of your profile to apply for gigs.</p>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link href="/profile/edit">Complete Profile</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
