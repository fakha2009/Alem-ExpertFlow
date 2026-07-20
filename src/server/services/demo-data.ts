import { getDb } from "@/server/db/client";
import { hashPassword } from "@/server/auth/password";
import { invalidateAnalyticsCache } from "@/server/cache/analytics-cache";
import {
  activityLogs,
  assignments,
  comments,
  expertSkills,
  experts,
  requestSkills,
  requests,
  skills,
  users,
  type Expert,
  type Skill,
  type User
} from "@/server/db/schema";

const skillSeeds = [
  ["Backend", "backend", "Engineering", "Node.js, API design, databases and server-side architecture"],
  ["Frontend", "frontend", "Engineering", "React, Next.js and production UI implementation"],
  ["UI/UX", "ui-ux", "Design", "Product design, usability and interface systems"],
  ["AI", "ai", "Data", "AI integration, LLM workflows and recommendation systems"],
  ["Data Analysis", "data-analysis", "Data", "Dashboards, SQL analysis and metric diagnostics"],
  ["Education", "education", "Programs", "Learning design, mentoring and curriculum work"],
  ["Project Management", "project-management", "Operations", "Planning, delivery and stakeholder management"],
  ["DevOps", "devops", "Engineering", "CI/CD, cloud deployments and infrastructure"],
  ["QA", "qa", "Engineering", "Testing strategy, automation and release quality"],
  ["Product Management", "product-management", "Product", "Discovery, roadmap and product operations"],
  ["Mentoring", "mentoring", "Programs", "Mentor matching, expert sessions and feedback loops"],
  ["Business Analysis", "business-analysis", "Operations", "Requirements, process mapping and business cases"]
] as const;

const userSeeds = [
  { email: "admin@example.com", password: "Admin123!", fullName: "Alem Administrator", role: "admin" as const },
  { email: "manager@example.com", password: "Manager123!", fullName: "Madina Manager", role: "manager" as const },
  { email: "expert@example.com", password: "Expert123!", fullName: "Ruslan Expert", role: "expert" as const },
  { email: "viewer@example.com", password: "Viewer123!", fullName: "Assel Viewer", role: "viewer" as const }
];

const expertSeeds = [
  {
    fullName: "Ruslan Expert",
    type: "expert" as const,
    userEmail: "expert@example.com",
    bio: "Senior full-stack engineer with strong API, database and platform delivery background.",
    currentLoad: 2,
    maxActiveRequests: 5,
    rating: 4.8,
    available: true,
    response: 8,
    completed: 42,
    skillSlugs: ["backend", "frontend", "devops", "qa"]
  },
  {
    fullName: "Aliya Satpayeva",
    type: "mentor" as const,
    bio: "Mentor for education programs, product discovery and team capability building.",
    currentLoad: 4,
    maxActiveRequests: 6,
    rating: 4.7,
    available: true,
    response: 12,
    completed: 58,
    skillSlugs: ["education", "mentoring", "product-management", "business-analysis"]
  },
  {
    fullName: "Daniyar Kim",
    type: "freelancer" as const,
    bio: "Data analyst focused on dashboards, SQL models and metric quality.",
    currentLoad: 5,
    maxActiveRequests: 5,
    rating: 4.4,
    available: true,
    response: 18,
    completed: 36,
    skillSlugs: ["data-analysis", "ai", "business-analysis"]
  },
  {
    fullName: "Maria Orlova",
    type: "expert" as const,
    bio: "Product designer for internal tools, UX audits and design systems.",
    currentLoad: 1,
    maxActiveRequests: 4,
    rating: 4.9,
    available: true,
    response: 6,
    completed: 51,
    skillSlugs: ["ui-ux", "frontend", "product-management"]
  },
  {
    fullName: "Nikita Vorontsov",
    type: "expert" as const,
    bio: "DevOps and QA expert for Vercel, CI/CD and release reliability.",
    currentLoad: 6,
    maxActiveRequests: 5,
    rating: 4.3,
    available: true,
    response: 20,
    completed: 29,
    skillSlugs: ["devops", "qa", "backend"]
  },
  {
    fullName: "Aigerim Zhumabek",
    type: "mentor" as const,
    bio: "Program mentor for EdTech, mentoring workflows and expert sessions.",
    currentLoad: 0,
    maxActiveRequests: 5,
    rating: 4.6,
    available: true,
    response: 10,
    completed: 33,
    skillSlugs: ["education", "mentoring", "project-management"]
  },
  {
    fullName: "Sergey Lee",
    type: "freelancer" as const,
    bio: "Frontend specialist for React performance, tables and form-heavy interfaces.",
    currentLoad: 3,
    maxActiveRequests: 4,
    rating: 4.5,
    available: false,
    response: 36,
    completed: 24,
    skillSlugs: ["frontend", "ui-ux", "qa"]
  },
  {
    fullName: "Timur Akhmetov",
    type: "expert" as const,
    bio: "Business analyst and project manager for requirements, scope and stakeholder alignment.",
    currentLoad: 2,
    maxActiveRequests: 6,
    rating: 4.2,
    available: true,
    response: 14,
    completed: 31,
    skillSlugs: ["business-analysis", "project-management", "product-management"]
  }
];

