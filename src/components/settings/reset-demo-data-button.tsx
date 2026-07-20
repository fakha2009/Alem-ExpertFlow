"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n/i18n-provider";
import { apiFetch } from "@/lib/api-client";

export function ResetDemoDataButton() {
  const { dictionary: t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resetDemoData() {
    setPending(true);
    setError(null);

    const response = await apiFetch("/api/admin/demo-reset", { method: "POST" });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setPending(false);

    if (!response.ok) {
      setError(data?.error ?? t.settings.resetError);
      return;
    }

    setDone(true);
    setConfirming(false);
  }

  if (done) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{t.settings.resetDone}</span>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {confirming ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <div className="font-semibold">{t.settings.resetConfirmTitle}</div>
              <p className="mt-1 text-sm leading-6">{t.settings.resetConfirmText}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
              {t.common.cancel}
            </Button>
            <Button type="button" variant="danger" onClick={resetDemoData} disabled={pending}>
              {pending ? t.common.saving : t.settings.confirmReset}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="danger" className="justify-self-start" onClick={() => setConfirming(true)}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          {t.settings.resetButton}
        </Button>
      )}
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</div>
      ) : null}
    </div>
  );
}
