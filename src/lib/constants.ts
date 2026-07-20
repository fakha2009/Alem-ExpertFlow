export const APP_NAME = "Alem ExpertFlow";

export const SESSION_COOKIE = "aef_session";

export const USER_ROLES = ["admin", "manager", "expert", "viewer"] as const;
export const REQUEST_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const REQUEST_STATUSES = ["new", "assigned", "in_progress", "review", "done", "rejected"] as const;
export const EXPERT_TYPES = ["expert", "mentor", "freelancer"] as const;
export const SKILL_IMPORTANCE = ["low", "medium", "high", "critical"] as const;
export const ASSIGNMENT_STATUSES = ["recommended", "assigned", "declined"] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type RequestPriority = (typeof REQUEST_PRIORITIES)[number];
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type ExpertType = (typeof EXPERT_TYPES)[number];
export type SkillImportance = (typeof SKILL_IMPORTANCE)[number];
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole);
}

export function isFinalRequestStatus(status: RequestStatus) {
  return status === "done" || status === "rejected";
}

export function isActiveRequestStatus(status: RequestStatus) {
  return status === "assigned" || status === "in_progress" || status === "review";
}

export const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  expert: "Expert",
  viewer: "Viewer"
};

export const priorityLabels: Record<RequestPriority, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
  urgent: "Срочный"
};

export const statusLabels: Record<RequestStatus, string> = {
  new: "Новая",
  assigned: "Назначена",
  in_progress: "В работе",
  review: "Проверка",
  done: "Готово",
  rejected: "Отклонена"
};

export const expertTypeLabels: Record<ExpertType, string> = {
  expert: "Эксперт",
  mentor: "Ментор",
  freelancer: "Фрилансер"
};

export const importanceLabels: Record<SkillImportance, string> = {
  low: "Низкая",
  medium: "Средняя",
  high: "Высокая",
  critical: "Критичная"
};

export const roleDescriptions: Record<UserRole, string> = {
  admin: "Полный доступ к управлению системой",
  manager: "Создает заявки и назначает исполнителей",
  expert: "Работает с назначенными заявками",
  viewer: "Просматривает заявки и аналитику"
};

export const PAGE_SIZE = 10;
