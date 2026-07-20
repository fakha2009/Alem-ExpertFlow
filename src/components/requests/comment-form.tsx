"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/components/i18n/i18n-provider";
import { apiFetch } from "@/lib/api-client";

export function CommentForm({ requestId, allowed }: { requestId: string; allowed: boolean }) {
  const router = useRouter();
  const { dictionary: t } = useI18n();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!allowed) return null;

  async function submit() {
    if (!body.trim()) return;
    setPending(true);
    setError(null);
    try {
      const response = await apiFetch(`/api/requests/${requestId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body })
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? t.comments.error);
        return;
      }
      setBody("");
      router.refresh();
    } catch {
      setError(t.comments.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="grid gap-3">
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={t.comments.addPlaceholder}
        aria-label={t.comments.aria}
      />
      {error ? <div role="alert" className="text-sm font-medium text-danger">{error}</div> : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending || !body.trim()}>
          {pending ? t.comments.sending : t.comments.add}
        </Button>
      </div>
    </form>
  );
}
