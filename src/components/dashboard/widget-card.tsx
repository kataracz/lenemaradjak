import { type ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import { DragDropVerticalIcon } from "@hugeicons/core-free-icons";

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
    <Card size="sm" className={className ?? "h-full"}>
      <CardHeader className="flex! flex-row items-center gap-3 select-none">
        <div className="drag-handle flex flex-1 items-center gap-2">
          <HugeiconsIcon
            icon={DragDropVerticalIcon}
            size={24}
            aria-hidden="true"
            className="shrink-0 text-muted-foreground/60 cursor-move"
          />
          <div>
            <CardTitle>{title}</CardTitle>
            {description ? (
              <CardDescription>{description}</CardDescription>
            ) : null}
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto px-0 pb-0 pt-2">
        {children}
      </CardContent>
    </Card>
  );
}
