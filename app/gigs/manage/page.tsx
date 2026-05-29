"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Gig } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { PlusCircle } from "lucide-react"
import { formatDate } from "@/lib/utils"

export default function ManageGigsPage() {
  const router = useRouter()
  const [gigs, setGigs] = useState<Gig[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push("/auth"); return }

      const { data: dbUser } = await supabase.from("users").select("roles").eq("id", session.user.id).single()
      if (!dbUser?.roles.includes("client")) { router.push("/dashboard"); return }

      const { data } = await supabase
        .from("gigs")
        .select("*")
        .eq("client_id", session.user.id)
        .order("created_at", { ascending: false })
      setGigs(data || [])
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Your Gigs</h1>
          <p className="text-muted-foreground">Manage your posted gigs and review applications.</p>
        </div>
        <Button asChild>
          <Link href="/gigs/post"><PlusCircle className="h-4 w-4 mr-1" /> Post New Gig</Link>
        </Button>
      </div>

      {gigs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">You haven&apos;t posted any gigs yet.</p>
          <Button asChild><Link href="/gigs/post">Post Your First Gig</Link></Button>
        </div>
      ) : (
        <div className="space-y-3">
          {gigs.map((gig) => (
            <Link key={gig.id} href={`/gigs/manage/${gig.id}`}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{gig.title}</h3>
                        <Badge variant={gig.status === "open" ? "default" : "secondary"}>{gig.status}</Badge>
                        <Badge variant="outline">{gig.gig_type === "one_time" ? "One-Time" : "Recurring"}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{gig.applicant_count} applicant{gig.applicant_count !== 1 ? "s" : ""}</span>
                        <span>Posted {formatDate(gig.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
