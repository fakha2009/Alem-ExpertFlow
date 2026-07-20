import assert from "node:assert/strict";
import test from "node:test";
import { getSafeRedirectPath } from "@/lib/navigation";
import { getAllowedStatusTransitions, type SessionUser } from "@/server/permissions/rbac";
import { expertInputSchema } from "@/server/validators/expert";
import { requestInputSchema } from "@/server/validators/request";

const user = (role: SessionUser["role"]): SessionUser => ({
  id: "00000000-0000-4000-8000-000000000001",
  email: `${role}@example.com`,
  fullName: role,
  role
});

test("status transitions enforce role and final-state rules", () => {
  assert.deepEqual(getAllowedStatusTransitions(user("expert"), "assigned"), ["in_progress"]);
  assert.deepEqual(getAllowedStatusTransitions(user("viewer"), "assigned"), []);
  assert.deepEqual(getAllowedStatusTransitions(user("manager"), "done"), []);
});

test("redirect helper only accepts same-origin relative paths", () => {
  assert.equal(getSafeRedirectPath("/requests?q=api"), "/requests?q=api");
  assert.equal(getSafeRedirectPath("//evil.example"), "/dashboard");
  assert.equal(getSafeRedirectPath("javascript:alert(1)"), "/dashboard");
});

test("request input strips workflow fields and rejects duplicate skills", () => {
  const base = {
    title: "  API audit  ",
    description: "  Review the complete API surface.  ",
    category: "  Engineering  ",
    priority: "high" as const,
    deadline: null,
    status: "done",
    assignedExpertId: "00000000-0000-4000-8000-000000000001",
    skills: [{ skillId: "00000000-0000-4000-8000-000000000002", importance: "critical" as const }]
  };
  const parsed = requestInputSchema.parse(base);
  assert.equal(parsed.title, "API audit");
  assert.equal("status" in parsed, false);
  assert.equal("assignedExpertId" in parsed, false);

  const duplicate = requestInputSchema.safeParse({ ...base, skills: [...base.skills, ...base.skills] });
  assert.equal(duplicate.success, false);
});

test("expert input requires real booleans", () => {
  const result = expertInputSchema.safeParse({
    fullName: "Test Expert",
    userId: null,
    type: "expert",
    bio: "",
    maxActiveRequests: 5,
    rating: 4.5,
    isAvailable: "false",
    responseTimeHours: 8,
    skills: [{
      skillId: "00000000-0000-4000-8000-000000000002",
      level: 4,
      yearsExperience: 3,
      verified: false
    }]
  });
  assert.equal(result.success, false);
});
