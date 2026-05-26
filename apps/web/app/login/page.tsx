"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DumbbellIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PublicAuthGate } from "@/components/providers/auth-gates";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
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
    message: "Acepta los terminos beta para continuar",
  }),
});

const resetSchema = z.object({
  email: z.string().trim().email("Ingresa un correo valido"),
});

type LoginValues = z.infer<typeof loginSchema>;
type SignupValues = z.infer<typeof signupSchema>;
const authInputClassName =
  "h-9 rounded-none border-0 bg-transparent px-0 pb-1 pt-0 text-base shadow-none focus-visible:ring-0 md:text-sm";
const authTabClassName =
  "rounded-none border-b-2 border-transparent bg-transparent px-2 py-3 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none";

export default function LoginPage() {
  return (
    <PublicAuthGate>
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <DumbbellIcon className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight">CoraFit</p>
              <p className="text-sm text-muted-foreground">Acceso para coaches</p>
            </div>
          </div>
          <AuthCard />
        </div>
      </main>
    </PublicAuthGate>
  );
}

function AuthCard() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  return (
    <Card className="rounded-lg border-border/70 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Registro / acceso</CardTitle>
        <CardDescription>
          Entra a tu espacio de coach o crea una cuenta beta.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
        <Tabs defaultValue="login" onValueChange={() => {
          setMessage("");
          setError("");
        }}>
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-none border-b bg-transparent p-0">
            <TabsTrigger className={authTabClassName} value="login">Iniciar sesion</TabsTrigger>
            <TabsTrigger className={authTabClassName} value="signup">Crear cuenta</TabsTrigger>
          </TabsList>
          <TabsContent value="login" className="mt-5">
            <LoginForm
              onError={setError}
              onMessage={setMessage}
            />
          </TabsContent>
          <TabsContent value="signup" className="mt-5">
            <SignupForm
              onError={setError}
              onMessage={setMessage}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
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
    defaultValues: {
      email: "",
      password: "",
    },
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
            <AuthTextField label="Email">
              <Input className={authInputClassName} autoComplete="email" type="email" {...field} />
            </AuthTextField>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <AuthTextField label="Contrasena">
              <Input className={authInputClassName} autoComplete="current-password" type="password" {...field} />
            </AuthTextField>
          )}
        />
        <Button className="mt-2 w-full shadow-none" disabled={isSubmitting} type="submit">
          {form.formState.isSubmitting ? "Entrando..." : "Iniciar sesion"}
        </Button>
        <Button
          className="w-full"
          disabled={isSubmitting}
          type="button"
          variant="link"
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
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      termsAccepted: false,
    },
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
            <AuthTextField label="Nombre del coach">
              <Input className={authInputClassName} autoComplete="name" {...field} />
            </AuthTextField>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <AuthTextField label="Email">
              <Input className={authInputClassName} autoComplete="email" type="email" {...field} />
            </AuthTextField>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <AuthTextField label="Contrasena">
              <Input className={authInputClassName} autoComplete="new-password" type="password" {...field} />
            </AuthTextField>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <AuthTextField label="Telefono opcional">
              <Input className={authInputClassName} autoComplete="tel" {...field} />
            </AuthTextField>
          )}
        />
        <TermsField control={form.control} name="termsAccepted" />
        <Button className="mt-2 w-full shadow-none" disabled={form.formState.isSubmitting} type="submit">
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
          <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
            <input
              checked={field.value}
              className="mt-1 size-4 accent-primary"
              type="checkbox"
              onBlur={field.onBlur}
              onChange={(event) => field.onChange(event.target.checked)}
            />
            <span>Acepto los terminos beta de CoraFit.</span>
          </label>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function AuthTextField({
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
