import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ChevronLeftIcon, FileTextIcon } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terminos beta de CoraFit",
  description: "Terminos base para el uso beta de CoraFit.",
};

const sections = [
  {
    title: "Estado beta del producto",
    body: "CoraFit se ofrece actualmente como una version beta para coaches y organizaciones de entrenamiento. Durante esta etapa, la plataforma puede incluir funciones incompletas, limitadas o sujetas a ajustes sin previo aviso.",
  },
  {
    title: "Descripcion del servicio",
    body: "CoraFit ayuda a coaches a administrar clientes, planes de entrenamiento, seguimiento de progreso, notas, portal del cliente y operacion basica de su organizacion.",
  },
  {
    title: "Uso permitido",
    body: "El coach debe usar la plataforma unicamente para fines profesionales, licitos y relacionados con la gestion de sus servicios de entrenamiento. El coach es responsable de que la informacion que registre sea veraz, pertinente y autorizada por sus clientes.",
  },
  {
    title: "Responsabilidad sobre clientes",
    body: "El coach conserva la responsabilidad profesional sobre la informacion, recomendaciones, planes, notas y seguimiento que registre para sus clientes. CoraFit no valida ni sustituye el criterio del coach.",
  },
  {
    title: "No es servicio medico",
    body: "CoraFit no es un servicio medico, nutricional, psicologico ni de diagnostico. La plataforma no reemplaza la valoracion de profesionales de la salud ni el criterio profesional aplicable a cada cliente.",
  },
  {
    title: "Disponibilidad beta",
    body: "Durante la beta, el servicio puede presentar errores, interrupciones, perdida temporal de disponibilidad, cambios de interfaz, cambios de limites o eliminacion de funciones experimentales.",
  },
  {
    title: "Limites del plan beta/trial",
    body: "El plan beta o trial puede tener limites de clientes, miembros, almacenamiento, funciones, soporte o duracion. CoraFit podra ajustar estos limites conforme avance la etapa beta.",
  },
  {
    title: "Prohibiciones",
    body: "No esta permitido usar CoraFit para actividades ilegales, spam, registro de datos sin autorizacion, acceso indebido, explotacion de vulnerabilidades, abuso de recursos, ingenieria inversa no autorizada o cualquier conducta que afecte la operacion del sistema.",
  },
  {
    title: "Suspension de cuenta",
    body: "CoraFit podra suspender o limitar cuentas cuando detecte mal uso, riesgo para la plataforma, incumplimiento de estos terminos o solicitudes legales aplicables.",
  },
  {
    title: "Feedback durante beta",
    body: "El usuario puede compartir comentarios, reportes o sugerencias. CoraFit podra usar ese feedback para mejorar la plataforma sin que ello genere obligacion de compensacion.",
  },
  {
    title: "Cambios futuros",
    body: "Estos terminos podran actualizarse conforme evolucionen el producto, los planes comerciales o los requisitos legales. La version vigente estara disponible en esta pagina.",
  },
  {
    title: "Contacto de soporte",
    body: "Para soporte, dudas sobre la beta o reportes de uso, escribe a soporte@corafit.app.",
  },
];

export default function BetaTermsPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
      <article className="mx-auto max-w-3xl">
        <Link
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          href="/login"
        >
          <ChevronLeftIcon className="size-4" />
          Volver al acceso
        </Link>

        <header className="mt-8 border-b pb-8">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FileTextIcon className="size-4 text-primary" />
            <span className="uppercase tracking-wide">Version 1.0</span>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Terminos beta de CoraFit
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Ultima actualizacion: 26 de mayo de 2026
          </p>
          <div className="mt-6 rounded-md border border-primary/25 bg-primary/5 px-5 py-4">
            <p className="text-sm font-medium text-foreground">
              CoraFit esta en etapa beta. Algunas funciones pueden cambiar, fallar o estar limitadas mientras seguimos mejorando la plataforma.
            </p>
          </div>
        </header>

        <div className="space-y-10 py-10">
          {sections.map((section) => (
            <LegalSection key={section.title} title={section.title}>
              <p className="leading-7 text-muted-foreground">{section.body}</p>
            </LegalSection>
          ))}
        </div>

        <footer className="border-t py-6 text-sm text-muted-foreground">
          Contenido legal base; requiere revision legal antes de beta publica.
        </footer>
      </article>
    </main>
  );
}

function LegalSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section>
      <h2 className="text-lg font-semibold leading-snug">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
