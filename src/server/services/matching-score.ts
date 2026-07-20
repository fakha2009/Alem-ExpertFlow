import type { SkillImportance } from "@/lib/constants";
import { clamp } from "@/lib/utils";

export type MatchRequestSkill = {
  skillId: string;
  name: string;
  importance: SkillImportance;
};

export type MatchExpert = {
  expertId: string;
  fullName: string;
  currentLoad: number;
  maxActiveRequests: number;
  rating: string;
  isAvailable: boolean;
  responseTimeHours: number;
  completedRequestsCount: number;
  skills: Array<{
    skillId: string;
    skillName: string;
    level: number;
    yearsExperience: number;
    verified: boolean;
  }>;
};

const importanceWeight: Record<SkillImportance, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

export function scoreExpert(requestSkills: MatchRequestSkill[], expert: MatchExpert) {
  const totalImportance = requestSkills.reduce((sum, skill) => sum + importanceWeight[skill.importance], 0);
  const skillMap = new Map(expert.skills.map((skill) => [skill.skillId, skill]));
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  let matchedImportance = 0;
  let weightedLevel = 0;
  let totalYears = 0;

  for (const skill of requestSkills) {
    const expertSkill = skillMap.get(skill.skillId);
    const weight = importanceWeight[skill.importance];

    if (expertSkill) {
      matchedSkills.push(skill.name);
      matchedImportance += weight;
      weightedLevel += (expertSkill.level / 5) * weight;
      totalYears += Math.min(expertSkill.yearsExperience, 10);
    } else {
      missingSkills.push(skill.name);
    }
  }

  const loadPercentage = expert.maxActiveRequests > 0
    ? (expert.currentLoad / expert.maxActiveRequests) * 100
    : 100;
  const rating = Number(expert.rating);
  const overload = loadPercentage > 100;
  const skillMatchScore = totalImportance > 0 ? (matchedImportance / totalImportance) * 45 : 0;
  const skillLevelScore = totalImportance > 0 ? (weightedLevel / totalImportance) * 15 : 0;
  const availabilityScore = expert.isAvailable ? 15 : 0;
  const loadScore = clamp(15 - Math.max(0, loadPercentage - 50) * 0.25, 0, 15);
  const ratingScore = (rating / 5) * 5;
  const experienceScore = clamp(totalYears / Math.max(requestSkills.length, 1), 0, 5);
  const penalties = (expert.isAvailable ? 0 : -25) + (overload ? -15 : 0);
  const finalScore = clamp(
    skillMatchScore
      + skillLevelScore
      + availabilityScore
      + loadScore
      + ratingScore
      + experienceScore
      + penalties,
    0,
    100
  );

  return {
    expertId: expert.expertId,
    fullName: expert.fullName,
    finalScore: Math.round(finalScore),
    matchedSkills,
    missingSkills,
    loadPercentage: Math.round(loadPercentage),
    rating,
    overload,
    components: {
      skillMatchScore: Math.round(skillMatchScore),
      skillLevelScore: Math.round(skillLevelScore),
      availabilityScore: Math.round(availabilityScore),
      loadScore: Math.round(loadScore),
      ratingScore: Math.round(ratingScore),
      experienceScore: Math.round(experienceScore),
      penalties
    }
  };
}
