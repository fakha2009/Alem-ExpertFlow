import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "expert", "viewer"]);
export const expertTypeEnum = pgEnum("expert_type", ["expert", "mentor", "freelancer"]);
export const requestPriorityEnum = pgEnum("request_priority", ["low", "medium", "high", "urgent"]);
export const requestStatusEnum = pgEnum("request_status", [
  "new",
  "assigned",
  "in_progress",
  "review",
  "done",
  "rejected"
]);
export const skillImportanceEnum = pgEnum("skill_importance", ["low", "medium", "high", "critical"]);
export const assignmentStatusEnum = pgEnum("assignment_status", ["recommended", "assigned", "declined"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    fullName: varchar("full_name", { length: 160 }).notNull(),
    role: userRoleEnum("role").notNull().default("viewer"),
    isActive: boolean("is_active").notNull().default(true),
    sessionVersion: integer("session_version").notNull().default(0),
    ...timestamps
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_unique").on(table.email),
    emailLowerIdx: uniqueIndex("users_email_lower_unique").on(sql`lower(${table.email})`),
    roleIdx: index("users_role_idx").on(table.role),
    sessionVersionCheck: check("users_session_version_non_negative", sql`${table.sessionVersion} >= 0`)
  })
);

export const experts = pgTable(
  "experts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    fullName: varchar("full_name", { length: 160 }).notNull(),
    type: expertTypeEnum("type").notNull(),
    bio: text("bio").notNull().default(""),
    currentLoad: integer("current_load").notNull().default(0),
    maxActiveRequests: integer("max_active_requests").notNull().default(5),
    rating: numeric("rating", { precision: 3, scale: 2 }).notNull().default("4.50"),
    isAvailable: boolean("is_available").notNull().default(true),
    responseTimeHours: integer("response_time_hours").notNull().default(24),
    completedRequestsCount: integer("completed_requests_count").notNull().default(0),
    ...timestamps
  },
  (table) => ({
    userIdx: index("experts_user_id_idx").on(table.userId),
    userUnique: uniqueIndex("experts_user_id_unique").on(table.userId),
    availableIdx: index("experts_is_available_idx").on(table.isAvailable),
    typeIdx: index("experts_type_idx").on(table.type),
    ratingIdx: index("experts_rating_idx").on(table.rating),
    loadIdx: index("experts_current_load_idx").on(table.currentLoad),
    matchingIdx: index("experts_matching_idx").on(table.isAvailable, table.rating, table.currentLoad),
    loadCheck: check("experts_load_non_negative", sql`${table.currentLoad} >= 0`),
    capacityCheck: check("experts_capacity_positive", sql`${table.maxActiveRequests} > 0`),
    ratingCheck: check("experts_rating_range", sql`${table.rating} >= 0 AND ${table.rating} <= 5`),
    responseTimeCheck: check("experts_response_time_positive", sql`${table.responseTimeHours} > 0`)
  })
);

export const skills = pgTable(
  "skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull(),
    category: varchar("category", { length: 120 }).notNull(),
    description: text("description").notNull().default(""),
    ...timestamps
  },
  (table) => ({
    slugIdx: uniqueIndex("skills_slug_unique").on(table.slug)
  })
);

export const expertSkills = pgTable(
  "expert_skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    expertId: uuid("expert_id")
      .notNull()
      .references(() => experts.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    level: integer("level").notNull(),
    yearsExperience: integer("years_experience").notNull().default(0),
    verified: boolean("verified").notNull().default(false),
    ...timestamps
  },
  (table) => ({
    expertIdx: index("expert_skills_expert_id_idx").on(table.expertId),
    skillIdx: index("expert_skills_skill_id_idx").on(table.skillId),
    uniqueExpertSkill: uniqueIndex("expert_skills_expert_skill_unique").on(table.expertId, table.skillId),
    levelCheck: check("expert_skills_level_range", sql`${table.level} BETWEEN 1 AND 5`),
    yearsCheck: check("expert_skills_years_non_negative", sql`${table.yearsExperience} >= 0`)
  })
);

export const requests = pgTable(
  "requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: varchar("public_id", { length: 32 }).notNull(),
    title: varchar("title", { length: 220 }).notNull(),
    description: text("description").notNull(),
    category: varchar("category", { length: 120 }).notNull(),
    priority: requestPriorityEnum("priority").notNull().default("medium"),
    status: requestStatusEnum("status").notNull().default("new"),
    deadline: timestamp("deadline", { withTimezone: true }),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    assignedExpertId: uuid("assigned_expert_id").references(() => experts.id, { onDelete: "set null" }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps
  },
  (table) => ({
    publicIdIdx: uniqueIndex("requests_public_id_unique").on(table.publicId),
    statusIdx: index("requests_status_idx").on(table.status),
    priorityIdx: index("requests_priority_idx").on(table.priority),
    categoryIdx: index("requests_category_idx").on(table.category),
    assignedExpertIdx: index("requests_assigned_expert_id_idx").on(table.assignedExpertId),
    createdByIdx: index("requests_created_by_id_idx").on(table.createdById),
    deadlineIdx: index("requests_deadline_idx").on(table.deadline),
    createdAtIdx: index("requests_created_at_idx").on(table.createdAt),
    statusCreatedAtIdx: index("requests_status_created_at_idx").on(table.status, table.createdAt)
  })
);

export const requestSkills = pgTable(
  "request_skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    importance: skillImportanceEnum("importance").notNull().default("medium"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    requestIdx: index("request_skills_request_id_idx").on(table.requestId),
    skillIdx: index("request_skills_skill_id_idx").on(table.skillId),
    uniqueRequestSkill: uniqueIndex("request_skills_request_skill_unique").on(table.requestId, table.skillId)
  })
);

export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    expertId: uuid("expert_id")
      .notNull()
      .references(() => experts.id, { onDelete: "restrict" }),
    assignedById: uuid("assigned_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    score: integer("score").notNull(),
    explanation: text("explanation").notNull(),
    status: assignmentStatusEnum("status").notNull().default("assigned"),
    ...timestamps
  },
  (table) => ({
    requestIdx: index("assignments_request_id_idx").on(table.requestId),
    expertIdx: index("assignments_expert_id_idx").on(table.expertId),
    activeRequestUnique: uniqueIndex("assignments_one_active_per_request")
      .on(table.requestId)
      .where(sql`${table.status} = 'assigned'`),
    scoreCheck: check("assignments_score_range", sql`${table.score} BETWEEN 0 AND 100`)
  })
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    ...timestamps
  },
  (table) => ({
    requestIdx: index("comments_request_id_idx").on(table.requestId)
  })
);

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 80 }).notNull(),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    entityIdx: index("activity_logs_entity_idx").on(table.entityType, table.entityId),
    createdAtIdx: index("activity_logs_created_at_idx").on(table.createdAt)
  })
);

export const authRateLimits = pgTable(
  "auth_rate_limits",
  {
    key: varchar("key", { length: 64 }).primaryKey(),
    count: integer("count").notNull().default(0),
    resetAt: timestamp("reset_at", { withTimezone: true }).notNull()
  },
  (table) => ({
    resetAtIdx: index("auth_rate_limits_reset_at_idx").on(table.resetAt),
    countCheck: check("auth_rate_limits_count_non_negative", sql`${table.count} >= 0`)
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Expert = typeof experts.$inferSelect;
export type NewExpert = typeof experts.$inferInsert;
export type Skill = typeof skills.$inferSelect;
export type NewSkill = typeof skills.$inferInsert;
export type Request = typeof requests.$inferSelect;
export type NewRequest = typeof requests.$inferInsert;
export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
