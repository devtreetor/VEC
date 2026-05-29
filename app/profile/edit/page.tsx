"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { User, Profile, PortfolioItem } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Trash2, ArrowLeft, ExternalLink } from "lucide-react"
import { calculateProfileCompletion, validatePortfolioUrl } from "@/lib/utils"

export default function EditProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: "",
    avatar_url: "",
    bio: "",
    location: "",
    website_url: "",
    is_public: false,
  })
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({})
  const [newPortfolioType, setNewPortfolioType] = useState<string>("youtube")
  const [newPortfolioUrl, setNewPortfolioUrl] = useState("")
  const [newPortfolioTitle, setNewPortfolioTitle] = useState("")

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push("/auth"); return }

      const { data: dbUser } = await supabase.from("users").select("*").eq("id", session.user.id).single()
      setUser(dbUser as User)

      const { data: dbProfile } = await supabase.from("profiles").select("*").eq("user_id", session.user.id).single()
      setProfile(dbProfile)

      const { data: dbPortfolio } = await supabase
        .from("portfolio_items")
        .select("*")
        .eq("user_id", session.user.id)
        .order("display_order")
      setPortfolio(dbPortfolio || [])

      setForm({
        full_name: dbUser?.full_name || "",
        avatar_url: dbUser?.avatar_url || "",
        bio: dbProfile?.bio || "",
        location: dbProfile?.location || "",
        website_url: dbProfile?.website_url || "",
        is_public: dbUser?.is_public || false,
      })
      setSocialLinks(dbProfile?.social_links || {})

      setLoading(false)
    }
    load()
  }, [router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        social_links: socialLinks,
      }),
    })

    if (res.ok) {
      toast({ title: "Profile Updated", description: "Your profile has been saved." })
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data: updatedUser } = await supabase.from("users").select("*").eq("id", session.user.id).single()
        if (updatedUser) setUser(updatedUser)
        const { data: updatedProfile } = await supabase.from("profiles").select("*").eq("user_id", session.user.id).single()
        if (updatedProfile) setProfile(updatedProfile)
      }
    } else {
      const data = await res.json()
      toast({ title: "Error", description: data.error, variant: "destructive" })
    }
    setSaving(false)
  }

  const addPortfolio = async () => {
    if (!newPortfolioUrl) return
    const validation = validatePortfolioUrl(newPortfolioType, newPortfolioUrl)
    if (!validation.valid) {
      toast({ title: "Invalid URL", description: validation.reason, variant: "destructive" })
      return
    }

    const res = await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: newPortfolioType,
        url: newPortfolioUrl,
        title: newPortfolioTitle || undefined,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      setPortfolio((p) => [...p, data.item])
      setNewPortfolioUrl("")
      setNewPortfolioTitle("")
      toast({ title: "Added", description: "Portfolio item added." })
    } else {
      const data = await res.json()
      toast({ title: "Error", description: data.error, variant: "destructive" })
    }
  }

  const removePortfolio = async (id: string) => {
    const res = await fetch(`/api/portfolio/${id}`, { method: "DELETE" })
    if (res.ok) {
      setPortfolio((p) => p.filter((item) => item.id !== id))
      toast({ title: "Removed", description: "Portfolio item removed." })
    }
  }

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>
  if (!user) return null

  const completion = calculateProfileCompletion(
    { ...form, social_links: socialLinks },
    portfolio
  )

  const isEditorOrAgency = user.roles.some((r) => r === "editor" || r === "agency")

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit Profile</h1>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${completion}%` }} />
          </div>
          <span className="text-sm font-medium">{completion}%</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar">Avatar URL</Label>
              <Input id="avatar" value={form.avatar_url} onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website URL</Label>
              <Input id="website" value={form.website_url} onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))} placeholder="https://" />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="public" checked={form.is_public} onCheckedChange={(v) => setForm((f) => ({ ...f, is_public: v }))} />
              <Label htmlFor="public">Make profile publicly visible</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Social Links</CardTitle>
            <CardDescription>Add your social media profiles.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {["twitter", "instagram", "linkedin", "tiktok"].map((platform) => (
              <div key={platform} className="flex items-center gap-2">
                <Label className="w-24 capitalize shrink-0">{platform}</Label>
                <Input
                  value={socialLinks[platform] || ""}
                  onChange={(e) => setSocialLinks((s) => ({ ...s, [platform]: e.target.value }))}
                  placeholder={`https://${platform}.com/...`}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {isEditorOrAgency && (
          <Card>
            <CardHeader>
              <CardTitle>Portfolio</CardTitle>
              <CardDescription>Add links to your work.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-2">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newPortfolioType} onValueChange={setNewPortfolioType}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["youtube", "vimeo", "drive", "website", "social"].map((t) => (
                        <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-2">
                  <Label>URL</Label>
                  <Input value={newPortfolioUrl} onChange={(e) => setNewPortfolioUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={newPortfolioTitle} onChange={(e) => setNewPortfolioTitle(e.target.value)} placeholder="Optional" />
                </div>
                <Button type="button" size="icon" onClick={addPortfolio}><Plus className="h-4 w-4" /></Button>
              </div>

              {portfolio.length > 0 && (
                <div className="space-y-2">
                  {portfolio.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3 min-w-0">
                        <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.title || item.url}</p>
                          <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removePortfolio(item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </form>
    </div>
  )
}
