import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

export function PaginationControls({
  page,
  totalPages,
  onPrev,
  onNext,
}: PaginationControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={onPrev}
        disabled={page === 1}
        className="h-7 w-7 cursor-pointer"
        aria-label="Előző oldal"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={16} aria-hidden="true" />
      </Button>
      <span className="min-w-[2.5rem] text-center text-xs text-muted-foreground">
        {page}/{totalPages}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        disabled={page === totalPages}
        className="h-7 w-7 cursor-pointer"
        aria-label="Következő oldal"
      >
        <HugeiconsIcon icon={ArrowRight01Icon} size={16} aria-hidden="true" />
      </Button>
    </div>
  );
}
