"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Gig, Application, User, ApplicationStage } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, MessageSquare, UserCheck, Eye } from "lucide-react"
import { formatDate, getInitials, formatRelativeTime } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"

const stages = ["applied", "shortlisted", "interviewing", "hired"] as const

export default function GigPipelinePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [gig, setGig] = useState<Gig | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push("/auth"); return }

      const gigRes = await fetch(`/api/gigs/${params.id}`)
      const gigData = await gigRes.json()
      if (!gigData.gig || gigData.gig.client_id !== session.user.id) {
        router.push("/dashboard")
        return
      }
      setGig(gigData.gig)

      const appsRes = await fetch(`/api/gigs/${params.id}/applications`)
      const appsData = await appsRes.json()
      setApplications(appsData.applications || [])

      setLoading(false)
    }
    load()
  }, [params.id, router])

  const updateStage = async (appId: string, stage: string) => {
    const res = await fetch(`/api/gigs/${params.id}/applications/${appId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    })

    if (res.ok) {
      setApplications((apps) =>
        apps.map((a) => (a.id === appId ? { ...a, stage: stage as ApplicationStage } : a))
      )
      toast({ title: "Updated", description: `Application moved to ${stage}` })
    } else {
      const data = await res.json()
      toast({ title: "Error", description: data.error, variant: "destructive" })
    }
  }

  const createThread = async (applicantId: string) => {
    const res = await fetch("/api/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gig_id: params.id, applicant_id: applicantId }),
    })
    const data = await res.json()
    if (res.ok) {
      router.push("/messages")
    } else {
      toast({ title: "Error", description: data.error, variant: "destructive" })
    }
  }

  const filteredApps = activeTab === "all"
    ? applications
    : applications.filter((a) => a.stage === activeTab)

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>
  if (!gig) return null

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button variant="ghost" size="sm" onClick={() => router.push("/gigs/manage")} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Gigs
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">{gig.title}</h1>
        <p className="text-muted-foreground">Applicant Pipeline</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {stages.map((stage) => (
          <Card key={stage}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{applications.filter((a) => a.stage === stage).length}</p>
              <p className="text-sm text-muted-foreground capitalize">{stage}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({applications.length})</TabsTrigger>
          {stages.map((stage) => (
            <TabsTrigger key={stage} value={stage} className="capitalize">
              {stage} ({applications.filter((a) => a.stage === stage).length})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredApps.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No applications in this stage.</p>
          ) : (
            <div className="space-y-4">
              {filteredApps.map((app) => {
                const applicant = app.applicant
                const isAgency = applicant?.roles.includes("agency")
                const isHired = app.stage === "hired"
                return (
                  <Card key={app.id}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={applicant?.avatar_url || ""} />
                            <AvatarFallback>{getInitials(applicant?.full_name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{applicant?.full_name || "Unknown"}</p>
                              {isAgency && <Badge variant="secondary" className="text-xs">Agency</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">Applied {formatRelativeTime(app.applied_at)}</p>
                            {app.cover_note && (
                              <p className="text-sm text-muted-foreground line-clamp-2">{app.cover_note}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isHired && (
                            <>
                              {stages.indexOf(app.stage) < stages.indexOf("hired") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateStage(app.id, stages[stages.indexOf(app.stage) + 1])}
                                >
                                  <UserCheck className="h-4 w-4 mr-1" />
                                  Move to {stages[stages.indexOf(app.stage) + 1]}
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => createThread(app.applicant_id)}>
                                <MessageSquare className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" asChild>
                            <a href={`/profile/${app.applicant_id}`}><Eye className="h-4 w-4" /></a>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
