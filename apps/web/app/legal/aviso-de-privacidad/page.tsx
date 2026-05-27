import type { Metadata } from "next";
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
        <Link className="text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" href="/login">
          Volver al acceso
        </Link>
        <header className="mt-8 border-b pb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Versión 1.0</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Aviso de privacidad de CoraFit</h1>
          <p className="mt-4 text-sm text-muted-foreground">Última actualización: 26 de mayo de 2026</p>
          <p className="mt-6 rounded-md border border-primary/35 bg-primary/10 px-4 py-3 text-sm font-medium text-foreground">
            Este aviso es una versión base para la beta y deberá revisarse legalmente antes de una beta pública o comercial.
          </p>
        </header>

        <div className="space-y-8 py-8">
          <section>
            <h2 className="text-lg font-semibold">Identidad del responsable</h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              CoraFit es responsable del tratamiento de los datos personales tratados a través de la plataforma beta. Para temas de privacidad, escribe a privacidad@corafit.app.
            </p>
          </section>

          <LegalList title="Datos personales del coach" items={coachData} />
          <LegalList title="Datos que el coach puede registrar de sus clientes" items={clientData} />
          <LegalList title="Finalidades del tratamiento" items={purposes} />

          <section>
            <h2 className="text-lg font-semibold">Datos sensibles</h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              Algunas fotos, medidas corporales e información relacionada con salud o progreso físico pueden considerarse datos personales sensibles cuando permitan conocer condiciones físicas, estado de salud o aspectos íntimos del titular. El coach debe contar con autorización suficiente de sus clientes antes de registrarlos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Base de consentimiento</h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              Al crear una cuenta y aceptar este aviso, el coach consiente el tratamiento de sus datos para operar CoraFit. Respecto de datos de clientes, el coach declara que cuenta con las autorizaciones necesarias para capturarlos y tratarlos en la plataforma.
            </p>
          </section>

          <LegalList title="Transferencias y proveedores" items={providers} />

          <section>
            <h2 className="text-lg font-semibold">Medidas generales de seguridad</h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              CoraFit aplica controles técnicos y organizativos razonables para proteger la información, incluyendo autenticación, control de acceso, almacenamiento administrado y monitoreo operativo. Ningún sistema es infalible, por lo que el coach también debe proteger sus credenciales y dispositivos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Derechos ARCO</h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              Los titulares pueden solicitar acceso, rectificación, cancelación u oposición respecto de sus datos personales escribiendo a privacidad@corafit.app. La solicitud deberá incluir información suficiente para identificar la cuenta o los datos relacionados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Conservación de datos</h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              Los datos se conservarán mientras la cuenta esté activa, sean necesarios para prestar el servicio, cumplir obligaciones legales, resolver disputas o proteger la seguridad de la plataforma. El coach puede solicitar eliminación conforme a los mecanismos disponibles.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">Cambios al aviso y vigencia</h2>
            <p className="mt-2 leading-7 text-muted-foreground">
              CoraFit podrá actualizar este aviso conforme evolucione el producto o cambien los requisitos legales. La fecha de entrada en vigor de esta versión es el 26 de mayo de 2026.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}

function LegalList({ items, title }: { items: string[]; title: string }) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="mt-3 grid gap-2 text-muted-foreground sm:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="rounded-md border bg-card px-3 py-2 text-sm">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
