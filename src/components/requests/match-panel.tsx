"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/components/i18n/i18n-provider";
import { apiFetch } from "@/lib/api-client";
import type { MatchingRecommendation } from "@/server/services/matching-service";

export function MatchPanel({
  requestId,
  canAssign
}: {
  requestId: string;
  canAssign: boolean;
}) {
  const router = useRouter();
  const { dictionary: t } = useI18n();
  const [recommendations, setRecommendations] = useState<MatchingRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadRecommendations() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/requests/${requestId}/match`);
      const data = (await response.json().catch(() => null)) as {
        recommendations?: MatchingRecommendation[];
        error?: string;
      } | null;
      if (!response.ok) {
        setError(data?.error ?? t.matching.loadError);
        return;
      }
      setRecommendations(data?.recommendations ?? []);
      setHasLoaded(true);
    } catch {
      setError(t.matching.loadError);
    } finally {
      setLoading(false);
    }
  }

  async function assign(recommendation: MatchingRecommendation) {
    setAssigningId(recommendation.expertId);
    setError(null);
    try {
      const response = await apiFetch(`/api/requests/${requestId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expertId: recommendation.expertId })
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? t.matching.assignError);
        return;
      }
      router.refresh();
    } catch {
      setError(t.matching.assignError);
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{t.matching.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.matching.description}</p>
        </div>
        {canAssign ? (
          <Button type="button" onClick={loadRecommendations} disabled={loading} aria-busy={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {loading ? t.common.loading : t.matching.loadRecommendations}
          </Button>
        ) : null}
      </div>
      {error ? <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}</div> : null}
      {loading ? (
        <div className="grid animate-pulse gap-3" aria-label={t.common.loading}>
          {[0, 1].map((item) => <div key={item} className="h-32 rounded-lg border bg-muted/60" />)}
        </div>
      ) : null}
      {!loading && hasLoaded && recommendations.length === 0 ? (
        <EmptyState title={t.matching.emptyTitle} text={t.matching.emptyText} />
      ) : null}
      <div className="grid gap-3">
        {recommendations.map((recommendation) => (
          <div key={recommendation.expertId} className="rounded-lg border bg-background p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-foreground">{recommendation.fullName}</div>
                <div className="mt-1 text-sm leading-6 text-muted-foreground">{recommendation.explanation}</div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5" aria-hidden="true" />
                    {t.matching.rating}: {recommendation.rating.toFixed(1)}
                  </span>
                  <span>{t.matching.load}: {recommendation.loadPercentage}%</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold text-foreground">{recommendation.finalScore}</div>
                <div className="text-xs text-muted-foreground">{t.common.score}</div>
              </div>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
              <Progress value={recommendation.finalScore} label={`${t.matching.load} ${recommendation.loadPercentage}%`} />
              <Button
                type="button"
                size="sm"
                disabled={!canAssign || assigningId !== null}
                onClick={() => assign(recommendation)}
              >
                {assigningId === recommendation.expertId ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                {assigningId === recommendation.expertId ? t.matching.assigning : t.matching.assign}
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {recommendation.matchedSkills.map((skill) => (
                <span key={skill} className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                  {skill}
                </span>
              ))}
              {recommendation.missingSkills.map((skill) => (
                <span key={skill} className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" />
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
