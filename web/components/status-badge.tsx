import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type {
  ChangeRequestStatus,
  TokenStatus,
} from "@/lib/mock-data";

type Variant = "default" | "secondary" | "destructive" | "outline";

const tokenStatusMap: Record<TokenStatus, { label: string; variant: Variant }> = {
  draft: { label: "Draft", variant: "outline" },
  in_review: { label: "In review", variant: "secondary" },
  approved: { label: "Approved", variant: "secondary" },
  published: { label: "Published", variant: "default" },
  deprecated: { label: "Deprecated", variant: "destructive" },
  archived: { label: "Archived", variant: "outline" },
};

const changeRequestStatusMap: Record<
  ChangeRequestStatus,
  { label: string; variant: Variant }
> = {
  draft: { label: "Draft", variant: "outline" },
  open: { label: "Open", variant: "secondary" },
  changes_requested: { label: "Changes requested", variant: "destructive" },
  approved: { label: "Approved", variant: "secondary" },
  published: { label: "Published", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  closed: { label: "Closed", variant: "outline" },
};

export function TokenStatusBadge({
  status,
  className,
}: {
  status: TokenStatus;
  className?: string;
}) {
  const { label, variant } = tokenStatusMap[status];
  return (
    <Badge variant={variant} className={cn("font-normal", className)}>
      {label}
    </Badge>
  );
}

export function ChangeRequestStatusBadge({
  status,
  className,
}: {
  status: ChangeRequestStatus;
  className?: string;
}) {
  const { label, variant } = changeRequestStatusMap[status];
  return (
    <Badge variant={variant} className={cn("font-normal", className)}>
      {label}
    </Badge>
  );
}
