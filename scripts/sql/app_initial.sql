-- Application DB schema (idempotent)

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'dbo')
BEGIN
    EXEC('CREATE SCHEMA dbo');
END
GO

-- Applications
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'Applications' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.Applications (
    Id NVARCHAR(450) NOT NULL PRIMARY KEY,
    FullName NVARCHAR(200) NOT NULL,
    CellNumber NVARCHAR(50) NOT NULL,
    IdNumber NVARCHAR(200) NULL,
    UnitId NVARCHAR(450) NULL,
    CompanyId NVARCHAR(450) NULL,
    AgentId NVARCHAR(450) NULL,
    Status NVARCHAR(50) NOT NULL,
    Salary INT NULL,
    Employer NVARCHAR(200) NULL,
    EmploymentStatus NVARCHAR(200) NULL,
    EmploymentDuration NVARCHAR(200) NULL,
    Email NVARCHAR(200) NULL,
    HasAccount BIT NOT NULL DEFAULT(0),
    InitialPaymentPaid BIT NOT NULL DEFAULT(0),
    CreatedAt DATETIME2 NOT NULL,
    UpdatedAt DATETIME2 NOT NULL
);
END
GO

-- Ensure Applications.CompanyId column exists for existing databases
IF COL_LENGTH('dbo.Applications', 'CompanyId') IS NULL
BEGIN
    ALTER TABLE dbo.Applications ADD CompanyId NVARCHAR(450) NULL;
END
GO

-- Lease terms columns
IF COL_LENGTH('dbo.Applications', 'LeaseStartDate') IS NULL
BEGIN
    ALTER TABLE dbo.Applications ADD LeaseStartDate DATETIME2 NULL;
END
GO

IF COL_LENGTH('dbo.Applications', 'LeaseDurationMonths') IS NULL
BEGIN
    ALTER TABLE dbo.Applications ADD LeaseDurationMonths INT NOT NULL DEFAULT(12);
END
GO

IF COL_LENGTH('dbo.Applications', 'SignedLeaseDocumentId') IS NULL
BEGIN
    ALTER TABLE dbo.Applications ADD SignedLeaseDocumentId NVARCHAR(450) NULL;
END
GO

IF COL_LENGTH('dbo.Applications', 'LeaseSignedAt') IS NULL
BEGIN
    ALTER TABLE dbo.Applications ADD LeaseSignedAt DATETIME2 NULL;
END
GO

-- Estates (property complexes belonging to companies)
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'Estates' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.Estates (
    Id NVARCHAR(450) NOT NULL PRIMARY KEY,
    Name NVARCHAR(200) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Address NVARCHAR(500) NULL,
    City NVARCHAR(100) NULL,
    Province NVARCHAR(100) NULL,
    PostalCode NVARCHAR(20) NULL,
    CompanyId NVARCHAR(450) NOT NULL,
    CompanyName NVARCHAR(200) NULL,
    TotalUnits INT NULL,
    ContactEmail NVARCHAR(200) NULL,
    ContactPhone NVARCHAR(50) NULL,
    Images NVARCHAR(MAX) NULL,
    Amenities NVARCHAR(MAX) NULL,
    LogoBlobName NVARCHAR(500) NULL,
    LogoUrl NVARCHAR(1000) NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT('active'),
    CreatedAt DATETIME2 NOT NULL,
    UpdatedAt DATETIME2 NOT NULL
);
END
GO

-- Add logo columns to existing Estates table if missing
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Estates') AND name = 'LogoBlobName')
BEGIN
    ALTER TABLE dbo.Estates ADD LogoBlobName NVARCHAR(500) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Estates') AND name = 'LogoUrl')
BEGIN
    ALTER TABLE dbo.Estates ADD LogoUrl NVARCHAR(1000) NULL;
END
GO

