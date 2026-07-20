import "server-only";

import { interpolate, type AppDictionary } from "@/lib/i18n";
import { getExpertPoolForMatching, getRequestSkillsForMatching } from "@/server/repositories/request-repository";
import { scoreExpert } from "@/server/services/matching-score";

type ExpertPoolRow = Awaited<ReturnType<typeof getExpertPoolForMatching>>[number];

export type MatchingRecommendation = {
  expertId: string;
  fullName: string;
  finalScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  loadPercentage: number;
  rating: number;
  explanation: string;
  components: {
    skillMatchScore: number;
    skillLevelScore: number;
    availabilityScore: number;
    loadScore: number;
    ratingScore: number;
    experienceScore: number;
    penalties: number;
  };
};

function groupExperts(rows: ExpertPoolRow[]) {
  const map = new Map<
    string,
    Omit<ExpertPoolRow, "skillId" | "skillName" | "level" | "yearsExperience" | "verified"> & {
      skills: Array<{
        skillId: string;
        skillName: string;
        level: number;
        yearsExperience: number;
        verified: boolean;
      }>;
    }
  >();

  for (const row of rows) {
    const existing =
      map.get(row.expertId) ??
      {
        expertId: row.expertId,
        fullName: row.fullName,
        currentLoad: row.currentLoad,
        maxActiveRequests: row.maxActiveRequests,
        rating: row.rating,
        isAvailable: row.isAvailable,
        responseTimeHours: row.responseTimeHours,
        completedRequestsCount: row.completedRequestsCount,
        skills: []
      };

    if (row.skillId && row.skillName && row.level) {
      existing.skills.push({
        skillId: row.skillId,
        skillName: row.skillName,
        level: row.level,
        yearsExperience: row.yearsExperience ?? 0,
        verified: row.verified ?? false
      });
    }

    map.set(row.expertId, existing);
  }

  return Array.from(map.values());
}

function buildExplanation(input: {
  matched: number;
  total: number;
  loadPercentage: number;
  rating: number;
  available: boolean;
  missingSkills: string[];
  overload: boolean;
}, labels: AppDictionary["matching"]["explanation"]) {
  const parts = [
    interpolate(labels.matches, { matched: input.matched, total: input.total }),
    interpolate(labels.load, { load: Math.round(input.loadPercentage) }),
    interpolate(labels.rating, { rating: input.rating.toFixed(1) }),
    input.available ? labels.available : labels.unavailable
  ];

  if (input.overload) {
    parts.push(labels.overload);
  }

  if (input.missingSkills.length > 0) {
    parts.push(interpolate(labels.missing, { skills: input.missingSkills.slice(0, 3).join(", ") }));
  }

  return `${parts.join(", ")}.`;
}

export async function getMatchingRecommendations(
  requestId: string,
  labels: AppDictionary["matching"]["explanation"]
): Promise<MatchingRecommendation[]> {
  const [requestSkills, expertRows] = await Promise.all([
    getRequestSkillsForMatching(requestId),
    getExpertPoolForMatching()
  ]);

  if (requestSkills.length === 0 || expertRows.length === 0) {
    return [];
  }

  const experts = groupExperts(expertRows);

  return experts
    .map((expert) => {
      const score = scoreExpert(requestSkills, expert);

      return {
        ...score,
        explanation: buildExplanation({
          matched: score.matchedSkills.length,
          total: requestSkills.length,
          loadPercentage: score.loadPercentage,
          rating: score.rating,
          available: expert.isAvailable,
          missingSkills: score.missingSkills,
          overload: score.overload
        }, labels),
        components: score.components
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, 5);
}
