import { isFinalRequestStatus, type RequestStatus, type UserRole } from "@/lib/constants";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
};

const roleRank: Record<UserRole, number> = {
  viewer: 1,
  expert: 2,
  manager: 3,
  admin: 4
};

export function hasAtLeastRole(user: SessionUser, role: UserRole) {
  return roleRank[user.role] >= roleRank[role];
}

export function canManageUsers(user: SessionUser) {
  return user.role === "admin";
}

export function canManageSkills(user: SessionUser) {
  return user.role === "admin" || user.role === "manager";
}

export function canCreateRequest(user: SessionUser) {
  return user.role === "admin" || user.role === "manager";
}

export function canMutateRequest(user: SessionUser) {
  return user.role === "admin" || user.role === "manager";
}

export function canDeleteRequest(user: SessionUser) {
  return user.role === "admin";
}

export function canAssignExpert(user: SessionUser) {
  return user.role === "admin" || user.role === "manager";
}

export function canManageExperts(user: SessionUser) {
  return user.role === "admin" || user.role === "manager";
}

export function canViewExperts(user: SessionUser) {
  return user.role !== "expert";
}

export function canViewAnalytics(user: SessionUser) {
  return user.role !== "expert";
}

export function canViewActivity(user: SessionUser) {
  return user.role === "admin" || user.role === "manager";
}

export function canComment(user: SessionUser) {
  return user.role === "admin" || user.role === "manager" || user.role === "expert";
}

const expertTransitions: Partial<Record<RequestStatus, RequestStatus[]>> = {
  assigned: ["in_progress"],
  in_progress: ["review"],
  review: ["in_progress", "done"]
};

const managerTransitions: Partial<Record<RequestStatus, RequestStatus[]>> = {
  new: ["rejected"],
  assigned: ["in_progress", "review", "done", "rejected"],
  in_progress: ["review", "done", "rejected"],
  review: ["in_progress", "done", "rejected"]
};

export function getAllowedStatusTransitions(user: SessionUser, currentStatus: RequestStatus) {
  if (user.role === "viewer" || isFinalRequestStatus(currentStatus)) return [];
  return user.role === "expert"
    ? expertTransitions[currentStatus] ?? []
    : managerTransitions[currentStatus] ?? [];
}

export function canChangeStatus(user: SessionUser, currentStatus: RequestStatus, nextStatus: RequestStatus) {
  return getAllowedStatusTransitions(user, currentStatus).includes(nextStatus);
}

export function assertPermission(condition: boolean, message = "Недостаточно прав") {
  if (!condition) {
    const error = new Error(message);
    error.name = "ForbiddenError";
    throw error;
  }
}
