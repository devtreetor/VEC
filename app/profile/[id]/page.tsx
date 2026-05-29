"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { User, Profile, PortfolioItem, AgencyMember } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { MapPin, Globe, ExternalLink, Youtube, Video, FileText, Link as LinkIcon, Users, ArrowLeft } from "lucide-react"
import { formatDate, getInitials } from "@/lib/utils"

export default function PublicProfilePage() {
  const params = useParams()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [agencyMembers, setAgencyMembers] = useState<AgencyMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/profile/${params.id}`)
      if (!res.ok) { setLoading(false); return }
      const data = await res.json()
      setUser(data.user)
      setProfile(data.profile)
      setPortfolio(data.portfolioItems || [])
      setAgencyMembers(data.agencyMembers || [])
      setLoading(false)
    }
    load()
  }, [params.id])

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>
  if (!user) return <div className="text-center py-12 text-muted-foreground">Profile not found</div>

  const getPortfolioIcon = (type: string) => {
    switch (type) {
      case "youtube": return <Youtube className="h-4 w-4" />
      case "vimeo": return <Video className="h-4 w-4" />
      case "drive": return <FileText className="h-4 w-4" />
      default: return <LinkIcon className="h-4 w-4" />
    }
  }

  const isAgency = user.roles.includes("agency")

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card className="mb-8">
        <CardContent className="p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user.avatar_url || ""} />
              <AvatarFallback className="text-2xl">{getInitials(user.full_name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <h1 className="text-2xl font-bold">{user.full_name || "Anonymous"}</h1>
                {isAgency && <Badge>Agency</Badge>}
              </div>
              <p className="text-muted-foreground">{user.email}</p>
              {profile?.location && (
                <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1 mt-1">
                  <MapPin className="h-3 w-3" /> {profile.location}
                </p>
              )}
              {profile?.bio && <p className="mt-4 text-sm">{profile.bio}</p>}
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-4">
                {profile?.website_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={profile.website_url} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4 mr-1" /> Website
                    </a>
                  </Button>
                )}
                {profile?.social_links && Object.entries(profile.social_links).map(([platform, url]) => (
                  <Button key={platform} variant="ghost" size="icon" asChild>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="capitalize">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isAgency && agencyMembers.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              {agencyMembers.map((member) => (
                <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.editor?.avatar_url || ""} />
                    <AvatarFallback>{getInitials(member.editor?.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{member.editor?.full_name || "Unknown"}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          {portfolio.length === 0 ? (
            <p className="text-muted-foreground text-sm">No portfolio items yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {portfolio.map((item) => (
                <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  {getPortfolioIcon(item.type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.title || item.url}</p>
                    <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
