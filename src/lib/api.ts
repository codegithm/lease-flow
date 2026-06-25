type CreateLinkRequest = {
  fullName: string;
  cellNumber: string;
  idNumber?: string;
  unitId?: string;
  requiresCreditCheck?: boolean;
  agentId?: string;
  leaseStartDate?: string;
  leaseDurationMonths?: number;
};

import {
  bulkUpdateDbUserPermissions,
  cancelDbUserInvitation,
  createDbUserInvitation,
  deleteDbCompanyChargeConfig,
  getDbCompanyBankingDetails,
  getDbCompanyCurrency,
  getDbCompanyChargeConfigs,
  getDbCompanyUsers,
  getDbCountry,
  getDbCurrentUser,
  getDbEffectivePermissions,
  getDbPermissions,
  getDbRoles,
  getDbSupportedCountries,
  getDbUserInvitations,
  getDbUserPermissionOverrides,
  removeDbUserPermission,
  saveDbCompanyBankingDetails,
  saveDbCompanyChargeConfig,
  setDbUserPermission,
  updateDbCompany,
  updateDbCurrentUser,
  updateDbUserRole,
  updateDbUserStatus,
  type BankingDetailsRecord,
  type ChargeConfigRecord,
} from "@/lib/supabase-config";

import {
  acceptDbLease,
  approveDbSignedLease,
  checkDbCompanyHasEstates,
  createDbApplicationFromLink,
  createDbApplicationLink,
  createDbEstate,
  createDbUnit,
  deleteDbEstate,
  deleteDbEstateLogo,
  deleteDbUnit,
  getDbApplication,
  getDbApplicationByTenantUserId,
  getDbApplicationLink,
  getDbDocumentDownload,
  getDbEstate,
  getDbEstateLogoUrl,
  getDbEstates,
  getDbLeases,
  getDbUnit,
  getDbUnits,
  submitDbApplicationForm,
  submitDbSignedLease,
  updateDbEstate,
  updateDbUnit,
  uploadDbDocument,
  uploadDbEstateLogo,
  uploadDbSignedLease,
  uploadDbUnitImage,
} from "@/lib/supabase-property";

import {
  addDbMaintenanceComment,
  createDbConversation,
  createDbMaintenanceRequest,
  deleteDbNotification,
  getDbConversation,
  getDbConversations,
  getDbMaintenanceRequest,
  getDbMaintenanceRequests,
  getDbMessageTypes,
  getDbMessages,
  getDbNotifications,
  getDbUnreadNotificationCount,
  markAllDbNotificationsRead,
  markDbConversationRead,
  markDbNotificationRead,
  sendDbMessage,
  submitDbMaintenanceFeedback,
  updateDbMaintenanceStatus,
} from "@/lib/supabase-communications";

import {
  appealDbCharge,
  approveDbAdditionalCharge,
  createDbAdditionalCharge,
  createDbLeaseTemplate,
  deleteDbAdditionalCharge,
  generateDbLease,
  getDbAdditionalCharge,
  getDbAdditionalCharges,
  getDbChargeAppeals,
  getDbCompanyPayments,
  getDbLeaseTemplates,
  getDbTenantCharges,
  getDbTenantPaymentCharges,
  initializeDbTenantPayment,
  requestDbCreditCheck,
  reviewDbChargeAppeal,
  sendDbLease,
  updateDbAdditionalCharge,
} from "@/lib/supabase-billing-lease";

import {
  createDbDocumentType,
  deleteDbDocumentType,
  getDbDocumentTypeByCode,
  getDbDocumentTypes,
  getDbDocumentTypesByCategory,
  getDbEmploymentStatusByName,
  getDbEmploymentStatuses,
  getDbRequiredDocumentTypes,
  updateDbDocumentType,
} from "@/lib/supabase-reference-data";

import {
  registerWithSupabase,
  searchDbCompanies,
  searchDbUsers,
  signInWithSupabase,
} from "@/lib/supabase-directory-auth";

export async function createApplicationLink(payload: CreateLinkRequest) {
  return createDbApplicationLink(payload);
}

export async function registerUser(payload: any) {
  return registerWithSupabase(payload || {});
}

export async function searchCompanies(query?: string, limit = 10) {
  return searchDbCompanies(query, limit);
}

export async function signIn(payload: any) {
  return signInWithSupabase(payload || {});
}

export async function getApplicationLink(id: string) {
  return getDbApplicationLink(id);
}

