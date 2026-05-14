import {
  ActivityIcon,
  CalendarIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  DumbbellIcon,
  MoreHorizontalIcon,
  PlusIcon,
  UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { label: "Dashboard", icon: ActivityIcon, active: false },
  { label: "Clientes", icon: UsersIcon, active: true },
  { label: "Planes", icon: ClipboardListIcon, active: false },
  { label: "Progreso", icon: CalendarIcon, active: false },
];

const stats = [
  { label: "Clientes activos", value: "42", detail: "+8 este mes" },
  { label: "Planes asignados", value: "31", detail: "74% al dia" },
  { label: "Sesiones semana", value: "128", detail: "18 pendientes" },
];

const sessions = [
  ["18 may 2024", "Fuerza A", "Completada"],
  ["15 may 2024", "Inferiores", "Parcial"],
  ["13 may 2024", "Cardio HIIT", "Pendiente"],
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-4 p-4 lg:flex-row lg:p-6">
        <aside className="hidden w-64 shrink-0 rounded-2xl border bg-card p-4 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-secondary text-primary">
              <DumbbellIcon />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-normal">CoraFit</p>
              <p className="text-xs text-muted-foreground">Coach OS</p>
            </div>
          </div>

          <nav className="mt-8 flex flex-col gap-2">
            {navItems.map((item) => (
              <div
                key={item.label}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                  item.active
                    ? "bg-muted font-semibold text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <item.icon />
                {item.label}
              </div>
            ))}
          </nav>

          <div className="mt-auto rounded-xl border bg-background p-3">
            <p className="text-sm font-semibold">Alex Ruiz</p>
            <p className="text-xs text-muted-foreground">Coach principal</p>
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Clientes / Mariana Lopez</p>
              <h1 className="text-3xl font-semibold leading-tight">Ficha del cliente</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline">Acciones</Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Acciones rapidas</SheetTitle>
                    <SheetDescription>
                      Operaciones base reservadas para el flujo real de cliente.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 flex flex-col gap-3">
                    <Button>Generar acceso</Button>
                    <Button variant="outline">Asignar plan</Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </header>

          <Card>
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex size-20 items-center justify-center rounded-full bg-muted text-xl font-semibold">
                  ML
                </div>
                <div>
                  <CardTitle className="text-2xl">Mariana Lopez</CardTitle>
                  <CardDescription>
                    Objetivo: <span className="font-medium text-primary">Hipertrofia</span>
                  </CardDescription>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-muted px-3 py-1 text-foreground">Activa</span>
                    <span className="rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground">
                      Al dia
                    </span>
                    <span className="rounded-full border px-3 py-1">Plan asignado</span>
                  </div>
                </div>
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <PlusIcon data-icon="inline-start" />
                    Nueva nota
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nueva nota del cliente</DialogTitle>
                    <DialogDescription>
                      Stub visual para validar shadcn Dialog dentro del layout base.
                    </DialogDescription>
                  </DialogHeader>
                  <Input placeholder="Escribe una nota operativa..." />
                  <Button>Guardar nota</Button>
                </DialogContent>
              </Dialog>
            </CardHeader>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardHeader>
                  <CardDescription>{stat.label}</CardDescription>
                  <CardTitle className="text-3xl">{stat.value}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{stat.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <Card>
              <CardHeader>
                <CardTitle>Seguimiento</CardTitle>
                <CardDescription>
                  Vista base para sesiones, progreso, notas y acceso.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="sesiones" className="w-full">
                  <TabsList>
                    <TabsTrigger value="sesiones">Sesiones</TabsTrigger>
                    <TabsTrigger value="progreso">Progreso</TabsTrigger>
                    <TabsTrigger value="notas">Notas</TabsTrigger>
                  </TabsList>
                  <TabsContent value="sesiones" className="mt-4">
                    <div className="flex flex-col gap-3">
                      {sessions.map(([date, name, status]) => (
                        <div
                          key={`${date}-${name}`}
                          className="flex items-center justify-between rounded-lg border bg-background p-3"
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle2Icon className="text-primary" />
                            <div>
                              <p className="text-sm font-medium">{name}</p>
                              <p className="text-xs text-muted-foreground">{date}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">{status}</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" aria-label="Mas acciones">
                                  <MoreHorizontalIcon data-icon="inline-start" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Sesion</DropdownMenuLabel>
                                <DropdownMenuGroup>
                                  <DropdownMenuItem>Ver detalle</DropdownMenuItem>
                                  <DropdownMenuItem>Editar nota</DropdownMenuItem>
                                </DropdownMenuGroup>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="progreso" className="mt-4">
                    <div className="rounded-lg border bg-background p-4">
                      <p className="text-sm text-muted-foreground">Cambio desde inicio</p>
                      <p className="text-3xl font-semibold text-primary">-2.3 kg</p>
                    </div>
                  </TabsContent>
                  <TabsContent value="notas" className="mt-4">
                    <Input placeholder="Buscar notas del cliente" />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Plan actual</CardDescription>
                <CardTitle>Hipertrofia 8 semanas</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Semana 3 de 8</span>
                    <span className="text-muted-foreground">37%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full w-[37%] rounded-full bg-primary" />
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-4">
                  <p className="text-sm text-muted-foreground">Proxima sesion</p>
                  <p className="mt-1 font-semibold">Fuerza A</p>
                  <p className="text-sm text-muted-foreground">20 may 2024 · 09:00</p>
                </div>
                <Button>Ver plan</Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
