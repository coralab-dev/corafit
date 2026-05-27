import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos beta de CoraFit",
  description: "Términos base para el uso beta de CoraFit.",
};

const sections = [
  {
    title: "Estado beta del producto",
    body: "CoraFit se ofrece actualmente como una versión beta para coaches y organizaciones de entrenamiento. Durante esta etapa, la plataforma puede incluir funciones incompletas, limitadas o sujetas a ajustes sin previo aviso.",
  },
  {
    title: "Descripción del servicio",
    body: "CoraFit ayuda a coaches a administrar clientes, planes de entrenamiento, seguimiento de progreso, notas, portal del cliente y operación básica de su organización.",
  },
  {
    title: "Uso permitido",
    body: "El coach debe usar la plataforma únicamente para fines profesionales, lícitos y relacionados con la gestión de sus servicios de entrenamiento. El coach es responsable de que la información que registre sea veraz, pertinente y autorizada por sus clientes.",
  },
  {
    title: "Responsabilidad sobre clientes",
    body: "El coach conserva la responsabilidad profesional sobre la información, recomendaciones, planes, notas y seguimiento que registre para sus clientes. CoraFit no valida ni sustituye el criterio del coach.",
  },
  {
    title: "No es servicio médico",
    body: "CoraFit no es un servicio médico, nutricional, psicológico ni de diagnóstico. La plataforma no reemplaza la valoración de profesionales de la salud ni el criterio profesional aplicable a cada cliente.",
  },
  {
    title: "Disponibilidad beta",
    body: "Durante la beta, el servicio puede presentar errores, interrupciones, pérdida temporal de disponibilidad, cambios de interfaz, cambios de límites o eliminación de funciones experimentales.",
  },
  {
    title: "Límites del plan beta/trial",
    body: "El plan beta o trial puede tener límites de clientes, miembros, almacenamiento, funciones, soporte o duración. CoraFit podrá ajustar estos límites conforme avance la etapa beta.",
  },
  {
    title: "Prohibiciones",
    body: "No está permitido usar CoraFit para actividades ilegales, spam, registro de datos sin autorización, acceso indebido, explotación de vulnerabilidades, abuso de recursos, ingeniería inversa no autorizada o cualquier conducta que afecte la operación del sistema.",
  },
  {
    title: "Suspensión de cuenta",
    body: "CoraFit podrá suspender o limitar cuentas cuando detecte mal uso, riesgo para la plataforma, incumplimiento de estos términos o solicitudes legales aplicables.",
  },
  {
    title: "Feedback durante beta",
    body: "El usuario puede compartir comentarios, reportes o sugerencias. CoraFit podrá usar ese feedback para mejorar la plataforma sin que ello genere obligación de compensación.",
  },
  {
    title: "Cambios futuros",
    body: "Estos términos podrán actualizarse conforme evolucionen el producto, los planes comerciales o los requisitos legales. La versión vigente estará disponible en esta página.",
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
        <Link className="text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" href="/login">
          Volver al acceso
        </Link>
        <header className="mt-8 border-b pb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Versión 1.0</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Términos beta de CoraFit</h1>
          <p className="mt-4 text-sm text-muted-foreground">Última actualización: 26 de mayo de 2026</p>
          <p className="mt-6 rounded-md border border-primary/35 bg-primary/10 px-4 py-3 text-sm font-medium text-foreground">
            CoraFit está en etapa beta. Algunas funciones pueden cambiar, fallar o estar limitadas mientras seguimos mejorando la plataforma.
          </p>
        </header>
        <div className="space-y-7 py-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <p className="mt-2 leading-7 text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
        <footer className="border-t py-6 text-sm text-muted-foreground">
          Contenido legal base; requiere revisión legal antes de beta pública.
        </footer>
      </article>
    </main>
  );
}
