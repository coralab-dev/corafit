"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CompleteProfileGate } from "@/components/providers/auth-gates";
import { useAuth } from "@/components/providers/auth-provider";
import { AuthCard } from "@/components/shared/auth-card";
import { AuthLayout } from "@/components/shared/auth-layout";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Link from "next/link";

const completeProfileSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(100, "El nombre es demasiado largo"),
  phone: z.string().trim().optional(),
  termsAccepted: z.boolean().refine((value) => value, {
    message: "Debes aceptar los Terminos beta y el Aviso de privacidad para crear tu cuenta.",
  }),
});

type CompleteProfileValues = z.infer<typeof completeProfileSchema>;

export default function CompleteProfilePage() {
  return (
    <CompleteProfileGate>
      <AuthLayout subtitle="Completa tu perfil para entrar al dashboard">
        <AuthCard
          title="Completa tu perfil"
          description="Crea tu espacio interno de coach para entrar al panel."
        >
          <CompleteProfileForm />
        </AuthCard>
      </AuthLayout>
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
            <FormItem>
              <FormLabel>Nombre del coach</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder="Juan Perez" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefono opcional</FormLabel>
              <FormControl>
                <Input autoComplete="tel" placeholder="+52 555 123 4567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="termsAccepted"
          render={({ field }) => (
            <FormItem>
              <label className="flex min-h-11 items-center gap-3 rounded-lg border bg-background px-3 py-2 text-sm">
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
                    Terminos beta
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
        <Button className="w-full" disabled={form.formState.isSubmitting} type="submit">
          {form.formState.isSubmitting ? "Creando..." : "Crear mi espacio"}
        </Button>
      </form>
    </Form>
  );
}
