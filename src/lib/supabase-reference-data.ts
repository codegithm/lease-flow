import { supabase } from "@/lib/supabase";

type EmploymentStatusRow = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

type DocumentTypeRow = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  allowed_extensions: string | null;
  max_file_size_bytes: number | null;
  is_required: boolean;
  is_system_type: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function mapEmploymentStatus(row: EmploymentStatusRow) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || "",
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function mapDocumentType(row: DocumentTypeRow) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description || undefined,
    category: row.category || undefined,
    allowedExtensions: row.allowed_extensions || undefined,
    maxFileSizeBytes:
      row.max_file_size_bytes == null ? undefined : row.max_file_size_bytes,
    isRequired: Boolean(row.is_required),
    isSystemType: Boolean(row.is_system_type),
    displayOrder: row.display_order,
  };
}

export async function getDbEmploymentStatuses() {
  const { data, error } = await supabase
    .from("employment_statuses")
    .select("id, code, name, description, is_active, created_at")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []).map((row) =>
    mapEmploymentStatus(row as EmploymentStatusRow),
  );
}

export async function getDbEmploymentStatusByName(name: string) {
  const { data, error } = await supabase
    .from("employment_statuses")
    .select("id, code, name, description, is_active, created_at")
    .eq("name", name)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error(`Employment status not found: ${name}`);
  }

  return mapEmploymentStatus(data as EmploymentStatusRow);
}

export async function getDbDocumentTypes() {
  const { data, error } = await supabase
    .from("document_types")
    .select(
      "id, code, name, description, category, allowed_extensions, max_file_size_bytes, is_required, is_system_type, display_order, is_active, created_at, updated_at",
    )
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []).map((row) => mapDocumentType(row as DocumentTypeRow));
}

export async function getDbDocumentTypesByCategory(category: string) {
  const { data, error } = await supabase
    .from("document_types")
    .select(
      "id, code, name, description, category, allowed_extensions, max_file_size_bytes, is_required, is_system_type, display_order, is_active, created_at, updated_at",
    )
    .eq("category", category)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []).map((row) => mapDocumentType(row as DocumentTypeRow));
}

export async function getDbRequiredDocumentTypes() {
  const { data, error } = await supabase
    .from("document_types")
    .select(
      "id, code, name, description, category, allowed_extensions, max_file_size_bytes, is_required, is_system_type, display_order, is_active, created_at, updated_at",
    )
    .eq("is_required", true)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;
  return (data || []).map((row) => mapDocumentType(row as DocumentTypeRow));
}

export async function getDbDocumentTypeByCode(code: string) {
  const { data, error } = await supabase
    .from("document_types")
    .select(
      "id, code, name, description, category, allowed_extensions, max_file_size_bytes, is_required, is_system_type, display_order, is_active, created_at, updated_at",
    )
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error(`Document type not found: ${code}`);
  }

  return mapDocumentType(data as DocumentTypeRow);
}

export async function createDbDocumentType(data: {
  code: string;
  name: string;
  description?: string;
  category?: string;
  allowedExtensions?: string;
  maxFileSizeBytes?: number;
  isRequired: boolean;
  displayOrder: number;
}) {
  const { data: inserted, error } = await supabase
    .from("document_types")
    .insert({
      code: data.code,
      name: data.name,
      description: data.description || null,
      category: data.category || null,
      allowed_extensions: data.allowedExtensions || null,
      max_file_size_bytes: data.maxFileSizeBytes || null,
      is_required: data.isRequired,
      is_system_type: false,
      display_order: data.displayOrder,
      is_active: true,
    })
    .select(
      "id, code, name, description, category, allowed_extensions, max_file_size_bytes, is_required, is_system_type, display_order, is_active, created_at, updated_at",
    )
    .single();

  if (error) throw error;
  return mapDocumentType(inserted as DocumentTypeRow);
}

export async function updateDbDocumentType(
  id: number,
  data: {
    code: string;
    name: string;
    description?: string;
    category?: string;
    allowedExtensions?: string;
    maxFileSizeBytes?: number;
    isRequired: boolean;
    displayOrder: number;
  },
) {
  const { data: updated, error } = await supabase
    .from("document_types")
    .update({
      code: data.code,
      name: data.name,
      description: data.description || null,
      category: data.category || null,
      allowed_extensions: data.allowedExtensions || null,
      max_file_size_bytes: data.maxFileSizeBytes || null,
      is_required: data.isRequired,
      display_order: data.displayOrder,
    })
    .eq("id", id)
    .select(
      "id, code, name, description, category, allowed_extensions, max_file_size_bytes, is_required, is_system_type, display_order, is_active, created_at, updated_at",
    )
    .single();

  if (error) throw error;
  return mapDocumentType(updated as DocumentTypeRow);
}

export async function deleteDbDocumentType(id: number) {
  const { error } = await supabase
    .from("document_types")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw error;
}
