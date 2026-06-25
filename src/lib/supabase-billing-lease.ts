import { getDbCurrentUser } from "@/lib/supabase-config";
import { supabase } from "@/lib/supabase";

function currentMonthLabel() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

async function getIdentity() {
  const profile = await getDbCurrentUser().catch(() => null);

  return {
    userId: profile?.id || null,
    companyId: profile?.companyId || null,
    companyName: profile?.companyName || null,
  };
}

function mapAdditionalCharge(row: any) {
  return {
    id: row.id,
    applicationId: row.application_id,
    unitId: row.unit_id || undefined,
    tenantUserId: row.tenant_user_id || undefined,
    companyId: row.company_id || undefined,
    chargeType: row.charge_type,
    description: row.description,
    amount: Number(row.amount || 0),
    billingMonth: row.billing_month,
    status: row.status,
    createdByUserId: row.created_by_user_id || "",
    createdByRole: row.created_by_role || "",
    supportingDocumentIds: row.supporting_document_ids || undefined,
    dueDate: row.due_date || undefined,
    paidAt: row.paid_at || undefined,
    paymentTransactionId: row.payment_transaction_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAppeal(row: any) {
  return {
    id: row.id,
    additionalChargeId: row.additional_charge_id,
    tenantUserId: row.tenant_user_id,
    reason: row.reason,
    supportingDocumentIds: row.supporting_document_ids || undefined,
    status: row.status,
    reviewerResponse: row.reviewer_response || undefined,
    reviewedByUserId: row.reviewed_by_user_id || undefined,
    reviewedByRole: row.reviewed_by_role || undefined,
    reviewedAt: row.reviewed_at || undefined,
    adjustedAmount:
      row.adjusted_amount == null ? undefined : Number(row.adjusted_amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function requestDbCreditCheck(applicationId: string) {
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || "").trim();
  const projectRef =
    supabaseUrl.replace(/^https?:\/\//, "").split(".")[0] || "<project-ref>";

  const { data, error } = await supabase.functions.invoke("credit-check", {
    body: { applicationId },
  });

  if (error) {
    const edgeError = error as Error & {
      context?: { status?: number; json?: () => Promise<unknown> };
    };

    const status = edgeError.context?.status;
    let code = "";

    if (edgeError.context?.json) {
      try {
        const payload = (await edgeError.context.json()) as {
          code?: string;
          message?: string;
        };
        code = String(payload?.code || "").toUpperCase();
      } catch {
        // Ignore parse failures and fall back to status/message checks.
      }
    }

    if (
      status === 404 ||
      code === "NOT_FOUND" ||
      /function was not found|not found/i.test(edgeError.message || "")
    ) {
      throw new Error(
        `Supabase Edge Function 'credit-check' was not found for project '${projectRef}'. ` +
          `Deploy it to this project: supabase functions deploy credit-check --project-ref ${projectRef}`,
      );
    }

    throw new Error(edgeError.message || "Credit check failed");
  }

  return data;
}

export async function getDbLeaseTemplates(companyName?: string) {
  const identity = await getIdentity();

  let query = supabase
    .from("lease_templates")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (identity.companyId) {
    query = query.or(`company_id.eq.${identity.companyId},company_id.is.null`);
  }

  if (companyName) {
    query = query.or(`company_name.eq.${companyName},company_name.is.null`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    content: row.content,
    isDefault: Boolean(row.is_default),
    companyName: row.company_name || undefined,
    createdAt: row.created_at,
  }));
}

export async function createDbLeaseTemplate(payload: any) {
  const identity = await getIdentity();

  const { data, error } = await supabase
    .from("lease_templates")
    .insert({
      company_id: identity.companyId,
      company_name: payload.companyName || identity.companyName,
      name: payload.name,
      content: payload.content,
      is_default: Boolean(payload.isDefault),
      created_by_user_id: payload.createdByAgentId || identity.userId,
    })
    .select("*")
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    content: data.content,
    isDefault: Boolean(data.is_default),
    companyName: data.company_name || undefined,
    createdAt: data.created_at,
  };
}

export async function generateDbLease(applicationId: string, body: any) {
  const identity = await getIdentity();
  const content = String(body?.content || "");

  const { data, error } = await supabase
    .from("lease_documents")
    .insert({
      application_id: applicationId,
      company_id: identity.companyId,
      content,
      status: "draft",
      created_by_user_id: identity.userId,
    })
    .select("*")
    .single();

  if (error) throw error;

  const blobUri = URL.createObjectURL(
    new Blob([content], { type: "application/pdf" }),
  );

  return {
    document: {
      id: data.id,
      blobUri,
      content,
      status: data.status,
      createdAt: data.created_at,
    },
  };
}

export async function sendDbLease(applicationId: string, body?: any) {
  const documentId = body?.documentId;

  if (documentId) {
    const { error: documentError } = await supabase
      .from("lease_documents")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", documentId)
      .eq("application_id", applicationId);

    if (documentError) throw documentError;
  }

  const { data: app, error } = await supabase
    .from("applications")
    .update({
      status: "lease_sent",
      lease_pdf_path: documentId || null,
    })
    .eq("id", applicationId)
    .select("id, lease_pdf_path")
    .single();

  if (error) throw error;

  return {
    message: "Lease sent",
    document: {
      id: app.lease_pdf_path || documentId || null,
    },
  };
}

export async function getDbAdditionalCharges(filters?: {
  applicationId?: string;
  billingMonth?: string;
  status?: string;
}) {
  const identity = await getIdentity();

  let query = supabase
    .from("additional_charges")
    .select("*")
    .order("created_at", { ascending: false });

  if (identity.companyId) query = query.eq("company_id", identity.companyId);
  if (filters?.applicationId) {
    query = query.eq("application_id", filters.applicationId);
  }
  if (filters?.billingMonth)
    query = query.eq("billing_month", filters.billingMonth);
  if (filters?.status) query = query.eq("status", filters.status);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(mapAdditionalCharge);
}

export async function getDbTenantCharges(
  tenantUserId: string,
  billingMonth?: string,
) {
  let query = supabase
    .from("additional_charges")
    .select("*")
    .eq("tenant_user_id", tenantUserId)
    .order("created_at", { ascending: false });

  if (billingMonth) {
    query = query.eq("billing_month", billingMonth);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(mapAdditionalCharge);
}

export async function getDbAdditionalCharge(id: string) {
  const { data, error } = await supabase
    .from("additional_charges")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return mapAdditionalCharge(data);
}

export async function createDbAdditionalCharge(charge: {
  applicationId: string;
  unitId?: string;
  tenantUserId?: string;
  chargeType?: string;
  description: string;
  amount: number;
  billingMonth: string;
  supportingDocumentIds?: string[];
  dueDate?: string;
}) {
  const identity = await getIdentity();

  const { data, error } = await supabase
    .from("additional_charges")
    .insert({
      application_id: charge.applicationId,
      unit_id: charge.unitId || null,
      tenant_user_id: charge.tenantUserId || null,
      company_id: identity.companyId,
      charge_type: charge.chargeType || "other",
      description: charge.description,
      amount: charge.amount,
      billing_month: charge.billingMonth,
      status: "pending",
      created_by_user_id: identity.userId,
      created_by_role: "agent",
      supporting_document_ids: charge.supportingDocumentIds
        ? JSON.stringify(charge.supportingDocumentIds)
        : null,
      due_date: charge.dueDate || null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapAdditionalCharge(data);
}

export async function updateDbAdditionalCharge(
  id: string,
  updates: {
    description?: string;
    amount?: number;
    chargeType?: string;
    dueDate?: string;
    supportingDocumentIds?: string[];
  },
) {
  const patch: Record<string, unknown> = {};

  if (updates.description !== undefined)
    patch.description = updates.description;
  if (updates.amount !== undefined) patch.amount = updates.amount;
  if (updates.chargeType !== undefined) patch.charge_type = updates.chargeType;
  if (updates.dueDate !== undefined) patch.due_date = updates.dueDate;
  if (updates.supportingDocumentIds !== undefined) {
    patch.supporting_document_ids = JSON.stringify(
      updates.supportingDocumentIds,
    );
  }

  const { data, error } = await supabase
    .from("additional_charges")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapAdditionalCharge(data);
}

export async function deleteDbAdditionalCharge(id: string) {
  const { error } = await supabase
    .from("additional_charges")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function approveDbAdditionalCharge(id: string) {
  const { data, error } = await supabase
    .from("additional_charges")
    .update({ status: "approved" })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapAdditionalCharge(data);
}

export async function appealDbCharge(
  chargeId: string,
  appeal: {
    reason: string;
    supportingDocumentIds?: string[];
  },
) {
  const identity = await getIdentity();

  const { data, error } = await supabase
    .from("additional_charge_appeals")
    .insert({
      additional_charge_id: chargeId,
      tenant_user_id: identity.userId,
      reason: appeal.reason,
      supporting_document_ids: appeal.supportingDocumentIds
        ? JSON.stringify(appeal.supportingDocumentIds)
        : null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapAppeal(data);
}

export async function getDbChargeAppeals(chargeId: string) {
  const { data, error } = await supabase
    .from("additional_charge_appeals")
    .select("*")
    .eq("additional_charge_id", chargeId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapAppeal);
}

export async function reviewDbChargeAppeal(
  appealId: string,
  review: {
    approved: boolean;
    response?: string;
    adjustedAmount?: number;
  },
) {
  const identity = await getIdentity();
  const status = review.approved ? "approved" : "rejected";

  const { data: appealData, error: appealError } = await supabase
    .from("additional_charge_appeals")
    .update({
      status,
      reviewer_response: review.response || null,
      adjusted_amount: review.adjustedAmount ?? null,
      reviewed_by_user_id: identity.userId,
      reviewed_by_role: "agent",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", appealId)
    .select("*")
    .single();

  if (appealError) throw appealError;

  const chargeId = appealData.additional_charge_id;
  if (review.approved && review.adjustedAmount != null) {
    await supabase
      .from("additional_charges")
      .update({ amount: review.adjustedAmount, status: "approved" })
      .eq("id", chargeId);
  }

  const charge = await getDbAdditionalCharge(chargeId);

  return {
    appeal: mapAppeal(appealData),
    charge,
  };
}

export async function getDbTenantPaymentCharges(tenantUserIdOrAppId: string) {
  const currentMonth = currentMonthLabel();

  let query = supabase.from("additional_charges").select("*");
  if (tenantUserIdOrAppId) {
    query = query.or(
      `tenant_user_id.eq.${tenantUserIdOrAppId},application_id.eq.${tenantUserIdOrAppId}`,
    );
  }

  const { data, error } = await query.order("billing_month", {
    ascending: true,
  });
  if (error) throw error;

  const charges = (data || []).map(mapAdditionalCharge);
  const pendingCharges = charges.filter(
    (c) => c.status !== "paid" && c.status !== "cancelled",
  );
  const totalAdditionalCharges = pendingCharges.reduce(
    (sum, c) => sum + c.amount,
    0,
  );

  return {
    currentMonth,
    charges: pendingCharges,
    additionalCharges: pendingCharges,
    totalAdditionalCharges,
    totalDue: totalAdditionalCharges,
    nextPaymentDue: pendingCharges
      .map((c) => c.dueDate)
      .filter(Boolean)
      .sort()[0],
  };
}

export async function initializeDbTenantPayment(payload: {
  chargeId?: string | null;
  additionalChargeIds: string[];
  paymentType?: "rent" | "additional_charges" | "mixed";
  billingMonths?: string[];
  amountInCents: number;
  paymentMethod: string;
  callbackUrl: string;
}) {
  const { data, error } = await supabase.functions.invoke("tenant-payment", {
    body: payload,
  });

  if (error) {
    throw new Error(error.message || "Payment initialization failed");
  }

  return data;
}

export async function getDbCompanyPayments(filters?: {
  status?: string;
  tenantUserId?: string;
}) {
  const identity = await getIdentity();

  let query = supabase
    .from("tenant_payments")
    .select(
      `id, company_id, tenant_user_id, reference, amount, payment_method, status, additional_charge_ids, created_at, updated_at,
       profiles:tenant_user_id(full_name, email)`,
    )
    .order("created_at", { ascending: false });

  if (identity.companyId) {
    query = query.eq("company_id", identity.companyId);
  }
  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.tenantUserId) {
    query = query.eq("tenant_user_id", filters.tenantUserId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    companyId: row.company_id,
    tenantUserId: row.tenant_user_id,
    tenantName:
      row.profiles?.full_name || row.profiles?.email || "Unknown Tenant",
    tenantEmail: row.profiles?.email || undefined,
    reference: row.reference,
    amount: Number(row.amount || 0),
    paymentMethod: row.payment_method || undefined,
    status: row.status as
      | "initialized"
      | "pending"
      | "paid"
      | "failed"
      | "refunded",
    additionalChargeIds: row.additional_charge_ids
      ? JSON.parse(row.additional_charge_ids).filter(Boolean)
      : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
