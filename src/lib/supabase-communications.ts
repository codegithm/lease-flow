import { getDbCurrentUser } from "@/lib/supabase-config";
import { supabase } from "@/lib/supabase";

function formatTimestamp(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function normalizeMaintenanceStatus(value?: string) {
  const key = String(value || "open").toLowerCase();
  if (key === "open") return "Open";
  if (key === "inprogress" || key === "in_progress") return "InProgress";
  if (key === "onhold" || key === "on_hold") return "OnHold";
  if (key === "resolved") return "Resolved";
  if (key === "closed") return "Closed";
  if (key === "cancelled") return "Cancelled";
  return "Open";
}

function normalizeMaintenancePriority(value?: string) {
  const key = String(value || "medium").toLowerCase();
  if (key === "low") return "Low";
  if (key === "medium") return "Medium";
  if (key === "high") return "High";
  if (key === "urgent") return "Urgent";
  return "Medium";
}

function normalizeMessageType(
  value?: string,
): "Text" | "Image" | "File" | "System" {
  const key = String(value || "text").toLowerCase();
  if (key === "image") return "Image";
  if (key === "file") return "File";
  if (key === "system") return "System";
  return "Text";
}

function normalizeMessageStatus(value?: string): "Sent" | "Delivered" | "Read" {
  const key = String(value || "sent").toLowerCase();
  if (key === "delivered") return "Delivered";
  if (key === "read") return "Read";
  return "Sent";
}

async function getCurrentIdentity() {
  const auth = await supabase.auth.getUser();
  const user = auth.data.user;

  let fallback: any = null;
  try {
    const raw = localStorage.getItem("user");
    fallback = raw ? JSON.parse(raw) : null;
  } catch {
    fallback = null;
  }

  const profile = await getDbCurrentUser().catch(() => null);

  return {
    userId: user?.id || fallback?.id || profile?.id || null,
    role: String(profile?.role || fallback?.role || "tenant"),
    fullName: String(profile?.fullName || fallback?.fullName || "User"),
    companyId: profile?.companyId || fallback?.companyId || null,
  };
}

export async function getDbMessageTypes(role?: string) {
  const normalizedRole = String(role || "tenant").toLowerCase();

  if (normalizedRole === "tenant") {
    return [
      {
        id: "1",
        name: "Direct Message",
        code: "Direct",
        description: "Direct message to management",
        icon: "MessageSquare",
        color: "accent",
        isSystemType: false,
      },
      {
        id: "2",
        name: "Issue Report",
        code: "Issue",
        description: "Report an issue",
        icon: "AlertCircle",
        color: "destructive",
        isSystemType: false,
      },
      {
        id: "3",
        name: "Maintenance",
        code: "Maintenance",
        description: "Maintenance communication",
        icon: "Wrench",
        color: "warning",
        isSystemType: false,
      },
    ];
  }

  return [
    {
      id: "1",
      name: "Direct Message",
      code: "Direct",
      description: "Direct conversation",
      icon: "MessageSquare",
      color: "accent",
      isSystemType: false,
    },
    {
      id: "2",
      name: "Announcement",
      code: "Announcement",
      description: "Broadcast notice",
      icon: "Megaphone",
      color: "blue",
      isSystemType: false,
    },
    {
      id: "3",
      name: "Maintenance",
      code: "Maintenance",
      description: "Maintenance update",
      icon: "Wrench",
      color: "warning",
      isSystemType: false,
    },
    {
      id: "4",
      name: "Payment Reminder",
      code: "PaymentReminder",
      description: "Payment reminder",
      icon: "CreditCard",
      color: "orange",
      isSystemType: false,
    },
    {
      id: "5",
      name: "Issue",
      code: "Issue",
      description: "Issue report",
      icon: "AlertCircle",
      color: "destructive",
      isSystemType: false,
    },
  ];
}

export async function getDbConversations(
  options: {
    type?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const me = await getCurrentIdentity();

  let query = supabase
    .from("conversations")
    .select("*")
    .order("updated_at", { ascending: false });

  if (options.type) {
    query = query.eq("type", options.type);
  }

  if (options.status) {
    query = query.eq("status", options.status);
  }

  const { data: allRows, error } = await query;
  if (error) throw error;

  const conversationRows = allRows || [];
  if (conversationRows.length === 0) {
    return { data: [], total: 0 };
  }

  const conversationIds = conversationRows.map((c) => c.id);

  const [{ data: participantRows }, { data: messageRows }, { data: readRows }] =
    await Promise.all([
      supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", conversationIds),
      supabase
        .from("conversation_messages")
        .select(
          "id, conversation_id, sender_id, content, type, status, created_at",
        )
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("conversation_message_reads")
        .select("message_id")
        .eq("user_id", me.userId || ""),
    ]);

  const participantsByConversation = new Map<string, string[]>();
  for (const p of participantRows || []) {
    const existing = participantsByConversation.get(p.conversation_id) || [];
    existing.push(p.user_id);
    participantsByConversation.set(p.conversation_id, existing);
  }

  const readSet = new Set((readRows || []).map((r) => r.message_id));

  const filtered = conversationRows.filter((row) => {
    const participants = participantsByConversation.get(row.id) || [];
    const isParticipant = me.userId ? participants.includes(me.userId) : false;
    return isParticipant || row.created_by_user_id === me.userId;
  });

  const unitIds = Array.from(
    new Set(filtered.map((c) => c.unit_id).filter(Boolean)),
  ) as string[];

  const { data: unitRows } = unitIds.length
    ? await supabase
        .from("units")
        .select("id, name, estate_name")
        .in("id", unitIds)
    : { data: [] as any[] };

  const unitMap = new Map((unitRows || []).map((u) => [u.id, u]));

  const data = filtered.map((row) => {
    const relatedMessages = (messageRows || []).filter(
      (m) => m.conversation_id === row.id,
    );

    const lastMessage = relatedMessages[0]
      ? {
          id: relatedMessages[0].id,
          conversationId: row.id,
          senderId: relatedMessages[0].sender_id,
          content: relatedMessages[0].content,
          type: normalizeMessageType(relatedMessages[0].type),
          status: normalizeMessageStatus(relatedMessages[0].status),
          isDeleted: false,
          createdAt: relatedMessages[0].created_at,
        }
      : undefined;

    const unreadCount = relatedMessages.filter(
      (m) => m.sender_id !== me.userId && !readSet.has(m.id),
    ).length;

    const unit = row.unit_id ? unitMap.get(row.unit_id) : null;

    return {
      id: row.id,
      companyId: row.company_id || "",
      unitId: row.unit_id || undefined,
      maintenanceRequestId: row.maintenance_request_id || undefined,
      type: row.type,
      subject: row.subject,
      status: row.status,
      createdByUserId: row.created_by_user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      closedAt: row.closed_at || undefined,
      unitName: unit?.name || undefined,
      estateName: unit?.estate_name || undefined,
      unreadCount,
      lastMessage,
    };
  });

  return {
    data,
    total: data.length,
  };
}

export async function getDbConversation(id: string) {
  const result = await getDbConversations();
  const item = result.data.find((c) => c.id === id);
  if (!item) {
    throw new Error("Conversation not found.");
  }
  return item;
}

export async function createDbConversation(data: {
  type: string;
  subject: string;
  participantUserIds: string[];
  unitId?: string;
  estateId?: string;
  maintenanceRequestId?: string;
  initialMessage?: string;
}) {
  const me = await getCurrentIdentity();
  if (!me.userId) {
    throw new Error("No authenticated user found.");
  }

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({
      company_id: me.companyId,
      unit_id: data.unitId || null,
      estate_id: data.estateId || null,
      maintenance_request_id: data.maintenanceRequestId || null,
      type: data.type || "Direct",
      subject: data.subject,
      status: "Active",
      created_by_user_id: me.userId,
    })
    .select("*")
    .single();

  if (error) throw error;

  const participantIds = Array.from(
    new Set([me.userId, ...(data.participantUserIds || [])]),
  );

  if (participantIds.length > 0) {
    const participantRows = participantIds.map((userId) => ({
      conversation_id: created.id,
      user_id: userId,
      role: userId === me.userId ? "Owner" : "Participant",
      unread_count: 0,
      is_muted: false,
    }));

    const { error: participantError } = await supabase
      .from("conversation_participants")
      .insert(participantRows);

    if (participantError) throw participantError;
  }

  if (data.initialMessage) {
    await sendDbMessage(created.id, data.initialMessage);
  }

  return getDbConversation(created.id);
}

export async function getDbMessages(
  conversationId: string,
  options: {
    page?: number;
    pageSize?: number;
  } = {},
) {
  const me = await getCurrentIdentity();

  let query = supabase
    .from("conversation_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const page = options.page || 1;
  const pageSize = options.pageSize || 100;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  const items = (data || []).map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderName: row.sender_name || undefined,
    senderRole: row.sender_role || undefined,
    content: row.content,
    type: normalizeMessageType(row.type),
    status: normalizeMessageStatus(row.status),
    replyToMessageId: row.reply_to_message_id || undefined,
    metadata: row.metadata || undefined,
    editedAt: row.edited_at || undefined,
    deletedAt: row.deleted_at || undefined,
    isDeleted: Boolean(row.is_deleted),
    createdAt: row.created_at,
  }));

  if (me.userId) {
    const unreadMessageIds = items
      .filter((m) => m.senderId !== me.userId)
      .map((m) => m.id);

    if (unreadMessageIds.length > 0) {
      const readRows = unreadMessageIds.map((messageId) => ({
        message_id: messageId,
        user_id: me.userId,
      }));

      await supabase
        .from("conversation_message_reads")
        .upsert(readRows, { onConflict: "message_id,user_id" });
    }
  }

  return {
    data: items,
    total: count ?? items.length,
  };
}

