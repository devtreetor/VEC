"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Gig, User } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Calendar, Clock, Users, ArrowLeft, Send } from "lucide-react"
import { formatDate, getInitials } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

export default function GigDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [gig, setGig] = useState<(Gig & { client?: User }) | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [coverNote, setCoverNote] = useState("")
  const [applying, setApplying] = useState(false)
  const [hasApplied, setHasApplied] = useState(false)

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/gigs/${params.id}`)
      const data = await res.json()
      setGig(data.gig)

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: dbUser } = await supabase.from("users").select("*").eq("id", session.user.id).single()
        setUser(dbUser as User)

        if (dbUser) {
          const { data: app } = await supabase
            .from("applications")
            .select("id")
            .eq("gig_id", params.id)
            .eq("applicant_id", session.user.id)
            .single()
          setHasApplied(!!app)
        }
      }

      setLoading(false)
    }
    load()
  }, [params.id])

  const handleApply = async () => {
    if (!user) { router.push("/auth"); return }
    setApplying(true)

    const res = await fetch(`/api/gigs/${params.id}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cover_note: coverNote }),
    })

    const data = await res.json()
    if (!res.ok) {
      toast({ title: "Error", description: data.error, variant: "destructive" })
    } else {
      toast({ title: "Applied!", description: "Your application has been submitted." })
      setHasApplied(true)
    }
    setApplying(false)
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>
  if (!gig) return <div className="text-center py-12 text-muted-foreground">Gig not found</div>

  const canApply = user && !hasApplied && user.roles.some((r) => r === "editor" || r === "agency") && user.profile_completion_pct >= 50

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold">{gig.title}</h1>
            <Badge>{gig.gig_type === "one_time" ? "One-Time" : "Recurring"}</Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> Posted {formatDate(gig.created_at)}</span>
            <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {gig.applicant_count} applicants</span>
            {gig.recur_date && (
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> Reopens {formatDate(gig.recur_date)}</span>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-muted-foreground">{gig.description}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Client</CardTitle>
            </CardHeader>
            <CardContent>
              {gig.client && (
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={gig.client.avatar_url || ""} />
                    <AvatarFallback>{getInitials(gig.client.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{gig.client.full_name || "Anonymous"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="capitalize">{gig.gig_type.replace("_", " ")}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={gig.status === "open" ? "default" : "secondary"}>{gig.status}</Badge>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Applicants</span>
                <span>{gig.applicant_count}</span>
              </div>
            </CardContent>
          </Card>

          {gig.status === "open" && (
            <>
              {!user && (
                <Button className="w-full" asChild>
                  <Link href="/auth">Sign in to Apply</Link>
                </Button>
              )}
              {user && hasApplied && (
                <Button className="w-full" variant="outline" disabled>Already Applied</Button>
              )}
              {canApply && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full">Apply Now</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Apply to &ldquo;{gig.title}&rdquo;</DialogTitle>
                      <DialogDescription>Include a cover note to help the client learn about you.</DialogDescription>
                    </DialogHeader>
                    <Textarea
                      placeholder="Tell the client why you're a great fit..."
                      value={coverNote}
                      onChange={(e) => setCoverNote(e.target.value)}
                      rows={4}
                    />
                    <DialogFooter>
                      <Button onClick={handleApply} disabled={applying}>
                        {applying ? "Submitting..." : "Submit Application"} <Send className="h-4 w-4 ml-2" />
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              {user && !canApply && user.roles.some((r) => r === "editor" || r === "agency") && user.profile_completion_pct < 50 && (
                <div className="text-center">
                  <p className="text-sm text-destructive mb-2">Complete your profile to apply.</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/profile/edit">Complete Profile ({user.profile_completion_pct}%)</Link>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
