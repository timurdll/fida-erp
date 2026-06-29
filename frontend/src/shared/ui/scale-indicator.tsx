"use client";

import { Scale } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useScaleStore } from "@/shared/store/scaleStore";

export function ScaleIndicator({ className }: { className?: string }) {
  const { weight, isConnected } = useScaleStore();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          isConnected ? "bg-success" : "bg-muted-foreground/40",
        )}
      />
      <Scale className="h-4 w-4 shrink-0 text-muted-foreground" />
      {isConnected ? (
        <span className="truncate text-sm text-foreground">
          <span className="font-medium">{weight} кг</span>
        </span>
      ) : (
        <span className="truncate text-sm text-muted-foreground">
          Нет соединения
        </span>
      )}
    </div>
  );
}
