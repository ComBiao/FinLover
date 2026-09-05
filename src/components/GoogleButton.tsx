import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GoogleButtonProps {
  className?: string;
  onClick?: () => void;
}

/**
 * Button styled with Google's brand colors for OAuth authentication.
 */
export function GoogleButton({ className, onClick }: GoogleButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className={cn("h-[46px] w-full rounded-lg text-sm", className)}
    >
      <span className="font-extrabold">
        <span className="text-[#4285F4]">G</span>
        <span className="text-[#EA4335]">o</span>
        <span className="text-[#FBBC05]">o</span>
        <span className="text-[#4285F4]">g</span>
        <span className="text-[#34A853]">l</span>
        <span className="text-[#EA4335]">e</span>
      </span>
    </Button>
  );
}
