"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PublicAuthGate } from "@/components/providers/auth-gates";
import { useAuth } from "@/components/providers/auth-provider";
import { AuthCard } from "@/components/shared/auth-card";
import { AuthLayout } from "@/components/shared/auth-layout";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const loginSchema = z.object({
  email: z.string().trim().email("Ingresa un correo valido"),
  password: z.string().min(1, "La contrasena es obligatoria"),
});

const signupSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(100, "El nombre es demasiado largo"),
  email: z.string().trim().email("Ingresa un correo valido"),
  password: z.string().min(6, "Usa al menos 6 caracteres"),
  phone: z.string().trim().optional(),
  termsAccepted: z.boolean().refine((value) => value, {
    message: "Debes aceptar los Terminos beta y el Aviso de privacidad para crear tu cuenta.",
  }),
});

const resetSchema = z.object({
  email: z.string().trim().email("Ingresa un correo valido"),
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;

export default function LoginPage() {
  return (
    <PublicAuthGate>
      <AuthLayout>
        <AuthCard title="Registro / acceso" description="Entra a tu espacio de coach o crea una cuenta beta.">
          <AuthCardContent />
        </AuthCard>
      </AuthLayout>
    </PublicAuthGate>
  );
}

function AuthCardContent() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  return (
    <>
      {message ? (
        <p className="mb-4 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Tabs
        defaultValue="login"
        onValueChange={() => {
          setMessage("");
          setError("");
        }}
      >
        <TabsList className="grid h-10 w-full grid-cols-2 rounded-lg bg-muted p-1">
          <TabsTrigger className="rounded-md text-sm font-medium" value="login">
            Iniciar sesion
          </TabsTrigger>
          <TabsTrigger className="rounded-md text-sm font-medium" value="signup">
            Crear cuenta
          </TabsTrigger>
        </TabsList>
        <TabsContent value="login" className="mt-5">
          <LoginForm onError={setError} onMessage={setMessage} />
        </TabsContent>
        <TabsContent value="signup" className="mt-5">
          <SignupForm onError={setError} onMessage={setMessage} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function LoginForm({
  onError,
  onMessage,
}: {
  onError: (message: string) => void;
  onMessage: (message: string) => void;
}) {
  const router = useRouter();
  const { login, resetPassword } = useAuth();
  const [isResetting, setIsResetting] = useState(false);
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
    reValidateMode: "onBlur",
  });
  const isSubmitting = form.formState.isSubmitting || isResetting;

  async function onSubmit(values: LoginValues) {
    onError("");
    onMessage("");

    try {
      const profile = await login(values);
      router.replace(profile ? "/" : "/complete-profile");
    } catch (caughtError) {
      onError(getErrorMessage(caughtError, "Correo o contrasena incorrectos."));
    }
  }

  async function onResetPassword() {
    const result = resetSchema.safeParse({ email: form.getValues("email") });

    if (!result.success) {
      form.setError("email", { message: "Ingresa tu correo para recuperar la contrasena" });
      return;
    }

    onError("");
    onMessage("");
    setIsResetting(true);

    try {
      await resetPassword(result.data.email);
      onMessage("Revisa tu correo para recuperar tu contrasena.");
    } catch (caughtError) {
      onError(getErrorMessage(caughtError, "No pudimos enviar el correo de recuperacion."));
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input autoComplete="email" placeholder="coach@corafit.app" type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contrasena</FormLabel>
              <FormControl>
                <Input autoComplete="current-password" placeholder="********" type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Procesando..." : "Iniciar sesion"}
        </Button>
        <Button
          className="w-full"
          disabled={isSubmitting}
          type="button"
          variant="ghost"
          onClick={onResetPassword}
        >
          Recuperar contrasena
        </Button>
      </form>
    </Form>
  );
}

function SignupForm({
  onError,
  onMessage,
}: {
  onError: (message: string) => void;
  onMessage: (message: string) => void;
}) {
  const router = useRouter();
  const { signup } = useAuth();
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", phone: "", termsAccepted: false },
    mode: "onSubmit",
    reValidateMode: "onBlur",
  });

  async function onSubmit(values: SignupValues) {
    onError("");
    onMessage("");

    try {
      const result = await signup({
        email: values.email,
        name: values.name,
        password: values.password,
        phone: values.phone,
        termsAccepted: values.termsAccepted,
      });

      if (result === "confirm-email") {
        onMessage("Revisa tu correo para confirmar tu cuenta.");
        return;
      }

      router.replace("/");
    } catch (caughtError) {
      onError(getErrorMessage(caughtError, "No pudimos crear tu perfil. Intenta de nuevo."));
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input autoComplete="email" placeholder="coach@corafit.app" type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contrasena</FormLabel>
              <FormControl>
                <Input autoComplete="new-password" placeholder="Minimo 6 caracteres" type="password" {...field} />
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
        <TermsField control={form.control} name="termsAccepted" />
        <Button className="w-full" disabled={form.formState.isSubmitting} type="submit">
          {form.formState.isSubmitting ? "Creando..." : "Crear cuenta"}
        </Button>
      </form>
    </Form>
  );
}

function TermsField({
  control,
  name,
}: {
  control: ReturnType<typeof useForm<SignupValues>>["control"];
  name: "termsAccepted";
}) {
  return (
    <FormField
      control={control}
      name={name}
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
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
