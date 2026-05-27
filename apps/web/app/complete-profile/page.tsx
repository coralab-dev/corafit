"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DumbbellIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CompleteProfileGate } from "@/components/providers/auth-gates";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const completeProfileSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(100, "El nombre es demasiado largo"),
  phone: z.string().trim().optional(),
  termsAccepted: z.boolean().refine((value) => value, {
    message: "Debes aceptar los Términos beta y el Aviso de privacidad para crear tu cuenta.",
  }),
});

type CompleteProfileValues = z.infer<typeof completeProfileSchema>;
const profileInputClassName =
  "h-9 rounded-none border-0 bg-transparent px-0 pb-1 pt-0 text-base shadow-none focus-visible:ring-0 md:text-sm";

export default function CompleteProfilePage() {
  return (
    <CompleteProfileGate>
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
        <Card className="w-full max-w-md rounded-lg border-border/70 shadow-none">
          <CardHeader>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <DumbbellIcon className="size-5" aria-hidden="true" />
              </div>
              <span className="text-lg font-bold tracking-tight">CoraFit</span>
            </div>
            <CardTitle>Completa tu perfil</CardTitle>
            <CardDescription>
              Crea tu espacio interno de coach para entrar al dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CompleteProfileForm />
          </CardContent>
        </Card>
      </main>
    </CompleteProfileGate>
  );
}

function CompleteProfileForm() {
  const router = useRouter();
  const { completeProfile, suggestedProfile } = useAuth();
  const [error, setError] = useState("");
  const form = useForm<CompleteProfileValues>({
    resolver: zodResolver(completeProfileSchema),
    defaultValues: {
      name: suggestedProfile?.name ?? "",
      phone: suggestedProfile?.phone ?? "",
      termsAccepted: false,
    },
    mode: "onSubmit",
    reValidateMode: "onBlur",
  });

  useEffect(() => {
    if (!suggestedProfile) {
      return;
    }

    form.reset({
      name: suggestedProfile.name,
      phone: suggestedProfile.phone ?? "",
      termsAccepted: false,
    });
  }, [form, suggestedProfile]);

  async function onSubmit(values: CompleteProfileValues) {
    setError("");

    try {
      await completeProfile({
        name: values.name,
        phone: values.phone,
        termsAccepted: values.termsAccepted,
      });
      router.replace("/");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No pudimos crear tu perfil. Intenta de nuevo.",
      );
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <ProfileTextField label="Nombre del coach">
              <Input className={profileInputClassName} autoComplete="name" {...field} />
            </ProfileTextField>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <ProfileTextField label="Telefono opcional">
              <Input className={profileInputClassName} autoComplete="tel" {...field} />
            </ProfileTextField>
          )}
        />
        <FormField
          control={form.control}
          name="termsAccepted"
          render={({ field }) => (
            <FormItem>
              <label className="flex min-h-11 items-center gap-3 rounded-md border px-3 py-2 text-sm">
                <input
                  checked={field.value}
                  className="size-4 shrink-0 accent-primary"
                  type="checkbox"
                  onBlur={field.onBlur}
                  onChange={(event) => field.onChange(event.target.checked)}
                />
                <span className="leading-snug">
                  Acepto los{" "}
                  <Link className="font-semibold underline-offset-4 hover:underline" href="/legal/terminos-beta">
                    Términos beta
                  </Link>{" "}
                  y el{" "}
                  <Link className="font-semibold underline-offset-4 hover:underline" href="/legal/aviso-de-privacidad">
                    Aviso de privacidad
                  </Link>
                  .
                </span>
              </label>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className="mt-2 w-full shadow-none" disabled={form.formState.isSubmitting} type="submit">
          {form.formState.isSubmitting ? "Creando..." : "Crear mi espacio"}
        </Button>
      </form>
    </Form>
  );
}

function ProfileTextField({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <FormItem className="group gap-1">
      <label className="text-sm font-semibold transition-colors group-focus-within:text-primary">
        {label}
      </label>
      <div className="border-b border-border transition-colors group-focus-within:border-primary">
        <FormControl>{children}</FormControl>
      </div>
      <FormMessage />
    </FormItem>
  );
}
