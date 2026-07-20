"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { statusLabels, type RequestStatus } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n/i18n-provider";
import { apiFetch } from "@/lib/api-client";

export function StatusActions({
  requestId,
  allowedStatuses
}: {
  requestId: string;
  allowedStatuses: RequestStatus[];
}) {
  const router = useRouter();
  const { dictionary: t } = useI18n();
  const [pendingStatus, setPendingStatus] = useState<RequestStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function change(status: RequestStatus) {
    setPendingStatus(status);
    setError(null);
    try {
      const response = await apiFetch(`/api/requests/${requestId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? t.requests.statusError);
        return;
      }
      router.refresh();
    } catch {
      setError(t.requests.statusError);
    } finally {
      setPendingStatus(null);
    }
  }

  if (allowedStatuses.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.requests.statusLocked}</p>;
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {allowedStatuses.map((status) => (
          <Button
            key={status}
            type="button"
            variant={status === "rejected" ? "danger" : "secondary"}
            size="sm"
            disabled={pendingStatus !== null}
            aria-busy={pendingStatus === status}
            onClick={() => change(status)}
          >
            {pendingStatus === status ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
            {t.labels.statuses[status] ?? statusLabels[status]}
          </Button>
        ))}
      </div>
      {error ? <p role="alert" className="text-sm font-medium text-danger">{error}</p> : null}
    </div>
  );
}
