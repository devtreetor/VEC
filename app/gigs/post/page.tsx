"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { User } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft } from "lucide-react"

export default function PostGigPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: "",
    description: "",
    gig_type: "one_time" as "one_time" | "recurring",
    recur_date: "",
  })

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push("/auth"); return }
      const { data: dbUser } = await supabase.from("users").select("*").eq("id", session.user.id).single()
      if (!dbUser?.roles.includes("client")) {
        toast({ title: "Access Denied", description: "Only clients can post gigs", variant: "destructive" })
        router.push("/dashboard")
        return
      }
      setUser(dbUser as User)
      setLoading(false)
    }
    check()
  }, [router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const payload: any = {
      title: form.title,
      description: form.description,
      gig_type: form.gig_type,
    }
    if (form.gig_type === "recurring" && form.recur_date) {
      payload.recur_date = form.recur_date
    }

    const res = await fetch("/api/gigs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (!res.ok) {
      if (data.error === "gig_limit_reached") {
        toast({
          title: "Gig Limit Reached",
          description: `You've reached the maximum of 4 active gigs. Contact ${data.contact} to increase your limit.`,
          variant: "destructive",
        })
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } else {
      toast({ title: "Gig Posted!", description: "Your gig is now live." })
      router.push(`/gigs/manage/${data.gig.id}`)
    }
    setSubmitting(false)
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>
  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Post a Gig</CardTitle>
          <CardDescription>Create a new video editing gig for editors to apply to.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required placeholder="e.g., YouTube Video Editor Needed" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required rows={6} placeholder="Describe the project, requirements, and expectations..." />
            </div>
            <div className="space-y-2">
              <Label>Gig Type</Label>
              <div className="flex gap-2">
                <Button type="button" variant={form.gig_type === "one_time" ? "default" : "outline"} className="flex-1" onClick={() => setForm((f) => ({ ...f, gig_type: "one_time", recur_date: "" }))}>One-Time</Button>
                <Button type="button" variant={form.gig_type === "recurring" ? "default" : "outline"} className="flex-1" onClick={() => setForm((f) => ({ ...f, gig_type: "recurring" }))}>Recurring</Button>
              </div>
            </div>
            {form.gig_type === "recurring" && (
              <div className="space-y-2">
                <Label htmlFor="recur_date">Reopen Date (optional)</Label>
                <Input id="recur_date" type="date" value={form.recur_date} onChange={(e) => setForm((f) => ({ ...f, recur_date: e.target.value }))} />
                <p className="text-xs text-muted-foreground">If set, the gig will automatically reopen on this date.</p>
              </div>
            )}
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-4">
                Active gigs: {user.active_gig_count} / 4
              </p>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Posting..." : "Post Gig"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