-- Estate indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Estates_CompanyId')
BEGIN
    CREATE INDEX IX_Estates_CompanyId ON dbo.Estates(CompanyId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Estates_CompanyName')
BEGIN
    CREATE INDEX IX_Estates_CompanyName ON dbo.Estates(CompanyName);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Estates_Status')
BEGIN
    CREATE INDEX IX_Estates_Status ON dbo.Estates(Status);
END
GO

-- Units
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'Units' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.Units (
    Id NVARCHAR(450) NOT NULL PRIMARY KEY,
    Name NVARCHAR(200) NOT NULL,
    Address NVARCHAR(500) NOT NULL,
    CompanyName NVARCHAR(200) NULL,
    CompanyId NVARCHAR(450) NULL,
    EstateId NVARCHAR(450) NULL,
    EstateName NVARCHAR(200) NULL,
    Rent DECIMAL(18,2) NOT NULL,
    Deposit DECIMAL(18,2) NOT NULL,
    Status NVARCHAR(50) NOT NULL
);
END
GO

-- Ensure CompanyId column exists for existing databases
IF COL_LENGTH('dbo.Units', 'CompanyId') IS NULL
BEGIN
    ALTER TABLE dbo.Units ADD CompanyId NVARCHAR(450) NULL;
END
GO

-- Ensure EstateId column exists for existing databases
IF COL_LENGTH('dbo.Units', 'EstateId') IS NULL
BEGIN
    ALTER TABLE dbo.Units ADD EstateId NVARCHAR(450) NULL;
END
GO

-- Ensure EstateName column exists for existing databases
IF COL_LENGTH('dbo.Units', 'EstateName') IS NULL
BEGIN
    ALTER TABLE dbo.Units ADD EstateName NVARCHAR(200) NULL;
END
GO

-- Estate index on Units
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Units_EstateId')
BEGIN
    CREATE INDEX IX_Units_EstateId ON dbo.Units(EstateId);
END
GO

-- Add additional Unit columns expected by frontend
IF COL_LENGTH('dbo.Units', 'Images') IS NULL
BEGIN
    ALTER TABLE dbo.Units ADD Images NVARCHAR(MAX) NULL;
END
GO

IF COL_LENGTH('dbo.Units', 'Description') IS NULL
BEGIN
    ALTER TABLE dbo.Units ADD Description NVARCHAR(MAX) NULL;
END
GO

IF COL_LENGTH('dbo.Units', 'Amenities') IS NULL
BEGIN
    ALTER TABLE dbo.Units ADD Amenities NVARCHAR(MAX) NULL;
END
GO

IF COL_LENGTH('dbo.Units', 'Bedrooms') IS NULL
BEGIN
    ALTER TABLE dbo.Units ADD Bedrooms INT NULL;
END
GO

IF COL_LENGTH('dbo.Units', 'Bathrooms') IS NULL
BEGIN
    ALTER TABLE dbo.Units ADD Bathrooms DECIMAL(5,2) NULL;
END
GO

IF COL_LENGTH('dbo.Units', 'Sqft') IS NULL
BEGIN
    ALTER TABLE dbo.Units ADD Sqft INT NULL;
END
GO

IF COL_LENGTH('dbo.Units', 'AvailableFrom') IS NULL
BEGIN
    ALTER TABLE dbo.Units ADD AvailableFrom DATETIME2 NULL;
END
GO

IF COL_LENGTH('dbo.Units', 'PendingApplications') IS NULL
BEGIN
    ALTER TABLE dbo.Units ADD PendingApplications INT NULL;
END
GO

-- Package / billing related columns
IF COL_LENGTH('dbo.Units', 'PackageName') IS NULL
BEGIN
    ALTER TABLE dbo.Units ADD PackageName NVARCHAR(200) NULL;
END
GO

IF COL_LENGTH('dbo.Units', 'PackageBreakdown') IS NULL
BEGIN
    ALTER TABLE dbo.Units ADD PackageBreakdown NVARCHAR(MAX) NULL;
END
GO

IF COL_LENGTH('dbo.Units', 'InitialTotalPay') IS NULL
BEGIN
    ALTER TABLE dbo.Units ADD InitialTotalPay DECIMAL(18,2) NULL;
END
GO

IF COL_LENGTH('dbo.Units', 'InitialCharges') IS NULL
BEGIN
    ALTER TABLE dbo.Units ADD InitialCharges DECIMAL(18,2) NULL;
END
GO

IF COL_LENGTH('dbo.Units', 'InitialChargesBreakdown') IS NULL
BEGIN
    ALTER TABLE dbo.Units ADD InitialChargesBreakdown NVARCHAR(MAX) NULL;
END
GO

IF COL_LENGTH('dbo.Units', 'Fees') IS NULL
BEGIN
    ALTER TABLE dbo.Units ADD Fees NVARCHAR(MAX) NULL;
END
GO

IF COL_LENGTH('dbo.Units', 'BillingCycle') IS NULL
BEGIN
    ALTER TABLE dbo.Units ADD BillingCycle NVARCHAR(100) NULL;
END
GO

IF COL_LENGTH('dbo.Units', 'PackageMetadata') IS NULL
BEGIN
    ALTER TABLE dbo.Units ADD PackageMetadata NVARCHAR(MAX) NULL;
END
GO

-- Lease metadata
IF COL_LENGTH('dbo.Units', 'LeaseStart') IS NULL
BEGIN
    ALTER TABLE dbo.Units ADD LeaseStart DATETIME2 NULL;
END
GO

IF COL_LENGTH('dbo.Units', 'LeaseTerm') IS NULL
BEGIN
    ALTER TABLE dbo.Units ADD LeaseTerm NVARCHAR(200) NULL;
END
GO

IF COL_LENGTH('dbo.Units', 'ApartmentNumber') IS NULL
BEGIN
    ALTER TABLE dbo.Units ADD ApartmentNumber NVARCHAR(100) NULL;
END
GO

-- OutboxMessages
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'OutboxMessages' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.OutboxMessages (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    RoutingKey NVARCHAR(200) NOT NULL,
    Payload NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME2 NOT NULL,
    SentAt DATETIME2 NULL
);
END
GO

-- Documents
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'Documents' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.Documents (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    ApplicationId NVARCHAR(450) NOT NULL,
    BlobUri NVARCHAR(MAX) NOT NULL,
    BlobName NVARCHAR(1000) NULL,
    Name NVARCHAR(500) NULL,
    ContentType NVARCHAR(200) NULL,
    DocumentType NVARCHAR(100) NULL,
    CreatedAt DATETIME2 NOT NULL
);
END
GO

-- Ensure Documents.BlobName and Documents.Name columns exist for existing databases
IF COL_LENGTH('dbo.Documents', 'BlobName') IS NULL
BEGIN
    ALTER TABLE dbo.Documents ADD BlobName NVARCHAR(1000) NULL;
END
GO

IF COL_LENGTH('dbo.Documents', 'Name') IS NULL
BEGIN
    ALTER TABLE dbo.Documents ADD Name NVARCHAR(500) NULL;
END
GO

-- CreditChecks
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'CreditChecks' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.CreditChecks (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    IdNumber NVARCHAR(200) NOT NULL,
    ResultJson NVARCHAR(MAX) NOT NULL,
    CheckedAt DATETIME2 NOT NULL
);
END
GO

-- LeaseTemplates
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'LeaseTemplates' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.LeaseTemplates (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    CompanyName NVARCHAR(200) NOT NULL,
    Name NVARCHAR(200) NOT NULL,
    Content NVARCHAR(MAX) NOT NULL,
    IsDefault BIT NOT NULL,
    CreatedByAgentId NVARCHAR(450) NULL,
    CreatedAt DATETIME2 NOT NULL
);
END
GO

-- Notifications
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'Notifications' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.Notifications (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    UserId NVARCHAR(450) NOT NULL,
    CompanyId NVARCHAR(450) NULL,
    Type INT NOT NULL DEFAULT(5),
    Title NVARCHAR(200) NOT NULL,
    Message NVARCHAR(2000) NOT NULL,
    ActionUrl NVARCHAR(500) NULL,
    RelatedEntityId NVARCHAR(450) NULL,
    RelatedEntityType NVARCHAR(100) NULL,
    IsRead BIT NOT NULL DEFAULT(0),
    ReadAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL,
    SourceEventKey NVARCHAR(200) NULL
);
END
GO

-- Indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Applications_UnitId')
BEGIN
    CREATE INDEX IX_Applications_UnitId ON dbo.Applications(UnitId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Applications_Status')
BEGIN
    CREATE INDEX IX_Applications_Status ON dbo.Applications(Status);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Applications_CreatedAt')
BEGIN
    CREATE INDEX IX_Applications_CreatedAt ON dbo.Applications(CreatedAt);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Units_Status')
BEGIN
    CREATE INDEX IX_Units_Status ON dbo.Units(Status);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Units_CompanyId')
BEGIN
    CREATE INDEX IX_Units_CompanyId ON dbo.Units(CompanyId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Units_CompanyName')
BEGIN
    CREATE INDEX IX_Units_CompanyName ON dbo.Units(CompanyName);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Documents_ApplicationId')
BEGIN
    CREATE INDEX IX_Documents_ApplicationId ON dbo.Documents(ApplicationId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_CreditChecks_IdNumber')
BEGIN
    CREATE INDEX IX_CreditChecks_IdNumber ON dbo.CreditChecks(IdNumber);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_LeaseTemplates_IsDefault')
BEGIN
    CREATE INDEX IX_LeaseTemplates_IsDefault ON dbo.LeaseTemplates(IsDefault);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_OutboxMessages_CreatedAt')
BEGIN
    CREATE INDEX IX_OutboxMessages_CreatedAt ON dbo.OutboxMessages(CreatedAt);
END
GO

-- Notification indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Notifications_UserId')
BEGIN
    CREATE INDEX IX_Notifications_UserId ON dbo.Notifications(UserId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Notifications_CompanyId')
BEGIN
    CREATE INDEX IX_Notifications_CompanyId ON dbo.Notifications(CompanyId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Notifications_UserId_IsRead')
BEGIN
    CREATE INDEX IX_Notifications_UserId_IsRead ON dbo.Notifications(UserId, IsRead);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Notifications_CreatedAt')
BEGIN
    CREATE INDEX IX_Notifications_CreatedAt ON dbo.Notifications(CreatedAt DESC);
END
GO

-- Employment Statuses lookup table
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'EmploymentStatuses' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.EmploymentStatuses (
    Id INT NOT NULL PRIMARY KEY,
    Name NVARCHAR(50) NOT NULL,
    DisplayName NVARCHAR(100) NOT NULL,
    Description NVARCHAR(500) NULL,
    RequiresPayslip BIT NOT NULL DEFAULT(1),
    RequiredBankStatementMonths INT NOT NULL DEFAULT(3),
    IsActive BIT NOT NULL DEFAULT(1)
);

-- Seed employment statuses
INSERT INTO dbo.EmploymentStatuses (Id, Name, DisplayName, Description, RequiresPayslip, RequiredBankStatementMonths, IsActive) VALUES
(1, 'employed', 'Employed', 'Working for an employer', 1, 3, 1),
(2, 'self-employed', 'Self-Employed', 'Running own business', 0, 6, 1),
(3, 'unemployed', 'Unemployed', 'Currently not employed', 1, 3, 1),
(4, 'retired', 'Retired', 'Retired from work', 1, 3, 1),
(5, 'student', 'Student', 'Full-time student', 1, 3, 1);
END
GO

-- AdditionalCharges - for adding extra costs to tenant rent
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'AdditionalCharges' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.AdditionalCharges (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    ApplicationId NVARCHAR(450) NOT NULL,
    UnitId NVARCHAR(450) NULL,
    TenantUserId NVARCHAR(450) NULL,
    CompanyId NVARCHAR(450) NULL,
    ChargeType NVARCHAR(50) NOT NULL DEFAULT('other'),
    Description NVARCHAR(1000) NOT NULL,
    Amount DECIMAL(18,2) NOT NULL,
    BillingMonth NVARCHAR(10) NOT NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT('pending'),
    CreatedByUserId NVARCHAR(450) NOT NULL,
    CreatedByRole NVARCHAR(50) NOT NULL,
    SupportingDocumentIds NVARCHAR(MAX) NULL,
    DueDate DATETIME2 NULL,
    PaidAt DATETIME2 NULL,
    PaymentTransactionId NVARCHAR(450) NULL,
    CreatedAt DATETIME2 NOT NULL,
    UpdatedAt DATETIME2 NOT NULL
);
END
GO

-- ChargeAppeals - for tenant appeals against charges
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'ChargeAppeals' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.ChargeAppeals (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    AdditionalChargeId UNIQUEIDENTIFIER NOT NULL,
    TenantUserId NVARCHAR(450) NOT NULL,
    Reason NVARCHAR(2000) NOT NULL,
    SupportingDocumentIds NVARCHAR(MAX) NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT('pending'),
    ReviewerResponse NVARCHAR(2000) NULL,
    ReviewedByUserId NVARCHAR(450) NULL,
    ReviewedByRole NVARCHAR(50) NULL,
    ReviewedAt DATETIME2 NULL,
    AdjustedAmount DECIMAL(18,2) NULL,
    CreatedAt DATETIME2 NOT NULL,
    UpdatedAt DATETIME2 NOT NULL
);
END
GO

-- PaymentTransactions - for tracking all payments and platform fees
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'PaymentTransactions' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.PaymentTransactions (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    ApplicationId NVARCHAR(450) NULL,
    AdditionalChargeId UNIQUEIDENTIFIER NULL,
    TenantUserId NVARCHAR(450) NOT NULL,
    CompanyId NVARCHAR(450) NULL,
    PaymentType NVARCHAR(50) NOT NULL,
    TotalAmount DECIMAL(18,2) NOT NULL,
    BaseRentAmount DECIMAL(18,2) NULL,
    PlatformFee DECIMAL(18,4) NOT NULL,
    ProcessorFee DECIMAL(18,4) NOT NULL,
    NetAmount DECIMAL(18,2) NOT NULL,
    ExternalTransactionId NVARCHAR(450) NULL,
    PaymentProcessor NVARCHAR(100) NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT('pending'),
    ErrorMessage NVARCHAR(1000) NULL,
    BillingMonth NVARCHAR(10) NULL,
    Description NVARCHAR(500) NULL,
    ProcessorResponse NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL,
    CompletedAt DATETIME2 NULL
);
END
GO

-- Platform fee configuration (stores the 0.005% fee rate)
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'PlatformSettings' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.PlatformSettings (
    Id INT NOT NULL PRIMARY KEY,
    SettingKey NVARCHAR(100) NOT NULL UNIQUE,
    SettingValue NVARCHAR(500) NOT NULL,
    Description NVARCHAR(500) NULL,
    UpdatedAt DATETIME2 NOT NULL
);

-- Seed platform settings
INSERT INTO dbo.PlatformSettings (Id, SettingKey, SettingValue, Description, UpdatedAt) VALUES
(1, 'platform_fee_rate', '0.00005', 'Platform fee rate (0.005%) applied to payments', GETUTCDATE()),
(2, 'platform_fee_applies_to_rent_only_initial', 'true', 'For initial payments, platform fee only applies to rent portion', GETUTCDATE()),
(3, 'platform_fee_applies_to_all_other', 'true', 'For other payments (fines, additional charges), platform fee applies to full amount', GETUTCDATE());
END
GO

-- AdditionalCharges indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_AdditionalCharges_ApplicationId')
BEGIN
    CREATE INDEX IX_AdditionalCharges_ApplicationId ON dbo.AdditionalCharges(ApplicationId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_AdditionalCharges_TenantUserId')
BEGIN
    CREATE INDEX IX_AdditionalCharges_TenantUserId ON dbo.AdditionalCharges(TenantUserId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_AdditionalCharges_CompanyId')
BEGIN
    CREATE INDEX IX_AdditionalCharges_CompanyId ON dbo.AdditionalCharges(CompanyId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_AdditionalCharges_BillingMonth')
BEGIN
    CREATE INDEX IX_AdditionalCharges_BillingMonth ON dbo.AdditionalCharges(BillingMonth);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_AdditionalCharges_Status')
BEGIN
    CREATE INDEX IX_AdditionalCharges_Status ON dbo.AdditionalCharges(Status);
END
GO

-- ChargeAppeals indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_ChargeAppeals_AdditionalChargeId')
BEGIN
    CREATE INDEX IX_ChargeAppeals_AdditionalChargeId ON dbo.ChargeAppeals(AdditionalChargeId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_ChargeAppeals_TenantUserId')
BEGIN
    CREATE INDEX IX_ChargeAppeals_TenantUserId ON dbo.ChargeAppeals(TenantUserId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_ChargeAppeals_Status')
BEGIN
    CREATE INDEX IX_ChargeAppeals_Status ON dbo.ChargeAppeals(Status);
END
GO

-- PaymentTransactions indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_PaymentTransactions_ApplicationId')
BEGIN
    CREATE INDEX IX_PaymentTransactions_ApplicationId ON dbo.PaymentTransactions(ApplicationId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_PaymentTransactions_TenantUserId')
BEGIN
    CREATE INDEX IX_PaymentTransactions_TenantUserId ON dbo.PaymentTransactions(TenantUserId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_PaymentTransactions_CompanyId')
BEGIN
    CREATE INDEX IX_PaymentTransactions_CompanyId ON dbo.PaymentTransactions(CompanyId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_PaymentTransactions_Status')
BEGIN
    CREATE INDEX IX_PaymentTransactions_Status ON dbo.PaymentTransactions(Status);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_PaymentTransactions_CreatedAt')
BEGIN
    CREATE INDEX IX_PaymentTransactions_CreatedAt ON dbo.PaymentTransactions(CreatedAt DESC);
END
GO
-- =====================================================
-- PAYSTACK PAYMENT INFRASTRUCTURE (South African Gateway)
-- =====================================================

-- Leases (tenant lease agreements)
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'Leases' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.Leases (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    UnitId NVARCHAR(450) NOT NULL,
    TenantId NVARCHAR(450) NULL,
    TenantName NVARCHAR(200) NOT NULL,
    TenantEmail NVARCHAR(200) NULL,
    TenantPhone NVARCHAR(50) NULL,
    MonthlyRentInCents BIGINT NOT NULL,
    DepositInCents BIGINT NOT NULL,
    LeaseStartDate DATETIME2 NOT NULL,
    LeaseEndDate DATETIME2 NOT NULL,
    LeaseStatus NVARCHAR(50) NOT NULL DEFAULT('Active'),
    RentDueDay INT NOT NULL DEFAULT(1),
    GracePeriodDays INT NOT NULL DEFAULT(5),
    LateFeePercentage DECIMAL(5,2) NOT NULL DEFAULT(0),
    ApplicationId NVARCHAR(450) NULL,
    
    -- Signed lease document (stored in blob storage)
    SignedLeaseDocumentId UNIQUEIDENTIFIER NULL,
    SignedLeaseBlobUri NVARCHAR(MAX) NULL,
    SignedLeaseBlobName NVARCHAR(1000) NULL,
    LeaseSignedAt DATETIME2 NULL,
    SignedByTenantId NVARCHAR(450) NULL,
    TenantSignatureHash NVARCHAR(500) NULL,
    
    -- Original lease template used
    LeaseTemplateId UNIQUEIDENTIFIER NULL,
    
    Notes NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE()),
    UpdatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE()),
    
    -- Foreign key to Documents table for signed lease
    CONSTRAINT FK_Leases_SignedDocument FOREIGN KEY (SignedLeaseDocumentId) REFERENCES dbo.Documents(Id)
);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Leases_UnitId')
BEGIN
    CREATE INDEX IX_Leases_UnitId ON dbo.Leases(UnitId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Leases_TenantId')
BEGIN
    CREATE INDEX IX_Leases_TenantId ON dbo.Leases(TenantId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Leases_LeaseStatus')
BEGIN
    CREATE INDEX IX_Leases_LeaseStatus ON dbo.Leases(LeaseStatus);
END
GO

-- Wallets (company earnings tracking)
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'Wallets' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.Wallets (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    CompanyId NVARCHAR(450) NOT NULL UNIQUE,
    AvailableBalanceInCents BIGINT NOT NULL DEFAULT(0),
    PendingBalanceInCents BIGINT NOT NULL DEFAULT(0),
    TotalReceivedInCents BIGINT NOT NULL DEFAULT(0),
    TotalPaidOutInCents BIGINT NOT NULL DEFAULT(0),
    TotalFeesInCents BIGINT NOT NULL DEFAULT(0),
    Currency NVARCHAR(3) NOT NULL DEFAULT('ZAR'),
    
    -- Paystack integration
    PaystackSubaccountCode NVARCHAR(100) NULL,
    PaystackRecipientCode NVARCHAR(100) NULL,
    
    -- Bank details for payouts
    BankCode NVARCHAR(20) NULL,
    BankName NVARCHAR(200) NULL,
    BankAccountNumber NVARCHAR(50) NULL,
    BankAccountName NVARCHAR(200) NULL,
    
    -- Payout settings
    PayoutSchedule INT NOT NULL DEFAULT(4), -- 0=Daily, 1=Weekly, 2=BiWeekly, 3=Monthly, 4=Manual
    AutoPayoutEnabled BIT NOT NULL DEFAULT(0),
    MinPayoutAmountInCents BIGINT NOT NULL DEFAULT(10000), -- R100 minimum
    LastPayoutAt DATETIME2 NULL,
    
    -- KYC
    IsVerified BIT NOT NULL DEFAULT(0),
    VerifiedAt DATETIME2 NULL,
    
    CreatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE()),
    UpdatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE())
);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Wallets_CompanyId')
BEGIN
    CREATE UNIQUE INDEX IX_Wallets_CompanyId ON dbo.Wallets(CompanyId);
END
GO

-- Charges (amounts tenants owe)
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'Charges' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.Charges (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    LeaseId UNIQUEIDENTIFIER NOT NULL,
    ChargeType INT NOT NULL, -- Enum: MonthlyRent, Deposit, LateFee, Utilities, etc.
    Description NVARCHAR(500) NULL,
    AmountInCents BIGINT NOT NULL,
    PaidAmountInCents BIGINT NOT NULL DEFAULT(0),
    -- BalanceInCents is computed: AmountInCents - PaidAmountInCents
    DueDate DATETIME2 NOT NULL,
    GracePeriodDays INT NOT NULL DEFAULT(5),
    LateFeePercentage DECIMAL(5,2) NOT NULL DEFAULT(0),
    LateFeeApplied BIT NOT NULL DEFAULT(0),
    LateFeeAmountInCents BIGINT NOT NULL DEFAULT(0),
    Status INT NOT NULL DEFAULT(0), -- 0=Pending, 1=Due, 2=Overdue, 3=PartiallyPaid, 4=Paid, 5=Cancelled, 6=Waived
    
    -- Recurring charge settings
    IsRecurring BIT NOT NULL DEFAULT(0),
    RecurrenceFrequency INT NULL, -- 0=Weekly, 1=BiWeekly, 2=Monthly, 3=Quarterly, 4=SemiAnnually, 5=Annually
    RecurrenceDay INT NULL, -- Day of month/week for recurrence
    RecurrenceEndDate DATETIME2 NULL,
    NextRecurrenceDate DATETIME2 NULL,
    
    -- Auto-pay settings
    AutoPayEnabled BIT NOT NULL DEFAULT(0),
    
    PaidAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE()),
    UpdatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE())
);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Charges_LeaseId')
BEGIN
    CREATE INDEX IX_Charges_LeaseId ON dbo.Charges(LeaseId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Charges_DueDate')
BEGIN
    CREATE INDEX IX_Charges_DueDate ON dbo.Charges(DueDate);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Charges_Status')
BEGIN
    CREATE INDEX IX_Charges_Status ON dbo.Charges(Status);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Charges_IsRecurring')
BEGIN
    CREATE INDEX IX_Charges_IsRecurring ON dbo.Charges(IsRecurring) WHERE IsRecurring = 1;
END
GO

-- Payments (transaction records via Paystack)
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'Payments' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.Payments (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    IdempotencyKey NVARCHAR(100) NOT NULL UNIQUE,
    ChargeId UNIQUEIDENTIFIER NULL,
    LeaseId UNIQUEIDENTIFIER NULL,
    TenantId NVARCHAR(450) NULL,
    CompanyId NVARCHAR(450) NULL,
    
    -- Payment details
    PaymentType INT NOT NULL, -- Enum: Rent, Deposit, LateFee, Utility, etc.
    AmountInCents BIGINT NOT NULL,
    Currency NVARCHAR(3) NOT NULL DEFAULT('ZAR'),
    
    -- Fee breakdown
    PlatformFeeInCents BIGINT NOT NULL DEFAULT(0), -- 0.005% platform fee
    ProviderFeeInCents BIGINT NOT NULL DEFAULT(0), -- Paystack fees
    NetAmountInCents BIGINT NOT NULL DEFAULT(0), -- Amount after all fees
    
    -- Split payment info
    SplitConfigId NVARCHAR(100) NULL,
    SubaccountCode NVARCHAR(100) NULL,
    
    -- Status tracking
    Status INT NOT NULL DEFAULT(0), -- 0=Pending, 1=Processing, 2=Successful, 3=Failed, 4=Cancelled, 5=Refunded
    PaymentMethod INT NULL, -- 0=Card, 1=BankTransfer, 2=USSD, 3=QRCode, 4=EFT, 5=MobileMoney, 6=DebitOrder
    
    -- Paystack integration
    ProviderReference NVARCHAR(200) NULL, -- Paystack reference
    ProviderTransactionId NVARCHAR(200) NULL,
    AccessCode NVARCHAR(200) NULL,
    AuthorizationUrl NVARCHAR(1000) NULL,
    ProviderResponse NVARCHAR(MAX) NULL,
    
    -- Failure/retry handling
    FailureReason NVARCHAR(500) NULL,
    RetryCount INT NOT NULL DEFAULT(0),
    LastRetryAt DATETIME2 NULL,
    
    -- Refund tracking
    RefundedAmountInCents BIGINT NOT NULL DEFAULT(0),
    RefundedAt DATETIME2 NULL,
    RefundReason NVARCHAR(500) NULL,
    
    -- Timestamps
    InitiatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE()),
    CompletedAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE()),
    UpdatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE())
);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Payments_IdempotencyKey')
BEGIN
    CREATE UNIQUE INDEX IX_Payments_IdempotencyKey ON dbo.Payments(IdempotencyKey);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Payments_ChargeId')
BEGIN
    CREATE INDEX IX_Payments_ChargeId ON dbo.Payments(ChargeId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Payments_TenantId')
BEGIN
    CREATE INDEX IX_Payments_TenantId ON dbo.Payments(TenantId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Payments_CompanyId')
BEGIN
    CREATE INDEX IX_Payments_CompanyId ON dbo.Payments(CompanyId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Payments_Status')
BEGIN
    CREATE INDEX IX_Payments_Status ON dbo.Payments(Status);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Payments_ProviderReference')
BEGIN
    CREATE INDEX IX_Payments_ProviderReference ON dbo.Payments(ProviderReference);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Payments_InitiatedAt')
BEGIN
    CREATE INDEX IX_Payments_InitiatedAt ON dbo.Payments(InitiatedAt DESC);
END
GO

-- Add AdditionalChargeIds column to Payments table for tracking additional charges in payments
IF COL_LENGTH('dbo.Payments', 'AdditionalChargeIds') IS NULL
BEGIN
    ALTER TABLE dbo.Payments ADD AdditionalChargeIds NVARCHAR(MAX) NULL;
END
GO

-- SavedPaymentMethods (tokenized cards/accounts for recurring payments)
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'SavedPaymentMethods' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.SavedPaymentMethods (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    TenantId NVARCHAR(450) NOT NULL,
    Email NVARCHAR(200) NOT NULL,
    
    -- Method type
    MethodType INT NOT NULL, -- 0=Card, 1=BankAccount, 2=DebitOrder
    
    -- Paystack authorization
    AuthorizationCode NVARCHAR(200) NOT NULL,
    
    -- Card details (masked)
    CardLast4 NVARCHAR(4) NULL,
    CardBrand NVARCHAR(50) NULL,
    CardExpMonth NVARCHAR(2) NULL,
    CardExpYear NVARCHAR(4) NULL,
    
    -- Bank details
    BankCode NVARCHAR(20) NULL,
    BankName NVARCHAR(200) NULL,
    AccountName NVARCHAR(200) NULL,
    
    -- Verification
    CountryCode NVARCHAR(5) NULL,
    Channel NVARCHAR(50) NULL,
    IsReusable BIT NOT NULL DEFAULT(1),
    Signature NVARCHAR(500) NULL,
    
    -- Settings
    IsDefault BIT NOT NULL DEFAULT(0),
    IsDeleted BIT NOT NULL DEFAULT(0),
    DeletedAt DATETIME2 NULL,
    
    LastUsedAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE())
);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_SavedPaymentMethods_TenantId')
BEGIN
    CREATE INDEX IX_SavedPaymentMethods_TenantId ON dbo.SavedPaymentMethods(TenantId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_SavedPaymentMethods_Signature')
BEGIN
    CREATE INDEX IX_SavedPaymentMethods_Signature ON dbo.SavedPaymentMethods(Signature);
END
GO

-- WalletTransactions (audit trail for wallet movements)
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'WalletTransactions' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.WalletTransactions (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    WalletId UNIQUEIDENTIFIER NOT NULL,
    PaymentId UNIQUEIDENTIFIER NULL,
    PayoutId UNIQUEIDENTIFIER NULL,
    
    TransactionType INT NOT NULL, -- 0=PaymentReceived, 1=PlatformFee, 2=ProviderFee, 3=Payout, 4=PayoutFee, 5=Refund, 6=Chargeback, 7=PayoutReversed, 8=Adjustment, 9=SettlementReceived
    AmountInCents BIGINT NOT NULL, -- Positive for credits, negative for debits
    BalanceAfterInCents BIGINT NOT NULL,
    
    Description NVARCHAR(500) NULL,
    ExternalReference NVARCHAR(200) NULL,
    
    CreatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE())
);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_WalletTransactions_WalletId')
BEGIN
    CREATE INDEX IX_WalletTransactions_WalletId ON dbo.WalletTransactions(WalletId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_WalletTransactions_PaymentId')
BEGIN
    CREATE INDEX IX_WalletTransactions_PaymentId ON dbo.WalletTransactions(PaymentId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_WalletTransactions_CreatedAt')
BEGIN
    CREATE INDEX IX_WalletTransactions_CreatedAt ON dbo.WalletTransactions(CreatedAt DESC);
END
GO

-- Payouts (bank transfer requests)
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'Payouts' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.Payouts (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    WalletId UNIQUEIDENTIFIER NOT NULL,
    CompanyId NVARCHAR(450) NOT NULL,
    
    -- Amount details
    AmountInCents BIGINT NOT NULL,
    FeeInCents BIGINT NOT NULL DEFAULT(0),
    NetAmountInCents BIGINT NOT NULL,
    Currency NVARCHAR(3) NOT NULL DEFAULT('ZAR'),
    
    -- Bank details
    BankCode NVARCHAR(20) NOT NULL,
    BankName NVARCHAR(200) NOT NULL,
    AccountNumber NVARCHAR(50) NOT NULL,
    AccountName NVARCHAR(200) NOT NULL,
    
    -- Status
    Status INT NOT NULL DEFAULT(0), -- 0=Pending, 1=Processing, 2=Successful, 3=Failed, 4=RequiresApproval
    FailureReason NVARCHAR(500) NULL,
    RetryCount INT NOT NULL DEFAULT(0),
    
    -- Paystack integration
    ProviderReference NVARCHAR(200) NULL,
    TransferCode NVARCHAR(200) NULL,
    RecipientCode NVARCHAR(200) NULL,
    
    -- Approval workflow
    RequiresApproval BIT NOT NULL DEFAULT(0),
    ApprovedByUserId NVARCHAR(450) NULL,
    ApprovedAt DATETIME2 NULL,
    
    -- Timestamps
    RequestedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE()),
    RequestedBy NVARCHAR(450) NULL,
    CompletedAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE()),
    UpdatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE())
);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Payouts_WalletId')
BEGIN
    CREATE INDEX IX_Payouts_WalletId ON dbo.Payouts(WalletId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Payouts_CompanyId')
BEGIN
    CREATE INDEX IX_Payouts_CompanyId ON dbo.Payouts(CompanyId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Payouts_Status')
BEGIN
    CREATE INDEX IX_Payouts_Status ON dbo.Payouts(Status);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Payouts_ProviderReference')
BEGIN
    CREATE INDEX IX_Payouts_ProviderReference ON dbo.Payouts(ProviderReference);
END
GO

-- Add EventType column to OutboxMessages if not exists
IF COL_LENGTH('dbo.OutboxMessages', 'EventType') IS NULL
BEGIN
    ALTER TABLE dbo.OutboxMessages ADD EventType NVARCHAR(200) NULL;
END
GO

-- Update RoutingKey to be optional since we're using EventType
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.OutboxMessages') AND name = 'RoutingKey' AND is_nullable = 0)
BEGIN
    ALTER TABLE dbo.OutboxMessages ALTER COLUMN RoutingKey NVARCHAR(200) NULL;
END
GO

-- ============================================================================
-- MAINTENANCE REQUESTS TABLES
-- ============================================================================

-- MaintenanceRequests (tenant maintenance/repair requests)
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'MaintenanceRequests' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.MaintenanceRequests (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    CompanyId NVARCHAR(450) NOT NULL,
    UnitId NVARCHAR(450) NOT NULL,
    TenantUserId NVARCHAR(450) NOT NULL,
    LeaseId NVARCHAR(450) NULL,
    
    Title NVARCHAR(255) NOT NULL,
    Description NVARCHAR(MAX) NOT NULL,
    Category NVARCHAR(50) NOT NULL, -- Plumbing, Electrical, HVAC, Appliance, Structural, PestControl, Security, Landscaping, Other
    Priority NVARCHAR(20) NOT NULL DEFAULT('Medium'), -- Low, Medium, High, Urgent
    Status NVARCHAR(50) NOT NULL DEFAULT('Open'), -- Open, InProgress, OnHold, Resolved, Closed, Cancelled
    
    AssignedTo NVARCHAR(255) NULL,
    AssignedToUserId NVARCHAR(450) NULL,
    
    PreferredContactMethod NVARCHAR(50) NULL, -- Phone, Email, Text
    Availability NVARCHAR(500) NULL,
    PermissionToEnter BIT NOT NULL DEFAULT(0),
    
    EstimatedCost DECIMAL(18,2) NULL,
    ActualCost DECIMAL(18,2) NULL,
    
    InternalNotes NVARCHAR(MAX) NULL,
    ResolutionNotes NVARCHAR(MAX) NULL,
    
    SatisfactionRating INT NULL, -- 1-5
    TenantFeedback NVARCHAR(MAX) NULL,
    
    DueDate DATETIME2 NULL,
    StartedAt DATETIME2 NULL,
    CompletedAt DATETIME2 NULL,
    ResolvedAt DATETIME2 NULL,
    
    CreatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE()),
    UpdatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE())
);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_MaintenanceRequests_CompanyId')
BEGIN
    CREATE INDEX IX_MaintenanceRequests_CompanyId ON dbo.MaintenanceRequests(CompanyId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_MaintenanceRequests_UnitId')
BEGIN
    CREATE INDEX IX_MaintenanceRequests_UnitId ON dbo.MaintenanceRequests(UnitId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_MaintenanceRequests_TenantUserId')
BEGIN
    CREATE INDEX IX_MaintenanceRequests_TenantUserId ON dbo.MaintenanceRequests(TenantUserId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_MaintenanceRequests_Status')
BEGIN
    CREATE INDEX IX_MaintenanceRequests_Status ON dbo.MaintenanceRequests(Status);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_MaintenanceRequests_Priority')
BEGIN
    CREATE INDEX IX_MaintenanceRequests_Priority ON dbo.MaintenanceRequests(Priority);
END
GO

-- MaintenanceAttachments (photos and documents for maintenance requests)
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'MaintenanceAttachments' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.MaintenanceAttachments (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    MaintenanceRequestId UNIQUEIDENTIFIER NOT NULL,
    UploadedByUserId NVARCHAR(450) NOT NULL,
    
    Type NVARCHAR(50) NOT NULL DEFAULT('Photo'), -- Photo, Document, Video
    Category NVARCHAR(50) NOT NULL DEFAULT('Initial'), -- Initial, Progress, Completion
    
    FileName NVARCHAR(255) NOT NULL,
    FileType NVARCHAR(100) NOT NULL,
    MimeType NVARCHAR(100) NOT NULL,
    FileSize BIGINT NOT NULL DEFAULT(0),
    
    BlobUri NVARCHAR(500) NOT NULL,
    BlobName NVARCHAR(255) NOT NULL,
    
    Description NVARCHAR(500) NULL,
    
    CreatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE()),
    
    CONSTRAINT FK_MaintenanceAttachments_MaintenanceRequestId FOREIGN KEY (MaintenanceRequestId) REFERENCES dbo.MaintenanceRequests(Id)
);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_MaintenanceAttachments_MaintenanceRequestId')
BEGIN
    CREATE INDEX IX_MaintenanceAttachments_MaintenanceRequestId ON dbo.MaintenanceAttachments(MaintenanceRequestId);
END
GO

-- MaintenanceActivities (activity log/history for maintenance requests)
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'MaintenanceActivities' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.MaintenanceActivities (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    MaintenanceRequestId UNIQUEIDENTIFIER NOT NULL,
    PerformedByUserId NVARCHAR(450) NOT NULL,
    PerformedByName NVARCHAR(255) NOT NULL,
    
    ActivityType NVARCHAR(50) NOT NULL, -- StatusChange, PriorityChange, Assignment, Comment, Attachment, Scheduled
    Description NVARCHAR(MAX) NOT NULL,
    
    OldValue NVARCHAR(255) NULL,
    NewValue NVARCHAR(255) NULL,
    
    IsVisibleToTenant BIT NOT NULL DEFAULT(1),
    
    CreatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE()),
    
    CONSTRAINT FK_MaintenanceActivities_MaintenanceRequestId FOREIGN KEY (MaintenanceRequestId) REFERENCES dbo.MaintenanceRequests(Id)
);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_MaintenanceActivities_MaintenanceRequestId')
BEGIN
    CREATE INDEX IX_MaintenanceActivities_MaintenanceRequestId ON dbo.MaintenanceActivities(MaintenanceRequestId);
END
GO

-- ============================================================================
-- MESSAGING/CONVERSATION TABLES
-- ============================================================================

-- Conversations (message threads between users)
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'Conversations' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.Conversations (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    CompanyId NVARCHAR(450) NOT NULL,
    UnitId NVARCHAR(450) NULL,
    MaintenanceRequestId UNIQUEIDENTIFIER NULL,
    
    Type NVARCHAR(50) NOT NULL DEFAULT('Direct'), -- Direct, Maintenance, Announcement, System
    Subject NVARCHAR(255) NOT NULL,
    Status NVARCHAR(50) NOT NULL DEFAULT('Active'), -- Active, Archived, Closed
    
    CreatedByUserId NVARCHAR(450) NOT NULL,
    
    ClosedAt DATETIME2 NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE()),
    UpdatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE()),
    
    CONSTRAINT FK_Conversations_MaintenanceRequestId FOREIGN KEY (MaintenanceRequestId) REFERENCES dbo.MaintenanceRequests(Id)
);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Conversations_CompanyId')
BEGIN
    CREATE INDEX IX_Conversations_CompanyId ON dbo.Conversations(CompanyId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Conversations_UnitId')
BEGIN
    CREATE INDEX IX_Conversations_UnitId ON dbo.Conversations(UnitId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Conversations_MaintenanceRequestId')
BEGIN
    CREATE INDEX IX_Conversations_MaintenanceRequestId ON dbo.Conversations(MaintenanceRequestId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Conversations_Status')
BEGIN
    CREATE INDEX IX_Conversations_Status ON dbo.Conversations(Status);
END
GO

-- ConversationParticipants (users in a conversation)
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'ConversationParticipants' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.ConversationParticipants (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    ConversationId UNIQUEIDENTIFIER NOT NULL,
    UserId NVARCHAR(450) NOT NULL,
    
    Role NVARCHAR(50) NOT NULL DEFAULT('Participant'), -- Owner, Participant, Observer
    
    JoinedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE()),
    LeftAt DATETIME2 NULL,
    LastReadAt DATETIME2 NULL,
    UnreadCount INT NOT NULL DEFAULT(0),
    IsMuted BIT NOT NULL DEFAULT(0),
    
    CONSTRAINT FK_ConversationParticipants_ConversationId FOREIGN KEY (ConversationId) REFERENCES dbo.Conversations(Id)
);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_ConversationParticipants_ConversationId')
BEGIN
    CREATE INDEX IX_ConversationParticipants_ConversationId ON dbo.ConversationParticipants(ConversationId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_ConversationParticipants_UserId')
BEGIN
    CREATE INDEX IX_ConversationParticipants_UserId ON dbo.ConversationParticipants(UserId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_ConversationParticipants_ConversationId_UserId')
BEGIN
    CREATE UNIQUE INDEX IX_ConversationParticipants_ConversationId_UserId ON dbo.ConversationParticipants(ConversationId, UserId);
END
GO

-- Messages (individual messages in conversations)
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'Messages' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.Messages (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    ConversationId UNIQUEIDENTIFIER NOT NULL,
    SenderId NVARCHAR(450) NOT NULL,
    
    Content NVARCHAR(MAX) NOT NULL,
    Type NVARCHAR(50) NOT NULL DEFAULT('Text'), -- Text, Image, File, System
    Status NVARCHAR(50) NOT NULL DEFAULT('Sent'), -- Sent, Delivered, Read
    
    ReplyToMessageId UNIQUEIDENTIFIER NULL,
    Metadata NVARCHAR(MAX) NULL, -- JSON for attachments, reactions, etc.
    
    EditedAt DATETIME2 NULL,
    DeletedAt DATETIME2 NULL,
    IsDeleted BIT NOT NULL DEFAULT(0),
    
    CreatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE()),
    
    CONSTRAINT FK_Messages_ConversationId FOREIGN KEY (ConversationId) REFERENCES dbo.Conversations(Id),
    CONSTRAINT FK_Messages_ReplyToMessageId FOREIGN KEY (ReplyToMessageId) REFERENCES dbo.Messages(Id)
);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Messages_ConversationId')
BEGIN
    CREATE INDEX IX_Messages_ConversationId ON dbo.Messages(ConversationId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Messages_SenderId')
BEGIN
    CREATE INDEX IX_Messages_SenderId ON dbo.Messages(SenderId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Messages_CreatedAt')
BEGIN
    CREATE INDEX IX_Messages_CreatedAt ON dbo.Messages(CreatedAt DESC);
END
GO

-- MessageAttachments (files attached to messages)
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'MessageAttachments' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.MessageAttachments (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    MessageId UNIQUEIDENTIFIER NOT NULL,
    
    FileName NVARCHAR(255) NOT NULL,
    FileType NVARCHAR(100) NOT NULL,
    MimeType NVARCHAR(100) NOT NULL,
    FileSize BIGINT NOT NULL DEFAULT(0),
    
    BlobUri NVARCHAR(500) NOT NULL,
    BlobName NVARCHAR(255) NOT NULL,
    
    CreatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE()),
    
    CONSTRAINT FK_MessageAttachments_MessageId FOREIGN KEY (MessageId) REFERENCES dbo.Messages(Id)
);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_MessageAttachments_MessageId')
BEGIN
    CREATE INDEX IX_MessageAttachments_MessageId ON dbo.MessageAttachments(MessageId);
END
GO

-- ============================================================================
-- DOCUMENT TYPES TABLE (configurable document types for applications)
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'DocumentTypes' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.DocumentTypes (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Code NVARCHAR(50) NOT NULL,
    Name NVARCHAR(100) NOT NULL,
    Description NVARCHAR(500) NULL,
    Category NVARCHAR(50) NULL,
    AllowedExtensions NVARCHAR(200) NULL,
    MaxFileSizeBytes BIGINT NULL,
    IsRequired BIT NOT NULL DEFAULT(0),
    IsSystemType BIT NOT NULL DEFAULT(0),
    DisplayOrder INT NOT NULL DEFAULT(0),
    CreatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE()),
    UpdatedAt DATETIME2 NULL
);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_DocumentTypes_Code')
BEGIN
    CREATE UNIQUE INDEX IX_DocumentTypes_Code ON dbo.DocumentTypes(Code);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_DocumentTypes_Category')
BEGIN
    CREATE INDEX IX_DocumentTypes_Category ON dbo.DocumentTypes(Category);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_DocumentTypes_IsRequired')
BEGIN
    CREATE INDEX IX_DocumentTypes_IsRequired ON dbo.DocumentTypes(IsRequired);
END
GO

-- Seed default document types
IF NOT EXISTS (SELECT 1 FROM dbo.DocumentTypes WHERE Code = 'id_copy')
BEGIN
    INSERT INTO dbo.DocumentTypes (Code, Name, Description, Category, AllowedExtensions, MaxFileSizeBytes, IsRequired, IsSystemType, DisplayOrder)
    VALUES 
    ('id_copy', 'ID Document', 'Copy of national ID, passport, or drivers license', 'identity', '.pdf,.jpg,.jpeg,.png', 10485760, 1, 1, 1),
    ('payslip', 'Payslip', 'Recent payslip or proof of income', 'financial', '.pdf,.jpg,.jpeg,.png', 10485760, 1, 1, 2),
    ('bank_statement', 'Bank Statement', '3 months bank statements', 'financial', '.pdf', 20971520, 1, 1, 3),
    ('proof_of_residence', 'Proof of Residence', 'Utility bill or official document showing current address', 'identity', '.pdf,.jpg,.jpeg,.png', 10485760, 0, 1, 4),
    ('employment_letter', 'Employment Letter', 'Letter from employer confirming employment', 'financial', '.pdf,.jpg,.jpeg,.png', 10485760, 0, 1, 5),
    ('reference_letter', 'Reference Letter', 'Reference from previous landlord', 'reference', '.pdf,.jpg,.jpeg,.png', 10485760, 0, 1, 6),
    ('lease_draft', 'Lease Draft', 'Draft lease agreement for review', 'lease', '.pdf', 20971520, 0, 1, 10),
    ('lease', 'Lease Agreement', 'Final lease agreement sent to tenant', 'lease', '.pdf', 20971520, 0, 1, 11),
    ('signed_lease', 'Signed Lease', 'Signed lease agreement from tenant', 'lease', '.pdf', 20971520, 0, 1, 12),
    ('other', 'Other Document', 'Other supporting documents', 'other', '.pdf,.jpg,.jpeg,.png,.doc,.docx', 20971520, 0, 1, 99);
END
GO

-- ============================================================================
-- MESSAGE TYPES TABLE (configurable message/conversation types)
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'MessageTypes' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.MessageTypes (
    Id NVARCHAR(450) NOT NULL PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Code NVARCHAR(50) NOT NULL,
    Description NVARCHAR(500) NULL,
    Icon NVARCHAR(100) NULL,
    Color NVARCHAR(50) NULL,
    IsActive BIT NOT NULL DEFAULT(1),
    AllowedRoles NVARCHAR(500) NULL,
    IsSystemType BIT NOT NULL DEFAULT(0),
    SortOrder INT NOT NULL DEFAULT(0),
    CreatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE()),
    UpdatedAt DATETIME2 NULL
);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_MessageTypes_Code')
BEGIN
    CREATE UNIQUE INDEX IX_MessageTypes_Code ON dbo.MessageTypes(Code);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_MessageTypes_IsActive')
BEGIN
    CREATE INDEX IX_MessageTypes_IsActive ON dbo.MessageTypes(IsActive);
END
GO

-- Seed default message types
IF NOT EXISTS (SELECT 1 FROM dbo.MessageTypes WHERE Code = 'Direct')
BEGIN
    INSERT INTO dbo.MessageTypes (Id, Name, Code, Description, Icon, Color, AllowedRoles, IsSystemType, SortOrder)
    VALUES 
    (NEWID(), 'Direct Message', 'Direct', 'One-to-one private conversation', 'MessageSquare', 'accent', 'admin,owner,manager,landlord,agent,tenant', 1, 1),
    (NEWID(), 'Announcement', 'Announcement', 'Broadcast announcements to tenants', 'Megaphone', 'blue-500', 'admin,owner,manager,landlord,agent', 1, 2),
    (NEWID(), 'Maintenance Notice', 'Maintenance', 'Maintenance-related communications', 'Wrench', 'warning', 'admin,owner,manager,landlord,agent,tenant', 1, 3),
    (NEWID(), 'Payment Reminder', 'PaymentReminder', 'Payment and billing reminders', 'CreditCard', 'orange-500', 'admin,owner,manager,landlord,agent', 1, 4),
    (NEWID(), 'Issue Report', 'Issue', 'Report problems or issues', 'AlertCircle', 'destructive', 'tenant', 1, 5),
    (NEWID(), 'System Notification', 'System', 'Automated system messages', 'Bell', 'muted', NULL, 1, 6);
END
GO