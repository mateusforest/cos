import { SiteHeader } from "@/components/site-header"
import { Hero } from "@/components/hero"
import { TrySection } from "@/components/try-section"
import { ProductSection } from "@/components/product-section"
import { ActionsBand } from "@/components/actions-band"
import { RestSection } from "@/components/rest-section"
import { MeetSection } from "@/components/meet-section"
import { CtaSection } from "@/components/cta-section"
import { SiteFooter } from "@/components/site-footer"
import { Reveal } from "@/components/reveal"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <Reveal>
          <TrySection />
        </Reveal>
        <ProductSection />
        <ActionsBand />
        <RestSection />
        <Reveal>
          <MeetSection />
        </Reveal>
        <Reveal>
          <CtaSection />
        </Reveal>
      </main>
      <SiteFooter />
    </div>
  )
}
