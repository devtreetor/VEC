import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Search, FileText, MessageSquare, Briefcase } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Connect with Top<br />
            <span className="text-primary/80">Video Editors</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Post your video editing gigs and find the perfect editor for your project. 
            Browse portfolios, chat in real-time, and hire with confidence.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/gigs">Browse Gigs</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/auth">Get Started</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: FileText, title: "Post a Gig", desc: "Describe your project, set your requirements, and choose between one-time or recurring work." },
              { icon: Search, title: "Review Applicants", desc: "Review portfolios and applications from skilled video editors and agencies." },
              { icon: MessageSquare, title: "Chat & Hire", desc: "Use in-app chat to interview candidates and hire the perfect fit." },
            ].map((step) => (
              <div key={step.title} className="text-center p-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Find Your Editor?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join the platform connecting clients with talented video editors.
          </p>
          <Button size="lg" asChild>
            <Link href="/auth">Create Your Account</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
