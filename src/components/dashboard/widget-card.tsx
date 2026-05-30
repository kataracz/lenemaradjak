"use client";

import { type ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DashboardCardProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DashboardCard({
  title,
  description,
  actions,
  children,
  className,
}: DashboardCardProps) {
  return (
    <Card className={className ?? "h-full"}>
      <CardHeader className="items-start gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? (
            <CardDescription>{description}</CardDescription>
          ) : null}
        </div>
        {actions}
      </CardHeader>
      <CardContent className="grid gap-4 px-0 pb-0 pt-2">
        {children}
      </CardContent>
    </Card>
  );
}
