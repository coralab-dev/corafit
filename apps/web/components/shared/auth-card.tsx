"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuthCardProps {
  children: ReactNode;
  className?: string;
  description?: string;
  title: string;
}

export function AuthCard({
  children,
  className,
  description,
  title,
}: AuthCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden rounded-md border bg-card shadow-none",
        className,
      )}
    >
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {description ? (
          <CardDescription>{description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
