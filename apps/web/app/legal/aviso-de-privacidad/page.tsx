import type { Metadata } from "next";
import * as React from "react";
import { ChevronLeftIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Aviso de privacidad de CoraFit",
  description: "Aviso de privacidad base para la beta de CoraFit.",
};

const coachData = ["nombre", "email", "teléfono", "datos de cuenta", "datos de organización"];
const clientData = [
  "nombre",
  "teléfono",
  "edad",
  "objetivo",
  "estatura",
  "peso",
  "medidas",
  "fotos de progreso",
  "notas de seguimiento",
  "información de entrenamiento",
];
const purposes = [
  "crear cuenta",
  "administrar organización",
  "gestionar clientes",
  "asignar planes",
  "registrar progreso",
  "operar el portal del cliente",
  "brindar soporte",
  "mantener seguridad",
  "generar métricas internas",
];
const providers = ["hosting", "base de datos", "autenticación", "storage", "servicios técnicos necesarios"];

export default function PrivacyNoticePage() {
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
            <ShieldCheckIcon className="size-4 text-primary" />
            <span className="uppercase tracking-wide">Version 1.0</span>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Aviso de privacidad de CoraFit
          </h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Ultima actualizacion: 26 de mayo de 2026
          </p>
          <div className="mt-6 rounded-md border border-primary/25 bg-primary/5 px-5 py-4">
            <p className="text-sm font-medium text-foreground">
              Este aviso es una version base para la beta y debera revisarse legalmente antes de una beta publica o comercial.
            </p>
          </div>
        </header>

        <div className="space-y-10 py-10">
          <LegalSection title="Identidad del responsable">
            <p className="leading-7 text-muted-foreground">
              CoraFit es responsable del tratamiento de los datos personales tratados a traves de la plataforma beta. Para temas de privacidad, escribe a privacidad@corafit.app.
            </p>
          </LegalSection>

          <LegalList title="Datos personales del coach" items={coachData} />
          <LegalList title="Datos que el coach puede registrar de sus clientes" items={clientData} />
          <LegalList title="Finalidades del tratamiento" items={purposes} />

          <LegalSection title="Datos sensibles">
            <p className="leading-7 text-muted-foreground">
              Algunas fotos, medidas corporales e informacion relacionada con salud o progreso fisico pueden considerarse datos personales sensibles cuando permitan conocer condiciones fisicas, estado de salud o aspectos intimos del titular. El coach debe contar con autorizacion suficiente de sus clientes antes de registrarlos.
            </p>
          </LegalSection>

          <LegalSection title="Base de consentimiento">
            <p className="leading-7 text-muted-foreground">
              Al crear una cuenta y aceptar este aviso, el coach consiente el tratamiento de sus datos para operar CoraFit. Respecto de datos de clientes, el coach declara que cuenta con las autorizaciones necesarias para capturarlos y tratarlos en la plataforma.
            </p>
          </LegalSection>

          <LegalList title="Transferencias y proveedores" items={providers} />

          <LegalSection title="Medidas generales de seguridad">
            <p className="leading-7 text-muted-foreground">
              CoraFit aplica controles tecnicos y organizativos razonables para proteger la informacion, incluyendo autenticacion, control de acceso, almacenamiento administrado y monitoreo operativo. Ningun sistema es infalible, por lo que el coach tambien debe proteger sus credenciales y dispositivos.
            </p>
          </LegalSection>

          <LegalSection title="Derechos ARCO">
            <p className="leading-7 text-muted-foreground">
              Los titulares pueden solicitar acceso, rectificacion, cancelacion u oposicion respecto de sus datos personales escribiendo a privacidad@corafit.app. La solicitud debera incluir informacion suficiente para identificar la cuenta o los datos relacionados.
            </p>
          </LegalSection>

          <LegalSection title="Conservacion de datos">
            <p className="leading-7 text-muted-foreground">
              Los datos se conservaran mientras la cuenta este activa, sean necesarios para prestar el servicio, cumplir obligaciones legales, resolver disputas o proteger la seguridad de la plataforma. El coach puede solicitar eliminacion conforme a los mecanismos disponibles.
            </p>
          </LegalSection>

          <LegalSection title="Cambios al aviso y vigencia">
            <p className="leading-7 text-muted-foreground">
              CoraFit podra actualizar este aviso conforme evolucione el producto o cambien los requisitos legales. La fecha de entrada en vigor de esta version es el 26 de mayo de 2026.
            </p>
          </LegalSection>
        </div>
      </article>
    </main>
  );
}

function LegalSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section>
      <h2 className="text-lg font-semibold leading-snug">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function LegalList({ items, title }: { items: string[]; title: string }) {
  return (
    <LegalSection title={title}>
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-md border bg-card px-4 py-3 text-sm text-muted-foreground"
          >
            {item}
          </li>
        ))}
      </ul>
    </LegalSection>
  );
}