const requestTitles = [
  "Backend API architecture audit",
  "Mentor matching for education program",
  "Internal cabinet UX audit",
  "Request analytics setup",
  "CI/CD pipeline preparation"
] as const;

const categories = ["Product", "Engineering", "Education", "Operations", "Data"] as const;
const priorities = ["low", "medium", "high", "urgent"] as const;
const statuses = ["new", "assigned", "in_progress", "review", "done", "rejected"] as const;

function deadline(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function requiredFromMap<T>(map: Map<string, T>, key: string) {
  const value = map.get(key);
  if (!value) throw new Error(`Missing seed reference: ${key}`);
  return value;
}

export async function resetDemoData() {
  const db = getDb();

  const result = await db.transaction(async (tx) => {
    await tx.delete(activityLogs);
    await tx.delete(comments);
    await tx.delete(assignments);
    await tx.delete(requestSkills);
    await tx.delete(requests);
    await tx.delete(expertSkills);
    await tx.delete(experts);
    await tx.delete(skills);
    await tx.delete(users);

    const insertedUsers = await tx
      .insert(users)
      .values(
        await Promise.all(
          userSeeds.map(async (user) => ({
            email: user.email,
            passwordHash: await hashPassword(user.password),
            fullName: user.fullName,
            role: user.role
          }))
        )
      )
      .returning();

    const usersByEmail = new Map<string, User>(insertedUsers.map((user) => [user.email, user]));

    const insertedSkills = await tx
      .insert(skills)
      .values(
        skillSeeds.map(([name, slug, category, description]) => ({
          name,
          slug,
          category,
          description
        }))
      )
      .returning();

    const skillsBySlug = new Map<string, Skill>(insertedSkills.map((skill) => [skill.slug, skill]));
    const insertedExperts: Expert[] = [];

    for (const seed of expertSeeds) {
      const [expert] = await tx
        .insert(experts)
        .values({
          userId: seed.userEmail ? requiredFromMap(usersByEmail, seed.userEmail).id : null,
          fullName: seed.fullName,
          type: seed.type,
          bio: seed.bio,
          currentLoad: seed.currentLoad,
          maxActiveRequests: seed.maxActiveRequests,
          rating: seed.rating.toFixed(2),
          isAvailable: seed.available,
          responseTimeHours: seed.response,
          completedRequestsCount: seed.completed
        })
        .returning();

      insertedExperts.push(expert);
      await tx.insert(expertSkills).values(
        seed.skillSlugs.map((slug, index) => ({
          expertId: expert.id,
          skillId: requiredFromMap(skillsBySlug, slug).id,
          level: Math.max(3, 5 - (index % 3)),
          yearsExperience: 2 + index * 2,
          verified: index <= 1
        }))
      );
    }

    const admin = requiredFromMap(usersByEmail, "admin@example.com");
    const manager = requiredFromMap(usersByEmail, "manager@example.com");

    for (let index = 0; index < 20; index += 1) {
      const status = statuses[index % statuses.length];
      const priority = priorities[index % priorities.length];
      const assignedExpert = status === "new" || status === "rejected" ? null : insertedExperts[index % insertedExperts.length];
      const [request] = await tx
        .insert(requests)
        .values({
          publicId: `REQ-2026-${String(index + 1).padStart(3, "0")}`,
          title: requestTitles[index % requestTitles.length],
          description:
            "Assess the request, choose a qualified expert, document the work plan and hand the result back to the manager.",
          category: categories[index % categories.length],
          priority,
          status,
          deadline: deadline(index - 4),
          createdById: index % 2 === 0 ? manager.id : admin.id,
          assignedExpertId: assignedExpert?.id ?? null,
          completedAt: status === "done" ? deadline(-1) : null
        })
        .returning();

      const primarySkill = insertedSkills[index % insertedSkills.length];
      const secondarySkill = insertedSkills[(index + 3) % insertedSkills.length];

      await tx.insert(requestSkills).values([
        { requestId: request.id, skillId: primarySkill.id, importance: index % 3 === 0 ? "critical" : "high" },
        { requestId: request.id, skillId: secondarySkill.id, importance: "medium" }
      ]);

      if (assignedExpert) {
        await tx.insert(assignments).values({
          requestId: request.id,
          expertId: assignedExpert.id,
          assignedById: manager.id,
          score: 72 + (index % 22),
          explanation: "Seed assignment: skills match, load is acceptable, rating is high.",
          status: "assigned"
        });
      }

      if (index < 8) {
        await tx.insert(comments).values({
          requestId: request.id,
          authorId: manager.id,
          body: "Inputs reviewed. Waiting for confirmation on timeline and expert availability."
        });
      }

      await tx.insert(activityLogs).values({
        actorId: manager.id,
        action: "request.created",
        entityType: "request",
        entityId: request.id,
        metadata: { publicId: request.publicId, status: request.status }
      });
    }

    return { adminUser: admin };
  });

  await invalidateAnalyticsCache();
  return result;
}
