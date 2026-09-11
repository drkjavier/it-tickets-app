import type { Role, TicketStatus, Priority, ResolutionType, BranchType } from "@/generated/prisma/client";

export type { Role, TicketStatus, Priority, ResolutionType, BranchType };

export type { JwtPayload, AuthUser } from "@/lib/auth";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TicketWithRelations {
  id: string;
  code: string;
  title: string;
  description: string;
  priority: Priority;
  status: TicketStatus;
  rating: number | null;
  projectId: string;
  createdById: string;
  assignedToId: string | null;
  durationSeconds: number | null;
  createdAt: Date;
  updatedAt: Date;
  project: {
    id: string;
    name: string;
    abbreviation: string;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  assignedTo: {
    id: string;
    name: string;
    email: string;
  } | null;
  subtasks: Subtask[];
  comments: CommentWithUser[];
  taggedUsers: TaggedUser[];
  statusHistory: TicketStatusHistory[];
  resolutions: TicketResolution[];
  _count?: {
    comments: number;
    subtasks: number;
  };
}

export interface TicketResolution {
  id: string;
  ticketId: string;
  type: ResolutionType;
  branchName: string | null;
  branchType: BranchType | null;
  dbScript: string | null;
  createdAt: Date;
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  createdAt: Date;
}

export interface TicketStatusHistory {
  id: string;
  ticketId: string;
  fromStatus: string | null;
  toStatus: string;
  durationSeconds: number | null;
  createdAt: Date;
}

export interface CommentWithUser {
  id: string;
  content: string;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface TaggedUser {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface StatusTransitionPayload {
  ticketId: string;
  fromStatus: TicketStatus;
  toStatus: TicketStatus;
  userId: string;
  timestamp: number;
}

export interface NotificationPayload {
  userId: string;
  type: "TICKET_CREATED" | "TICKET_ASSIGNED" | "TICKET_STATUS_CHANGED";
  title: string;
  message: string;
  ticketId: string;
  sentById?: string;
}

export interface EmailPayload {
  to: string[];
  subject: string;
  html: string;
  headers?: Record<string, string>;
}

export const PRIORITY_ORDER: Record<Priority, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  CREATED: "Creado",
  EN_COURSE: "En curso",
  IN_REVIEW: "En revisión",
  REJECTED: "Rechazado",
  TERMINATED: "Terminado",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};
