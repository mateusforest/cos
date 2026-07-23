import Link from 'next/link'
import { CosLogo } from '@/components/cos-logo'

const COLUMNS = [
  { title: 'Produto', links: ['Soluções', 'Recursos', 'Preços', 'Módulos'] },
  { title: 'Empresa', links: ['Sobre', 'Clientes', 'Carreiras', 'Contato'] },
  { title: 'Suporte', links: ['Central de ajuda', 'Documentação', 'Status', 'Segurança'] },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-5 py-14 md:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div id="sobre">
            <CosLogo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              O software operacional conversacional que executa por você.
            </p>
          </div>
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="text-sm font-semibold text-foreground">{column.title}</p>
              <ul className="mt-4 flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link}>
                    <a href="#sobre" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} COS. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <Link href="/privacidade" className="transition-colors hover:text-foreground">
              Privacidade
            </Link>
            <Link href="/termos" className="transition-colors hover:text-foreground">
              Termos
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
