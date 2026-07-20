import assert from "node:assert/strict";
import test from "node:test";
import { scoreExpert, type MatchExpert, type MatchRequestSkill } from "@/server/services/matching-score";

const requestSkills: MatchRequestSkill[] = [
  { skillId: "backend", name: "Backend", importance: "critical" },
  { skillId: "qa", name: "QA", importance: "high" }
];

function expert(overrides: Partial<MatchExpert> = {}): MatchExpert {
  return {
    expertId: "expert-1",
    fullName: "Test Expert",
    currentLoad: 0,
    maxActiveRequests: 5,
    rating: "5.00",
    isAvailable: true,
    responseTimeHours: 4,
    completedRequestsCount: 20,
    skills: [
      { skillId: "backend", skillName: "Backend", level: 5, yearsExperience: 10, verified: true },
      { skillId: "qa", skillName: "QA", level: 5, yearsExperience: 10, verified: true }
    ],
    ...overrides
  };
}

test("perfect available candidate receives the maximum score", () => {
  const result = scoreExpert(requestSkills, expert());
  assert.equal(result.finalScore, 100);
  assert.deepEqual(result.missingSkills, []);
  assert.equal(result.components.skillMatchScore, 45);
});

test("missing a required skill lowers the recommendation", () => {
  const candidate = expert({ skills: [expert().skills[0]] });
  const result = scoreExpert(requestSkills, candidate);
  assert.ok(result.finalScore < 100);
  assert.deepEqual(result.missingSkills, ["QA"]);
});

test("over-capacity candidate is penalized and clamped", () => {
  const result = scoreExpert(requestSkills, expert({ currentLoad: 6, maxActiveRequests: 5 }));
  assert.equal(result.overload, true);
  assert.equal(result.components.penalties, -15);
  assert.ok(result.finalScore >= 0 && result.finalScore <= 100);
});