export async function sendDbMessage(
  conversationId: string,
  content: string,
  options: {
    type?: string;
    replyToMessageId?: string;
  } = {},
) {
  const me = await getCurrentIdentity();
  if (!me.userId) {
    throw new Error("No authenticated user found.");
  }

  const { data, error } = await supabase
    .from("conversation_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: me.userId,
      sender_name: me.fullName,
      sender_role: me.role,
      content,
      type: options.type || "Text",
      status: "Sent",
      reply_to_message_id: options.replyToMessageId || null,
      is_deleted: false,
    })
    .select("*")
    .single();

  if (error) throw error;

  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return {
    id: data.id,
    conversationId: data.conversation_id,
    senderId: data.sender_id,
    senderName: data.sender_name || undefined,
    senderRole: data.sender_role || undefined,
    content: data.content,
    type: normalizeMessageType(data.type),
    status: normalizeMessageStatus(data.status),
    replyToMessageId: data.reply_to_message_id || undefined,
    metadata: data.metadata || undefined,
    editedAt: data.edited_at || undefined,
    deletedAt: data.deleted_at || undefined,
    isDeleted: Boolean(data.is_deleted),
    createdAt: data.created_at,
  };
}

export async function markDbConversationRead(conversationId: string) {
  await getDbMessages(conversationId, { page: 1, pageSize: 500 });
}

