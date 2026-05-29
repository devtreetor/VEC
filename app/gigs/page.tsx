"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Gig } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Search, MapPin, Clock, Users, ChevronLeft, ChevronRight } from "lucide-react"
import { formatDate, formatRelativeTime } from "@/lib/utils"

export default function BrowseGigsPage() {
  const [gigs, setGigs] = useState<Gig[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [isAuthed, setIsAuthed] = useState(false)
  const [typeFilter, setTypeFilter] = useState<string>("")
  const limit = 10

  useEffect(() => {
    const fetchGigs = async () => {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      const authed = !!session
      setIsAuthed(authed)

      const params = new URLSearchParams({ page: page.toString() })
      if (typeFilter) params.set("type", typeFilter)

      const res = await fetch(`/api/gigs?${params}`)
      const data = await res.json()
      setGigs(data.gigs || [])
      setCount(data.count || 0)
      setLoading(false)
    }
    fetchGigs()
  }, [page, typeFilter])

  const totalPages = isAuthed ? Math.max(1, Math.ceil(count / limit)) : 1

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Browse Gigs</h1>
          <p className="text-muted-foreground">
            {isAuthed ? "Find your next video editing project" : "Latest open gigs"}
          </p>
        </div>
        {!isAuthed && (
          <Button asChild>
            <Link href="/auth">Sign in to see all gigs</Link>
          </Button>
        )}
      </div>

      {isAuthed && (
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search gigs..." className="pl-9" />
          </div>
          <div className="flex gap-2">
            {["", "one_time", "recurring"].map((t) => (
              <Button
                key={t}
                variant={typeFilter === t ? "default" : "outline"}
                size="sm"
                onClick={() => { setTypeFilter(t); setPage(1) }}
              >
                {t === "" ? "All" : t === "one_time" ? "One-Time" : "Recurring"}
              </Button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading gigs...</div>
      ) : gigs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No gigs available right now.</div>
      ) : (
        <div className="grid gap-4">
          {gigs.map((gig) => (
            <Link key={gig.id} href={`/gigs/${gig.id}`}>
              <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold">{gig.title}</h3>
                        <Badge variant={gig.gig_type === "one_time" ? "secondary" : "default"}>
                          {gig.gig_type === "one_time" ? "One-Time" : "Recurring"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{gig.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatRelativeTime(gig.created_at)}</span>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {gig.applicant_count} applicants</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {isAuthed && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
