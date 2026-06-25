import { supabase } from "@/lib/supabase";
import { getDbCurrentUser } from "@/lib/supabase-config";

const UNIT_IMAGES_BUCKET =
  import.meta.env.VITE_SUPABASE_UNIT_IMAGES_BUCKET || "unit-images";
const DOCUMENTS_BUCKET =
  import.meta.env.VITE_SUPABASE_DOCUMENTS_BUCKET || "documents";

function safeParseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  if (typeof value === "object") {
    return value as T;
  }
  return fallback;
}

function toStatus(value?: string | null) {
  const normalized = String(value || "vacant").toLowerCase();
  if (
    normalized === "vacant" ||
    normalized === "occupied" ||
    normalized === "reserved" ||
    normalized === "maintenance"
  ) {
    return normalized;
  }
  return "vacant";
}

function mapUnit(row: any) {
  const images = safeParseJson<string[]>(row.images, []);
  const packageBreakdown = safeParseJson<Record<string, number>>(
    row.package_breakdown,
    {},
  );
  const initialChargesBreakdown = safeParseJson<Record<string, number>>(
    row.initial_charges_breakdown,
    {},
  );
  const fees = safeParseJson<Array<{ name: string; amount: number }>>(
    row.fees,
    [],
  );

  return {
    id: row.id,
    companyId: row.company_id,
    companyName: row.company_name,
    estateId: row.estate_id,
    estateName: row.estate_name,
    name: row.name,
    address: row.address,
    rent: Number(row.rent || 0),
    deposit: Number(row.deposit || 0),
    bedrooms: Number(row.bedrooms || 0),
    bathrooms: Number(row.bathrooms || 0),
    sqft: Number(row.sqft || 0),
    status: toStatus(row.status),
    description: row.description || "",
    images,
    image: images[0] || "",
    billingCycle: row.billing_cycle || "Monthly",
    packageBreakdown,
    initialChargesBreakdown,
    fees,
    initialCharges: Number(row.initial_charges || 0),
    initialTotalPay: Number(row.initial_total_pay || 0),
    apartmentNumber: row.apartment_number || "",
    amenities: safeParseJson<string[]>(row.amenities, []),
    leaseHistory: safeParseJson<any[]>(row.lease_history, []),
    pendingApplications: Number(row.pending_applications || 0),
    leaseStart: row.lease_start || null,
    leaseTerm: row.lease_term || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEstate(row: any) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    address: row.address || undefined,
    city: row.city || undefined,
    province: row.province || undefined,
    postalCode: row.postal_code || undefined,
    companyId: row.company_id,
    companyName: row.company_name || undefined,
    totalUnits: Number(row.total_units || 0),
    contactEmail: row.contact_email || undefined,
    contactPhone: row.contact_phone || undefined,
    images: row.images || undefined,
    amenities: row.amenities || undefined,
    logoBlobName: row.logo_blob_name || undefined,
    logoUrl: row.logo_url || undefined,
    status: row.status || "active",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapApplication(row: any) {
  const documents = Array.isArray(row.application_documents)
    ? row.application_documents.map((doc: any) => ({
        id: doc.id,
        documentType: doc.document_type,
        filePath: doc.file_path,
        fileName: doc.file_name,
        name: doc.file_name,
        fileSize: doc.file_size,
        status: "uploaded",
        createdAt: doc.created_at,
        uploadedAt: doc.created_at,
      }))
    : [];

  return {
    id: row.id,
    applicationLinkId: row.application_link_id || undefined,
    fullName: row.full_name,
    cellNumber: row.cell_number,
    idNumber: row.id_number || undefined,
    email: row.email || undefined,
    salary: row.salary == null ? undefined : Number(row.salary),
    employer: row.employer || undefined,
    employmentStatus: row.employment_status || undefined,
    employmentDuration: row.employment_duration || undefined,
    country: row.country || "ZA",
    unitId: row.unit_id,
    companyId: row.company_id || undefined,
    agentId: row.agent_id || undefined,
    tenantUserId: row.tenant_user_id || undefined,
    status: row.status,
    requiresCreditCheck: Boolean(row.requires_credit_check),
    hasAccount: Boolean(row.has_account),
    initialPaymentPaid: Boolean(row.initial_payment_paid),
    leaseStartDate: row.lease_start_date || undefined,
    leaseDurationMonths: Number(row.lease_duration_months || 12),
    leasePdfPath: row.lease_pdf_path || undefined,
    signedLeasePath: row.signed_lease_path || undefined,
    documents,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getCurrentCompanyId(explicitCompanyId?: string) {
  if (explicitCompanyId) return explicitCompanyId;

  try {
    const profile = await getDbCurrentUser();
    if (profile?.companyId) {
      return profile.companyId;
    }
  } catch {
    // fallback to localStorage when profile cannot be loaded
  }

  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user?.companyId || null;
  } catch {
    return null;
  }
}

export async function getDbUnits() {
  const companyId = await getCurrentCompanyId();
  let query = supabase
    .from("units")
    .select("*")
    .order("created_at", { ascending: false });

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(mapUnit);
}

export async function createDbUnit(payload: any) {
  const companyId = await getCurrentCompanyId(payload.companyId);

  const insert = {
    company_id: companyId,
    company_name: payload.companyName || null,
    estate_id: payload.estateId || null,
    estate_name: payload.estateName || null,
    name: payload.name,
    address: payload.address,
    rent: payload.rent ?? 0,
    deposit: payload.deposit ?? 0,
    bedrooms: payload.bedrooms ?? 0,
    bathrooms: payload.bathrooms ?? 0,
    sqft: payload.sqft ?? 0,
    status: toStatus(payload.status),
    description: payload.description || null,
    images:
      typeof payload.images === "string"
        ? payload.images
        : JSON.stringify(payload.images || []),
    billing_cycle: payload.billingCycle || "Monthly",
    package_breakdown: payload.packageBreakdown || null,
    initial_charges_breakdown: payload.initialChargesBreakdown || null,
    fees: payload.fees || null,
    initial_charges: payload.initialCharges ?? 0,
    initial_total_pay: payload.initialTotalPay ?? 0,
    apartment_number: payload.apartmentNumber || null,
  };

  const { data, error } = await supabase
    .from("units")
    .insert(insert)
    .select("*")
    .single();

  if (error) throw error;
  return mapUnit(data);
}

export async function getDbUnit(id: string) {
  const { data, error } = await supabase
    .from("units")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return mapUnit(data);
}

export async function updateDbUnit(id: string, payload: any) {
  const patch: Record<string, unknown> = {};

  if (payload.name !== undefined) patch.name = payload.name;
  if (payload.address !== undefined) patch.address = payload.address;
  if (payload.rent !== undefined) patch.rent = payload.rent;
  if (payload.deposit !== undefined) patch.deposit = payload.deposit;
  if (payload.bedrooms !== undefined) patch.bedrooms = payload.bedrooms;
  if (payload.bathrooms !== undefined) patch.bathrooms = payload.bathrooms;
  if (payload.sqft !== undefined) patch.sqft = payload.sqft;
  if (payload.status !== undefined) patch.status = toStatus(payload.status);
  if (payload.description !== undefined)
    patch.description = payload.description;
  if (payload.images !== undefined) patch.images = payload.images;
  if (payload.billingCycle !== undefined)
    patch.billing_cycle = payload.billingCycle;
  if (payload.packageBreakdown !== undefined) {
    patch.package_breakdown = payload.packageBreakdown;
  }
  if (payload.initialChargesBreakdown !== undefined) {
    patch.initial_charges_breakdown = payload.initialChargesBreakdown;
  }
  if (payload.fees !== undefined) patch.fees = payload.fees;
  if (payload.initialCharges !== undefined)
    patch.initial_charges = payload.initialCharges;
  if (payload.initialTotalPay !== undefined)
    patch.initial_total_pay = payload.initialTotalPay;
  if (payload.apartmentNumber !== undefined) {
    patch.apartment_number = payload.apartmentNumber;
  }

  const { data, error } = await supabase
    .from("units")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapUnit(data);
}

export async function deleteDbUnit(id: string) {
  const { error } = await supabase.from("units").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadDbUnitImage(unitId: string, file: File) {
  const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
  const path = `${unitId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(UNIT_IMAGES_BUCKET)
    .upload(path, file, { upsert: false });

  if (uploadError) {
    if (
      String(uploadError.message || "")
        .toLowerCase()
        .includes("bucket not found")
    ) {
      throw new Error(
        `Storage bucket '${UNIT_IMAGES_BUCKET}' does not exist. Create it in Supabase Storage or set VITE_SUPABASE_UNIT_IMAGES_BUCKET to an existing bucket.`,
      );
    }
    throw uploadError;
  }

  const { data: publicData } = supabase.storage
    .from(UNIT_IMAGES_BUCKET)
    .getPublicUrl(path);

  const unit = await getDbUnit(unitId);
  const nextImages = [...(unit.images || []), publicData.publicUrl];

  await updateDbUnit(unitId, {
    images: JSON.stringify(nextImages),
  });

  return {
    url: publicData.publicUrl,
    path,
  };
}

export async function getDbEstates(params?: {
  companyId?: string;
  companyName?: string;
  search?: string;
}) {
  const companyId = await getCurrentCompanyId(params?.companyId);

  let query = supabase
    .from("estates")
    .select("*")
    .order("created_at", { ascending: false });

  if (companyId) {
    query = query.eq("company_id", companyId);
  }
  if (params?.companyName) {
    query = query.eq("company_name", params.companyName);
  }
  if (params?.search) {
    query = query.ilike("name", `%${params.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(mapEstate);
}

export async function getDbEstate(id: string) {
  const { data, error } = await supabase
    .from("estates")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return mapEstate(data);
}

export async function createDbEstate(payload: {
  name: string;
  description?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  companyId: string;
  companyName?: string;
  contactEmail?: string;
  contactPhone?: string;
}) {
  const companyId = await getCurrentCompanyId(payload.companyId);
  if (!companyId) {
    throw new Error("No company selected for estate creation.");
  }

  const { data, error } = await supabase
    .from("estates")
    .insert({
      name: payload.name,
      description: payload.description || null,
      address: payload.address || null,
      city: payload.city || null,
      province: payload.province || null,
      postal_code: payload.postalCode || null,
      company_id: companyId,
      company_name: payload.companyName || null,
      contact_email: payload.contactEmail || null,
      contact_phone: payload.contactPhone || null,
      status: "active",
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapEstate(data);
}

export async function updateDbEstate(
  id: string,
  payload: {
    name?: string;
    description?: string;
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    contactEmail?: string;
    contactPhone?: string;
    status?: string;
  },
) {
  const patch: Record<string, unknown> = {};

  if (payload.name !== undefined) patch.name = payload.name;
  if (payload.description !== undefined)
    patch.description = payload.description;
  if (payload.address !== undefined) patch.address = payload.address;
  if (payload.city !== undefined) patch.city = payload.city;
  if (payload.province !== undefined) patch.province = payload.province;
  if (payload.postalCode !== undefined) patch.postal_code = payload.postalCode;
  if (payload.contactEmail !== undefined)
    patch.contact_email = payload.contactEmail;
  if (payload.contactPhone !== undefined)
    patch.contact_phone = payload.contactPhone;
  if (payload.status !== undefined) patch.status = payload.status;

  const { data, error } = await supabase
    .from("estates")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapEstate(data);
}

export async function deleteDbEstate(id: string) {
  const { error } = await supabase.from("estates").delete().eq("id", id);
  if (error) throw error;
}

export async function checkDbCompanyHasEstates(params: {
  companyId?: string;
  companyName?: string;
}) {
  const items = await getDbEstates({
    companyId: params.companyId,
    companyName: params.companyName,
  });

  return {
    hasEstates: items.length > 0,
    count: items.length,
  };
}

export async function uploadDbEstateLogo(estateId: string, file: File) {
  const path = `${estateId}/logo-${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

  const { error: uploadError } = await supabase.storage
    .from("estate-logos")
    .upload(path, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage
    .from("estate-logos")
    .getPublicUrl(path);

  await updateDbEstate(estateId, {});
  const { error: dbError } = await supabase
    .from("estates")
    .update({ logo_blob_name: path, logo_url: publicData.publicUrl })
    .eq("id", estateId);

  if (dbError) throw dbError;

  return {
    message: "Logo uploaded",
    logoUrl: publicData.publicUrl,
    blobName: path,
  };
}

export async function deleteDbEstateLogo(estateId: string) {
  const estate = await getDbEstate(estateId);
  if (estate.logoBlobName) {
    const { error: storageError } = await supabase.storage
      .from("estate-logos")
      .remove([estate.logoBlobName]);

    if (storageError) throw storageError;
  }

  const { error } = await supabase
    .from("estates")
    .update({ logo_blob_name: null, logo_url: null })
    .eq("id", estateId);

  if (error) throw error;
  return { message: "Logo deleted" };
}

export function getDbEstateLogoUrl(estateId: string): string {
  const { data } = supabase.storage
    .from("estate-logos")
    .getPublicUrl(`${estateId}/logo`);
  return data.publicUrl;
}

export async function createDbApplicationLink(payload: {
  fullName: string;
  cellNumber: string;
  idNumber?: string;
  unitId?: string;
  requiresCreditCheck?: boolean;
  agentId?: string;
  leaseStartDate?: string;
  leaseDurationMonths?: number;
}) {
  const companyId = await getCurrentCompanyId();

  const { data, error } = await supabase
    .from("application_links")
    .insert({
      full_name: payload.fullName,
      cell_number: payload.cellNumber,
      id_number: payload.idNumber || null,
      unit_id: payload.unitId || null,
      requires_credit_check: payload.requiresCreditCheck ?? true,
      agent_id: payload.agentId || null,
      lease_start_date: payload.leaseStartDate || null,
      lease_duration_months: payload.leaseDurationMonths || 12,
      company_id: companyId,
      status: "link_created",
    })
    .select("*")
    .single();

  if (error) throw error;

  return {
    id: data.id,
    linkUrl: `${window.location.origin}/apply?register=${data.id}`,
    status: data.status,
  };
}

export async function getDbApplicationLink(id: string) {
  const { data, error } = await supabase
    .from("application_links")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    fullName: data.full_name,
    cellNumber: data.cell_number,
    idNumber: data.id_number || undefined,
    unitId: data.unit_id || undefined,
    requiresCreditCheck: Boolean(data.requires_credit_check),
    agentId: data.agent_id || undefined,
    leaseStartDate: data.lease_start_date || undefined,
    leaseDurationMonths: Number(data.lease_duration_months || 12),
    status: data.status,
    companyId: data.company_id || undefined,
  };
}

export async function createDbApplicationFromLink(data: any) {
  const link = await getDbApplicationLink(data.id);

  const { data: existing, error: existingError } = await supabase
    .from("applications")
    .select("*")
    .eq("id", data.id)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return mapApplication(existing);

  const { data: created, error } = await supabase
    .from("applications")
    .insert({
      id: data.id,
      application_link_id: data.id,
      full_name: data.fullName || link.fullName,
      cell_number: data.cellNumber || link.cellNumber,
      id_number: data.idNumber || link.idNumber || null,
      unit_id: data.unitId || link.unitId,
      company_id: data.companyId || link.companyId || null,
      agent_id: data.agentId || link.agentId || null,
      status: data.status || link.status || "link_created",
      requires_credit_check:
        data.requiresCreditCheck ?? link.requiresCreditCheck ?? true,
      lease_start_date: data.leaseStartDate || link.leaseStartDate || null,
      lease_duration_months:
        data.leaseDurationMonths || link.leaseDurationMonths || 12,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapApplication(created);
}

export async function getDbApplication(id: string) {
  const { data, error } = await supabase
    .from("applications")
    .select("*, application_documents(*)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return mapApplication(data);
}

/** Look up the most recent application for a given tenant auth user ID. */
export async function getDbApplicationByTenantUserId(tenantUserId: string) {
  const { data, error } = await supabase
    .from("applications")
    .select("*, application_documents(*)")
    .eq("tenant_user_id", tenantUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapApplication(data);
}

export async function getDbLeases(status?: string) {
  let query = supabase
    .from("applications")
    .select("id, full_name, status, created_at, units(name)")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    tenant: row.full_name,
    unit: row.units?.name || "",
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function submitDbApplicationForm(id: string, payload: any) {
  const patch: Record<string, unknown> = {};

  if (payload.email !== undefined) patch.email = payload.email;
  if (payload.salary !== undefined) patch.salary = payload.salary;
  if (payload.idNumber !== undefined) patch.id_number = payload.idNumber;
  if (payload.employer !== undefined) patch.employer = payload.employer;
  if (payload.employmentStatus !== undefined) {
    patch.employment_status = payload.employmentStatus;
  }
  if (payload.employmentDuration !== undefined) {
    patch.employment_duration = payload.employmentDuration;
  }
  if (payload.country !== undefined) patch.country = payload.country;
  if (payload.status !== undefined) patch.status = payload.status;
  if (payload.initialPaymentPaid !== undefined) {
    patch.initial_payment_paid = payload.initialPaymentPaid;
  }

  if (!payload.status && patch.email) {
    patch.status = "form_submitted";
  }

  const { data, error } = await supabase
    .from("applications")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return mapApplication(data);
}

export async function acceptDbLease(
  applicationId: string,
  payload: { email?: string; password?: string },
) {
  let tenantUserId: string | undefined;

  // If credentials are provided, create a Supabase auth account for the tenant
  if (payload.email && payload.password) {
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          role: "tenant",
          status: "active",
        },
      },
    });

    if (signUpError) {
      // Treat "User already registered" as a soft error; still link the application
      if (!signUpError.message?.toLowerCase().includes("already registered")) {
        throw signUpError;
      }
    }

    if (authData?.user?.id) {
      tenantUserId = authData.user.id;
    }
  }

  const patch: Record<string, unknown> = {
    has_account: true,
    status: "payment_pending",
  };

  if (payload.email) patch.email = payload.email;
  if (tenantUserId) patch.tenant_user_id = tenantUserId;

  const { data, error } = await supabase
    .from("applications")
    .update(patch)
    .eq("id", applicationId)
    .select("*")
    .single();

  if (error) throw error;
  return mapApplication(data);
}

export async function uploadDbDocument(
  applicationId: string,
  file: File,
  documentType: string,
) {
  const filePath = `${applicationId}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(filePath, file, { upsert: false });

  if (uploadError) {
    if (
      String(uploadError.message || "")
        .toLowerCase()
        .includes("bucket not found")
    ) {
      throw new Error(
        `Storage bucket '${DOCUMENTS_BUCKET}' does not exist. Create it in Supabase Storage or set VITE_SUPABASE_DOCUMENTS_BUCKET to an existing bucket.`,
      );
    }
    throw uploadError;
  }

  const { data: inserted, error: dbError } = await supabase
    .from("application_documents")
    .insert({
      application_id: applicationId,
      document_type: documentType,
      file_path: filePath,
      file_name: file.name,
      file_size: file.size,
    })
    .select("*")
    .single();

  if (dbError) throw dbError;

  return {
    id: inserted.id,
    applicationId: inserted.application_id,
    documentType: inserted.document_type,
    filePath: inserted.file_path,
    fileName: inserted.file_name,
    fileSize: inserted.file_size,
    createdAt: inserted.created_at,
  };
}

export async function getDbDocumentDownload(id: string) {
  const { data, error } = await supabase
    .from("application_documents")
    .select("file_path")
    .eq("id", id)
    .single();

  if (error) throw error;

  const { data: signed, error: signError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(data.file_path, 60);

  if (signError) throw signError;
  return signed.signedUrl;
}

export async function uploadDbSignedLease(applicationId: string, file: File) {
  const filePath = `${applicationId}/signed-${Date.now()}-${file.name.replace(/\s+/g, "-")}`;

  const { error: uploadError } = await supabase.storage
    .from("lease-pdfs")
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { error } = await supabase
    .from("applications")
    .update({ signed_lease_path: filePath })
    .eq("id", applicationId);

  if (error) throw error;

  return {
    filePath,
  };
}

export async function submitDbSignedLease(applicationId: string) {
  const { data, error } = await supabase
    .from("applications")
    .update({ status: "lease_pending_review" })
    .eq("id", applicationId)
    .select("*")
    .single();

  if (error) throw error;
  return mapApplication(data);
}

export async function approveDbSignedLease(applicationId: string) {
  const { data, error } = await supabase
    .from("applications")
    .update({ status: "lease_signed" })
    .eq("id", applicationId)
    .select("*")
    .single();

  if (error) throw error;
  return mapApplication(data);
}