export async function getDbNotifications(
  options: {
    unreadOnly?: boolean;
    type?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const me = await getCurrentIdentity();

  let query = supabase
    .from("notifications")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (me.userId) {
    query = query.or(`user_id.eq.${me.userId},user_id.is.null`);
  }

  if (me.companyId) {
    query = query.or(`company_id.eq.${me.companyId},company_id.is.null`);
  }

  if (options.unreadOnly) {
    query = query.eq("is_read", false);
  }

  if (options.type) {
    query = query.eq("type", options.type);
  }

  const page = options.page || 1;
  const pageSize = options.pageSize || 50;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error } = await query;
  if (error) throw error;

  const rows = data || [];

  const unreadCount = rows.filter((n) => !n.is_read).length;
  const notifications = rows.map((row) => ({
    id: row.id,
    type: row.type || "system",
    title: row.title,
    message: row.message,
    timestamp: formatTimestamp(row.created_at),
    createdAt: row.created_at,
    isRead: Boolean(row.is_read),
    readAt: row.read_at || undefined,
    actionUrl: row.action_url || undefined,
    relatedEntityId: row.related_entity_id || undefined,
    relatedEntityType: row.related_entity_type || undefined,
  }));

  return {
    notifications,
    unreadCount,
    data: notifications,
  };
}

export async function getDbUnreadNotificationCount() {
  const result = await getDbNotifications({ unreadOnly: true, pageSize: 200 });
  return {
    unreadCount: result.unreadCount,
  };
}

export async function markDbNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (error) throw error;
  return true;
}

