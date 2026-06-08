"use client"

import Image from "next/image"

const footerLinks = [
  { label: "Produtos", href: "#produtos" },
  { label: "Documentação", href: "#" },
  { label: "Contato", href: "#contato" },
  { label: "Política de Privacidade", href: "#" },
]

export function Footer() {
  const scrollToSection = (href: string) => {
    if (href.startsWith("#")) {
      const element = document.querySelector(href)
      if (element) {
        element.scrollIntoView({ behavior: "smooth" })
      }
    }
  }

  return (
    <footer id="contato" className="px-4 md:px-8 lg:px-12 py-12 md:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center text-center">
          {/* Logo Symbol */}
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/COS%20LOGO%20%281%29-mBU7xqdIZoWP3indGVxJrDFLu8urZH.png"
            alt="COS"
            width={60}
            height={60}
            className="h-14 w-14 md:h-16 md:w-16 invert"
          />

          {/* Tagline */}
          <p className="mt-6 text-sm text-muted-foreground">
            Conversational Operating System
          </p>

          {/* Links */}
          <nav className="mt-8 flex flex-wrap justify-center gap-6 md:gap-8">
            {footerLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => scrollToSection(link.href)}
                className="text-sm text-foreground/70 hover:text-foreground transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Divider */}
          <div className="mt-10 w-full max-w-md border-t border-border/50" />

          {/* Copyright */}
          <p className="mt-6 text-xs text-muted-foreground">
            © {new Date().getFullYear()} COS. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}