export async function uploadDocument(
  applicationId: string,
  file: File,
  documentType: string,
) {
  return uploadDbDocument(applicationId, file, documentType);
}

export async function createApplicationFromLink(data: any) {
  return createDbApplicationFromLink(data);
}

export async function getApplication(id: string) {
  return getDbApplication(id);
}

export async function getApplicationByTenantUserId(tenantUserId: string) {
  return getDbApplicationByTenantUserId(tenantUserId);
}

export async function getDocumentDownload(id: string) {
  return getDbDocumentDownload(id);
}

export async function requestCreditCheck(applicationId: string) {
  return requestDbCreditCheck(applicationId);
}

export async function getUnits() {
  return getDbUnits();
}

export async function createUnit(payload: any) {
  return createDbUnit(payload);
}

export async function submitApplicationForm(id: string, payload: any) {
  return submitDbApplicationForm(id, payload);
}

export async function getUnit(id: string) {
  return getDbUnit(id);
}

export async function getLeases(status?: string) {
  return getDbLeases(status);
}

export async function sendLease(applicationId: string, body?: any) {
  return sendDbLease(applicationId, body);
}

export async function generateLease(applicationId: string, body: any) {
  return generateDbLease(applicationId, body);
}

export async function getLeaseTemplates(companyName?: string) {
  return getDbLeaseTemplates(companyName);
}

export async function createLeaseTemplate(payload: any) {
  return createDbLeaseTemplate(payload);
}

export async function acceptLease(applicationId: string, payload: any) {
  return acceptDbLease(applicationId, payload || {});
}

// Download unsigned lease PDF for tenant to sign
export async function downloadLeasePdf(applicationId: string) {
  const app = await getDbApplication(applicationId);
  const leaseText = [
    "LEASE AGREEMENT",
    `Application: ${app.id}`,
    `Tenant: ${app.fullName || "-"}`,
    `Unit: ${app.unitId || "-"}`,
    `Status: ${app.status || "-"}`,
    `Start Date: ${app.leaseStartDate || "-"}`,
    `Duration (months): ${app.leaseDurationMonths || 12}`,
    "",
    "This document is generated in the client migration path.",
  ].join("\n");

  return new Blob([leaseText], { type: "application/pdf" });
}

// Upload signed lease document
export async function uploadSignedLease(applicationId: string, file: File) {
  return uploadDbSignedLease(applicationId, file);
}

// Submit signed lease for review (tenant confirms upload)
export async function submitSignedLease(applicationId: string) {
  return submitDbSignedLease(applicationId);
}

// Agent approves the signed lease
export async function approveSignedLease(applicationId: string) {
  return approveDbSignedLease(applicationId);
}

// ============ User Management APIs ============

export async function getRoles() {
  return getDbRoles();
}

export async function getCompanyUsers(companyId: string) {
  return getDbCompanyUsers(companyId);
}

export async function approveUser(companyId: string, userId: string) {
  void companyId;
  return updateDbUserStatus(userId, "active");
}

export async function blockUser(companyId: string, userId: string) {
  void companyId;
  return updateDbUserStatus(userId, "blocked");
}

export async function unblockUser(companyId: string, userId: string) {
  void companyId;
  return updateDbUserStatus(userId, "active");
}

// ============ Notifications API ============