export async function markAllDbNotificationsRead() {
  const me = await getCurrentIdentity();

  let query = supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("is_read", false);

  if (me.userId) {
    query = query.or(`user_id.eq.${me.userId},user_id.is.null`);
  }

  const { error } = await query;
  if (error) throw error;
  return true;
}

export async function deleteDbNotification(notificationId: string) {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  if (error) throw error;
  return true;
}

export async function getDbMaintenanceRequests(
  options: {
    status?: string;
    priority?: string;
    category?: string;
    unitId?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const me = await getCurrentIdentity();
  const isTenant = me.role.toLowerCase() === "tenant";

  let query = supabase
    .from("maintenance_requests")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (options.status)
    query = query.eq("status", normalizeMaintenanceStatus(options.status));
  if (options.priority) {
    query = query.eq(
      "priority",
      normalizeMaintenancePriority(options.priority),
    );
  }
  if (options.category) query = query.eq("category", options.category);
  if (options.unitId) query = query.eq("unit_id", options.unitId);
  if (me.companyId) query = query.eq("company_id", me.companyId);
  if (isTenant && me.userId) query = query.eq("tenant_user_id", me.userId);

  const page = options.page || 1;
  const pageSize = options.pageSize || 100;
  query = query.range((page - 1) * pageSize, page * pageSize - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  const rows = data || [];
  const unitIds = Array.from(
    new Set(rows.map((r) => r.unit_id).filter(Boolean)),
  );

  const { data: unitRows } = unitIds.length
    ? await supabase.from("units").select("id, name").in("id", unitIds)
    : { data: [] as any[] };

  const unitMap = new Map((unitRows || []).map((u) => [u.id, u.name]));

  return {
    data: rows.map((row) => ({
      id: row.id,
      companyId: row.company_id,
      unitId: row.unit_id,
      tenantUserId: row.tenant_user_id,
      leaseId: row.lease_id || undefined,
      title: row.title,
      description: row.description,
      category: row.category,
      priority: row.priority,
      status: row.status,
      assignedTo: row.assigned_to || undefined,
      assignedToUserId: row.assigned_to_user_id || undefined,
      preferredContactMethod: row.preferred_contact_method || undefined,
      availability: row.availability || undefined,
      permissionToEnter: Boolean(row.permission_to_enter),
      estimatedCost:
        row.estimated_cost == null ? undefined : Number(row.estimated_cost),
      actualCost: row.actual_cost == null ? undefined : Number(row.actual_cost),
      internalNotes: row.internal_notes || undefined,
      resolutionNotes: row.resolution_notes || undefined,
      satisfactionRating: row.satisfaction_rating || undefined,
      tenantFeedback: row.tenant_feedback || undefined,
      dueDate: row.due_date || undefined,
      startedAt: row.started_at || undefined,
      completedAt: row.completed_at || undefined,
      resolvedAt: row.resolved_at || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tenantName: row.tenant_name || undefined,
      unitName: unitMap.get(row.unit_id) || undefined,
    })),
    total: count ?? rows.length,
  };
}

export async function getDbMaintenanceRequest(id: string) {
  const response = await getDbMaintenanceRequests({ pageSize: 500 });
  const item = response.data.find((row) => row.id === id);
  if (!item) {
    throw new Error("Maintenance request not found.");
  }
  return item;
}

export async function createDbMaintenanceRequest(data: {
  unitId: string;
  leaseId?: string;
  title: string;
  description: string;
  category: string;
  priority?: string;
  preferredContactMethod?: string;
  availability?: string;
  permissionToEnter?: boolean;
}) {
  const me = await getCurrentIdentity();
  if (!me.userId) {
    throw new Error("No authenticated user found.");
  }

  const { data: created, error } = await supabase
    .from("maintenance_requests")
    .insert({
      company_id: me.companyId,
      unit_id: data.unitId || null,
      tenant_user_id: me.userId,
      tenant_name: me.fullName,
      lease_id: data.leaseId || null,
      title: data.title,
      description: data.description,
      category: data.category,
      priority: normalizeMaintenancePriority(data.priority),
      status: "Open",
      preferred_contact_method: data.preferredContactMethod || null,
      availability: data.availability || null,
      permission_to_enter: data.permissionToEnter ?? false,
    })
    .select("*")
    .single();

  if (error) throw error;

  return {
    id: created.id,
    companyId: created.company_id,
    unitId: created.unit_id,
    tenantUserId: created.tenant_user_id,
    leaseId: created.lease_id || undefined,
    title: created.title,
    description: created.description,
    category: created.category,
    priority: created.priority,
    status: created.status,
    assignedTo: created.assigned_to || undefined,
    assignedToUserId: created.assigned_to_user_id || undefined,
    preferredContactMethod: created.preferred_contact_method || undefined,
    availability: created.availability || undefined,
    permissionToEnter: Boolean(created.permission_to_enter),
    createdAt: created.created_at,
    updatedAt: created.updated_at,
    tenantName: created.tenant_name || undefined,
  };
}

export async function updateDbMaintenanceStatus(
  id: string,
  data: {
    status?: string;
    priority?: string;
    assignedTo?: string;
    assignedToUserId?: string;
    internalNotes?: string;
    resolutionNotes?: string;
    estimatedCost?: number;
    actualCost?: number;
    dueDate?: string;
  },
) {
  const patch: Record<string, unknown> = {};

  if (data.status !== undefined)
    patch.status = normalizeMaintenanceStatus(data.status);
  if (data.priority !== undefined) {
    patch.priority = normalizeMaintenancePriority(data.priority);
  }
  if (data.assignedTo !== undefined) patch.assigned_to = data.assignedTo;
  if (data.assignedToUserId !== undefined) {
    patch.assigned_to_user_id = data.assignedToUserId;
  }
  if (data.internalNotes !== undefined)
    patch.internal_notes = data.internalNotes;
  if (data.resolutionNotes !== undefined) {
    patch.resolution_notes = data.resolutionNotes;
  }
  if (data.estimatedCost !== undefined)
    patch.estimated_cost = data.estimatedCost;
  if (data.actualCost !== undefined) patch.actual_cost = data.actualCost;
  if (data.dueDate !== undefined) patch.due_date = data.dueDate;

  const { data: updated, error } = await supabase
    .from("maintenance_requests")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;

  return {
    id: updated.id,
    companyId: updated.company_id,
    unitId: updated.unit_id,
    tenantUserId: updated.tenant_user_id,
    leaseId: updated.lease_id || undefined,
    title: updated.title,
    description: updated.description,
    category: updated.category,
    priority: updated.priority,
    status: updated.status,
    assignedTo: updated.assigned_to || undefined,
    assignedToUserId: updated.assigned_to_user_id || undefined,
    preferredContactMethod: updated.preferred_contact_method || undefined,
    availability: updated.availability || undefined,
    permissionToEnter: Boolean(updated.permission_to_enter),
    estimatedCost:
      updated.estimated_cost == null
        ? undefined
        : Number(updated.estimated_cost),
    actualCost:
      updated.actual_cost == null ? undefined : Number(updated.actual_cost),
    internalNotes: updated.internal_notes || undefined,
    resolutionNotes: updated.resolution_notes || undefined,
    dueDate: updated.due_date || undefined,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
    tenantName: updated.tenant_name || undefined,
  };
}

export async function addDbMaintenanceComment(
  id: string,
  comment: string,
  isVisibleToTenant = true,
) {
  const me = await getCurrentIdentity();
  if (!me.userId) {
    throw new Error("No authenticated user found.");
  }

  const { data, error } = await supabase
    .from("maintenance_activities")
    .insert({
      maintenance_request_id: id,
      performed_by_user_id: me.userId,
      performed_by_name: me.fullName,
      activity_type: "comment",
      description: comment,
      is_visible_to_tenant: isVisibleToTenant,
    })
    .select("*")
    .single();

  if (error) throw error;

  return {
    id: data.id,
    maintenanceRequestId: data.maintenance_request_id,
    performedByUserId: data.performed_by_user_id,
    performedByName: data.performed_by_name,
    activityType: data.activity_type,
    description: data.description,
    oldValue: data.old_value || undefined,
    newValue: data.new_value || undefined,
    isVisibleToTenant: Boolean(data.is_visible_to_tenant),
    createdAt: data.created_at,
  };
}

export async function submitDbMaintenanceFeedback(
  id: string,
  rating: number,
  feedback?: string,
) {
  const { error } = await supabase
    .from("maintenance_requests")
    .update({
      satisfaction_rating: rating,
      tenant_feedback: feedback || null,
    })
    .eq("id", id);

  if (error) throw error;
}