export async function getNotifications(
  options: {
    unreadOnly?: boolean;
    type?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  return getDbNotifications(options);
}

export async function getUnreadNotificationCount() {
  return getDbUnreadNotificationCount();
}

export async function markNotificationRead(notificationId: string) {
  return markDbNotificationRead(notificationId);
}

export async function markAllNotificationsRead() {
  return markAllDbNotificationsRead();
}

export async function deleteNotification(notificationId: string) {
  return deleteDbNotification(notificationId);
}

// Employment Statuses
export async function getEmploymentStatuses() {
  return getDbEmploymentStatuses();
}

export async function getEmploymentStatusByName(name: string) {
  return getDbEmploymentStatusByName(name);
}

// Unit Image Upload
export async function uploadUnitImage(unitId: string, file: File) {
  return uploadDbUnitImage(unitId, file);
}

// Update Unit
export async function updateUnit(id: string, payload: any) {
  return updateDbUnit(id, payload);
}

// Delete Unit
export async function deleteUnit(id: string) {
  return deleteDbUnit(id);
}

// Search Users (for lease generation)
export async function searchUsers(query?: string, companyId?: string) {
  return searchDbUsers(query, companyId);
}

// Get current user profile
export async function getCurrentUser() {
  return getDbCurrentUser();
}

// Update current user profile
export async function updateCurrentUser(payload: {
  fullName?: string;
  cellNumber?: string;
}) {
  return updateDbCurrentUser(payload);
}

// Update company settings
export async function updateCompany(
  companyId: string,
  payload: { name?: string; address?: string },
) {
  return updateDbCompany(companyId, payload);
}

// Change user role
export async function changeUserRole(
  companyId: string,
  userId: string,
  newRole: string,
) {
  void companyId;
  return updateDbUserRole(userId, newRole);
}

// Get all permissions
export async function getAllPermissions() {
  return getDbPermissions();
}

// Get user permissions
export async function getUserPermissions(userId: string) {
  return getDbEffectivePermissions(userId);
}

// Get user permission overrides
export async function getUserPermissionOverrides(userId: string) {
  return getDbUserPermissionOverrides(userId);
}

// Set user permission
export async function setUserPermission(
  userId: string,
  permissionId: number,
  isGranted: boolean,
) {
  return setDbUserPermission(userId, permissionId, isGranted);
}

// Remove user permission override
export async function removeUserPermission(
  userId: string,
  permissionId: number,
) {
  return removeDbUserPermission(userId, permissionId);
}

// Bulk update user permissions
export async function bulkUpdateUserPermissions(
  userId: string,
  permissions: Array<{
    permissionId: number;
    isGranted: boolean;
    remove?: boolean;
  }>,
) {
  return bulkUpdateDbUserPermissions(userId, permissions);
}

// ============================================
// Additional Charges API
// ============================================

export interface AdditionalCharge {
  id: string;
  applicationId: string;
  unitId?: string;
  tenantUserId?: string;
  companyId?: string;
  chargeType: string;
  description: string;
  amount: number;
  billingMonth: string;
  status: string;
  createdByUserId: string;
  createdByRole: string;
  supportingDocumentIds?: string;
  dueDate?: string;
  paidAt?: string;
  paymentTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChargeAppeal {
  id: string;
  additionalChargeId: string;
  tenantUserId: string;
  reason: string;
  supportingDocumentIds?: string;
  status: string;
  reviewerResponse?: string;
  reviewedByUserId?: string;
  reviewedByRole?: string;
  reviewedAt?: string;
  adjustedAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export async function getTenantPaymentCharges(_tenantUserId: string) {
  return getDbTenantPaymentCharges(_tenantUserId);
}

export async function initializeTenantPayment(_payload: {
  chargeId?: string | null;
  additionalChargeIds: string[];
  paymentType?: "rent" | "additional_charges" | "mixed";
  billingMonths?: string[];
  amountInCents: number;
  paymentMethod: string;
  callbackUrl: string;
}) {
  return initializeDbTenantPayment(_payload);
}

// Get additional charges
export async function getAdditionalCharges(filters?: {
  applicationId?: string;
  billingMonth?: string;
  status?: string;
}): Promise<AdditionalCharge[]> {
  return getDbAdditionalCharges(filters);
}

// Get charges for a tenant
export async function getTenantCharges(
  tenantUserId: string,
  billingMonth?: string,
): Promise<AdditionalCharge[]> {
  return getDbTenantCharges(tenantUserId, billingMonth);
}

// Get a specific charge
export async function getAdditionalCharge(
  id: string,
): Promise<AdditionalCharge> {
  return getDbAdditionalCharge(id);
}

// Create a new charge
export async function createAdditionalCharge(charge: {
  applicationId: string;
  unitId?: string;
  tenantUserId?: string;
  chargeType?: string;
  description: string;
  amount: number;
  billingMonth: string;
  supportingDocumentIds?: string[];
  dueDate?: string;
}): Promise<AdditionalCharge> {
  return createDbAdditionalCharge(charge);
}

// Update a charge
export async function updateAdditionalCharge(
  id: string,
  updates: {
    description?: string;
    amount?: number;
    chargeType?: string;
    dueDate?: string;
    supportingDocumentIds?: string[];
  },
): Promise<AdditionalCharge> {
  return updateDbAdditionalCharge(id, updates);
}

// Delete/cancel a charge
export async function deleteAdditionalCharge(id: string): Promise<void> {
  return deleteDbAdditionalCharge(id);
}

// Approve a charge
export async function approveAdditionalCharge(
  id: string,
): Promise<AdditionalCharge> {
  return approveDbAdditionalCharge(id);
}

// Appeal a charge (tenant)
export async function appealCharge(
  chargeId: string,
  appeal: {
    reason: string;
    supportingDocumentIds?: string[];
  },
): Promise<ChargeAppeal> {
  return appealDbCharge(chargeId, appeal);
}

// Get appeals for a charge
export async function getChargeAppeals(
  chargeId: string,
): Promise<ChargeAppeal[]> {
  return getDbChargeAppeals(chargeId);
}

// Review an appeal (agent/landlord)
export async function reviewChargeAppeal(
  appealId: string,
  review: {
    approved: boolean;
    response?: string;
    adjustedAmount?: number;
  },
): Promise<{ appeal: ChargeAppeal; charge: AdditionalCharge }> {
  return reviewDbChargeAppeal(appealId, review);
}

// ============================================
// Countries API
// ============================================

export interface Country {
  code: string;
  name: string;
  currencyCode: string;
  currencySymbol: string;
  currencyName: string;
  isSupported?: boolean;
}

export async function getSupportedCountries(): Promise<Country[]> {
  return getDbSupportedCountries();
}

export async function getCountry(code: string): Promise<Country> {
  return getDbCountry(code);
}

export async function getCompanyCurrency(companyId: string): Promise<{
  countryCode: string;
  currencyCode: string;
  currencySymbol: string;
  currencyName: string;
}> {
  return getDbCompanyCurrency(companyId);
}

// ============================================
// Estates API
// ============================================

export interface Estate {
  id: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  companyId: string;
  companyName?: string;
  totalUnits?: number;
  contactEmail?: string;
  contactPhone?: string;
  images?: string;
  amenities?: string;
  logoBlobName?: string;
  logoUrl?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export async function getEstates(params?: {
  companyId?: string;
  companyName?: string;
  search?: string;
}): Promise<Estate[]> {
  return getDbEstates(params);
}

export async function getEstate(id: string): Promise<Estate> {
  return getDbEstate(id);
}

export async function createEstate(payload: {
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
}): Promise<Estate> {
  return createDbEstate(payload);
}

export async function updateEstate(
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
): Promise<Estate> {
  return updateDbEstate(id, payload);
}

export async function deleteEstate(id: string): Promise<void> {
  await deleteDbEstate(id);
}

export async function checkCompanyHasEstates(params: {
  companyId?: string;
  companyName?: string;
}): Promise<{ hasEstates: boolean; count: number }> {
  return checkDbCompanyHasEstates(params);
}

// Estate Logo Management
export async function uploadEstateLogo(
  estateId: string,
  file: File,
): Promise<{ message: string; logoUrl: string; blobName: string }> {
  return uploadDbEstateLogo(estateId, file);
}

export async function deleteEstateLogo(
  estateId: string,
): Promise<{ message: string }> {
  return deleteDbEstateLogo(estateId);
}

export function getEstateLogoUrl(estateId: string): string {
  return getDbEstateLogoUrl(estateId);
}

// ============================================
// Platform Fee Calculator (client-side utility)
// ============================================

export const PLATFORM_FEE_RATE = 0.00005; // 0.005%

export function calculatePlatformFee(
  amount: number,
  isInitialPayment: boolean,
  rentAmount?: number,
): number {
  if (isInitialPayment && rentAmount !== undefined) {
    // For initial payments, fee is only on rent portion
    return Math.round(rentAmount * PLATFORM_FEE_RATE * 10000) / 10000;
  }
  // For all other payments, fee is on full amount
  return Math.round(amount * PLATFORM_FEE_RATE * 10000) / 10000;
}

export function getFeeBreakdown(
  totalAmount: number,
  rentAmount: number,
  isInitialPayment: boolean,
  processorFeeRate = 0,
) {
  const platformFee = calculatePlatformFee(
    totalAmount,
    isInitialPayment,
    rentAmount,
  );
  const processorFee =
    Math.round(totalAmount * processorFeeRate * 10000) / 10000;
  const netAmount = totalAmount - platformFee - processorFee;

  return {
    totalAmount,
    rentAmount,
    platformFee,
    platformFeeRate: PLATFORM_FEE_RATE,
    processorFee,
    processorFeeRate,
    netAmount,
    isInitialPayment,
  };
}

// ============================================
// Messaging API
// ============================================

export interface Conversation {
  id: string;
  companyId: string;
  unitId?: string;
  maintenanceRequestId?: string;
  type:
    | "Direct"
    | "Maintenance"
    | "Announcement"
    | "System"
    | "Issue"
    | "PaymentReminder";
  subject: string;
  status: "Active" | "Archived" | "Closed";
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  participants?: ConversationParticipant[];
  lastMessage?: MessageItem;
  unreadCount?: number;
  // Extended display fields
  unitName?: string;
  estateName?: string;
  participantName?: string;
  participantRole?: string;
  isBroadcast?: boolean;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  role: "Owner" | "Participant" | "Observer";
  joinedAt: string;
  leftAt?: string;
  lastReadAt?: string;
  unreadCount: number;
  isMuted: boolean;
  userName?: string;
  userRole?: string;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  senderRole?: string;
  content: string;
  type: "Text" | "Image" | "File" | "System";
  status: "Sent" | "Delivered" | "Read";
  replyToMessageId?: string;
  metadata?: string;
  editedAt?: string;
  deletedAt?: string;
  isDeleted: boolean;
  createdAt: string;
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  id: string;
  messageId: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  blobUri: string;
  blobName: string;
  createdAt: string;
}

export interface MessageType {
  id: string;
  name: string;
  code: string;
  description?: string;
  icon?: string;
  color?: string;
  isSystemType: boolean;
}

export async function getMessageTypes(role?: string): Promise<MessageType[]> {
  return getDbMessageTypes(role);
}

export async function getConversations(
  options: {
    type?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<{ data: Conversation[]; total: number }> {
  return getDbConversations(options);
}

export async function getConversation(id: string): Promise<Conversation> {
  return getDbConversation(id);
}

export async function createConversation(data: {
  type: string;
  subject: string;
  participantUserIds: string[];
  unitId?: string;
  estateId?: string;
  maintenanceRequestId?: string;
  initialMessage?: string;
}): Promise<Conversation> {
  return createDbConversation(data);
}

export async function getMessages(
  conversationId: string,
  options: {
    page?: number;
    pageSize?: number;
  } = {},
): Promise<{ data: MessageItem[]; total: number }> {
  return getDbMessages(conversationId, options);
}

export async function sendMessage(
  conversationId: string,
  content: string,
  options: {
    type?: string;
    replyToMessageId?: string;
  } = {},
): Promise<MessageItem> {
  return sendDbMessage(conversationId, content, options);
}

export async function markConversationRead(
  conversationId: string,
): Promise<void> {
  return markDbConversationRead(conversationId);
}

// ============================================
// Maintenance Requests API
// ============================================

export interface MaintenanceRequest {
  id: string;
  companyId: string;
  unitId: string;
  tenantUserId: string;
  leaseId?: string;
  title: string;
  description: string;
  category: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status:
    | "Open"
    | "InProgress"
    | "OnHold"
    | "Resolved"
    | "Closed"
    | "Cancelled";
  assignedTo?: string;
  assignedToUserId?: string;
  preferredContactMethod?: string;
  availability?: string;
  permissionToEnter: boolean;
  estimatedCost?: number;
  actualCost?: number;
  internalNotes?: string;
  resolutionNotes?: string;
  satisfactionRating?: number;
  tenantFeedback?: string;
  dueDate?: string;
  startedAt?: string;
  completedAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Extended fields for display
  tenantName?: string;
  unitName?: string;
  attachments?: MaintenanceAttachmentItem[];
  activities?: MaintenanceActivityItem[];
}

export interface MaintenanceAttachmentItem {
  id: string;
  maintenanceRequestId: string;
  uploadedByUserId: string;
  type: "Photo" | "Document" | "Video";
  category: "Initial" | "Progress" | "Completion";
  fileName: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  blobUri: string;
  blobName: string;
  description?: string;
  createdAt: string;
}

export interface MaintenanceActivityItem {
  id: string;
  maintenanceRequestId: string;
  performedByUserId: string;
  performedByName: string;
  activityType: string;
  description: string;
  oldValue?: string;
  newValue?: string;
  isVisibleToTenant: boolean;
  createdAt: string;
}

export async function getMaintenanceRequests(
  options: {
    status?: string;
    priority?: string;
    category?: string;
    unitId?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<{ data: MaintenanceRequest[]; total: number }> {
  return getDbMaintenanceRequests(options);
}

export async function getMaintenanceRequest(
  id: string,
): Promise<MaintenanceRequest> {
  return getDbMaintenanceRequest(id);
}

export async function createMaintenanceRequest(data: {
  unitId: string;
  leaseId?: string;
  title: string;
  description: string;
  category: string;
  priority?: string;
  preferredContactMethod?: string;
  availability?: string;
  permissionToEnter?: boolean;
}): Promise<MaintenanceRequest> {
  return createDbMaintenanceRequest(data);
}

export async function updateMaintenanceStatus(
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
): Promise<MaintenanceRequest> {
  return updateDbMaintenanceStatus(id, data);
}

export async function addMaintenanceComment(
  id: string,
  comment: string,
  isVisibleToTenant = true,
): Promise<MaintenanceActivityItem> {
  return addDbMaintenanceComment(id, comment, isVisibleToTenant);
}

// ============================================
// Payments API (admin / company view)
// ============================================

export interface CompanyPayment {
  id: string;
  companyId: string;
  tenantUserId: string;
  tenantName: string;
  tenantEmail?: string;
  reference: string;
  amount: number;
  paymentMethod?: string;
  status: "initialized" | "pending" | "paid" | "failed" | "refunded";
  additionalChargeIds: string[];
  createdAt: string;
  updatedAt: string;
}

export async function getCompanyPayments(filters?: {
  status?: string;
  tenantUserId?: string;
}): Promise<CompanyPayment[]> {
  return getDbCompanyPayments(filters);
}

export async function submitMaintenanceFeedback(
  id: string,
  rating: number,
  feedback?: string,
): Promise<void> {
  return submitDbMaintenanceFeedback(id, rating, feedback);
}

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

export interface DocumentType {
  id: number;
  code: string;
  name: string;
  description?: string;
  category?: string;
  allowedExtensions?: string;
  maxFileSizeBytes?: number;
  isRequired: boolean;
  isSystemType: boolean;
  displayOrder: number;
}

export async function getDocumentTypes(): Promise<DocumentType[]> {
  return getDbDocumentTypes();
}

export async function getDocumentTypesByCategory(
  category: string,
): Promise<DocumentType[]> {
  return getDbDocumentTypesByCategory(category);
}

export async function getRequiredDocumentTypes(): Promise<DocumentType[]> {
  return getDbRequiredDocumentTypes();
}

export async function getDocumentTypeByCode(
  code: string,
): Promise<DocumentType> {
  return getDbDocumentTypeByCode(code);
}

export async function createDocumentType(
  data: Omit<DocumentType, "id" | "isSystemType">,
): Promise<DocumentType> {
  return createDbDocumentType(data);
}

export async function updateDocumentType(
  id: number,
  data: Omit<DocumentType, "id" | "isSystemType">,
): Promise<DocumentType> {
  return updateDbDocumentType(id, data);
}

export async function deleteDocumentType(id: number): Promise<void> {
  return deleteDbDocumentType(id);
}

// ============================================================================
// BANKING DETAILS
// ============================================================================

export type { BankingDetailsRecord, ChargeConfigRecord };

export async function getCompanyBankingDetails(
  companyId: string,
): Promise<BankingDetailsRecord | null> {
  return getDbCompanyBankingDetails(companyId);
}

export async function saveCompanyBankingDetails(
  companyId: string,
  details: Omit<BankingDetailsRecord, "id" | "companyId">,
): Promise<BankingDetailsRecord> {
  return saveDbCompanyBankingDetails(companyId, details);
}

// ============================================================================
// CHARGE CONFIGURATIONS
// ============================================================================

export async function getCompanyChargeConfigs(
  companyId: string,
): Promise<ChargeConfigRecord[]> {
  return getDbCompanyChargeConfigs(companyId);
}

export async function saveCompanyChargeConfig(
  companyId: string,
  config: Omit<ChargeConfigRecord, "id" | "companyId">,
): Promise<ChargeConfigRecord> {
  return saveDbCompanyChargeConfig(companyId, config);
}

export async function deleteCompanyChargeConfig(id: string): Promise<void> {
  return deleteDbCompanyChargeConfig(id);
}

// ============================================================================
// USER INVITATIONS
// ============================================================================

export async function getUserInvitations(companyId: string) {
  return getDbUserInvitations(companyId);
}

export async function createUserInvitation(
  companyId: string,
  email: string,
  role: string,
  invitedByUserId: string,
) {
  return createDbUserInvitation(companyId, email, role, invitedByUserId);
}

export async function cancelUserInvitation(id: string): Promise<void> {
  return cancelDbUserInvitation(id);
}
