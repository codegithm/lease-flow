-- Authentication DB schema (idempotent)

IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'dbo')
BEGIN
    EXEC('CREATE SCHEMA dbo');
END
GO

-- Roles table (must be created before Users for FK)
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'Roles' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.Roles (
    Id INT NOT NULL PRIMARY KEY,
    Name NVARCHAR(50) NOT NULL,
    Description NVARCHAR(200) NULL,
    CanCreateCompany BIT NOT NULL DEFAULT(0),
    CanManageUsers BIT NOT NULL DEFAULT(0),
    CanApproveAccounts BIT NOT NULL DEFAULT(0),
    CreatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE())
);

-- Seed default roles
INSERT INTO dbo.Roles (Id, Name, Description, CanCreateCompany, CanManageUsers, CanApproveAccounts, CreatedAt)
VALUES 
    (1, 'tenant', 'Tenant - rents property', 0, 0, 0, GETUTCDATE()),
    (2, 'agent', 'Leasing Agent - handles applications', 0, 0, 0, GETUTCDATE()),
    (3, 'property_manager', 'Property Manager - manages properties', 1, 1, 1, GETUTCDATE()),
    (4, 'owner', 'Property Owner', 1, 1, 1, GETUTCDATE()),
    (5, 'landlord', 'Landlord - owns and manages properties', 1, 1, 1, GETUTCDATE()),
    (6, 'admin', 'Company Administrator', 1, 1, 1, GETUTCDATE());
END
GO

-- Unique index on role name
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'UQ_Roles_Name')
BEGIN
    CREATE UNIQUE INDEX UQ_Roles_Name ON dbo.Roles(Name);
END
GO

-- ApplicationLinks
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'ApplicationLinks' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.ApplicationLinks (
    Id NVARCHAR(450) NOT NULL PRIMARY KEY,
    FullName NVARCHAR(200) NOT NULL,
    CellNumber NVARCHAR(50) NOT NULL,
    UnitId NVARCHAR(450) NULL,
    AgentId NVARCHAR(450) NULL,
    IdNumber NVARCHAR(200) NULL,
    RequiresCreditCheck BIT NOT NULL DEFAULT(0),
    Status NVARCHAR(50) NOT NULL,
    CreatedAt DATETIME2 NOT NULL,
    UpdatedAt DATETIME2 NOT NULL,
    LinkUrl NVARCHAR(MAX) NOT NULL
);
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

-- Users
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'Users' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.Users (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    Email NVARCHAR(200) NOT NULL,
    PasswordHash NVARCHAR(MAX) NOT NULL,
    FullName NVARCHAR(200) NULL,
    CellNumber NVARCHAR(50) NULL,
    CompanyId NVARCHAR(450) NULL,
    RoleId INT NULL,
    Role NVARCHAR(50) NULL,
    Status INT NOT NULL DEFAULT(0),
    ApprovedAt DATETIME2 NULL,
    ApprovedBy UNIQUEIDENTIFIER NULL,
    CreatedAt DATETIME2 NOT NULL,
    UpdatedAt DATETIME2 NULL
);
END
GO

-- Ensure Role column exists for existing databases
IF COL_LENGTH('dbo.Users', 'Role') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD Role NVARCHAR(50) NULL;
END
GO

-- Ensure RoleId column exists for existing databases
IF COL_LENGTH('dbo.Users', 'RoleId') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD RoleId INT NULL;
END
GO

-- Ensure Status column exists for existing databases
IF COL_LENGTH('dbo.Users', 'Status') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD Status INT NOT NULL DEFAULT(0);
END
GO

-- Ensure ApprovedAt column exists for existing databases
IF COL_LENGTH('dbo.Users', 'ApprovedAt') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD ApprovedAt DATETIME2 NULL;
END
GO

-- Ensure ApprovedBy column exists for existing databases
IF COL_LENGTH('dbo.Users', 'ApprovedBy') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD ApprovedBy UNIQUEIDENTIFIER NULL;
END
GO

-- Ensure UpdatedAt column exists for existing databases
IF COL_LENGTH('dbo.Users', 'UpdatedAt') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD UpdatedAt DATETIME2 NULL;
END
GO

-- Companies
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'Companies' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.Companies (
    Id NVARCHAR(450) NOT NULL PRIMARY KEY,
    Name NVARCHAR(200) NOT NULL,
    Address NVARCHAR(500) NULL,
    CountryCode NVARCHAR(10) NOT NULL DEFAULT('ZA'),
    CreatedAt DATETIME2 NOT NULL
);
END
GO

-- Ensure CountryCode column exists for existing databases
IF COL_LENGTH('dbo.Companies', 'CountryCode') IS NULL
BEGIN
    ALTER TABLE dbo.Companies ADD CountryCode NVARCHAR(10) NOT NULL DEFAULT('ZA');
END
GO

-- Countries table (supported countries with currency info)
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'Countries' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.Countries (
    Code NVARCHAR(10) NOT NULL PRIMARY KEY, -- ISO 3166-1 alpha-2
    Name NVARCHAR(100) NOT NULL,
    CurrencyCode NVARCHAR(10) NOT NULL, -- ISO 4217
    CurrencySymbol NVARCHAR(10) NOT NULL,
    CurrencyName NVARCHAR(100) NOT NULL,
    IsSupported BIT NOT NULL DEFAULT(1),
    CreatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE())
);

-- Seed supported countries (only South Africa for now)
INSERT INTO dbo.Countries (Code, Name, CurrencyCode, CurrencySymbol, CurrencyName, IsSupported) VALUES
    ('ZA', 'South Africa', 'ZAR', 'R', 'South African Rand', 1);
    
-- Future countries (marked as not supported yet)
INSERT INTO dbo.Countries (Code, Name, CurrencyCode, CurrencySymbol, CurrencyName, IsSupported) VALUES
    ('US', 'United States', 'USD', '$', 'US Dollar', 0),
    ('GB', 'United Kingdom', 'GBP', '£', 'British Pound', 0),
    ('NG', 'Nigeria', 'NGN', '₦', 'Nigerian Naira', 0),
    ('KE', 'Kenya', 'KES', 'KSh', 'Kenyan Shilling', 0),
    ('GH', 'Ghana', 'GHS', 'GH₵', 'Ghanaian Cedi', 0);
END
GO

-- Ensure IdNumber column exists on ApplicationLinks for older DBs
IF COL_LENGTH('dbo.ApplicationLinks', 'IdNumber') IS NULL
BEGIN
    ALTER TABLE dbo.ApplicationLinks ADD IdNumber NVARCHAR(200) NULL;
END
GO

-- Ensure LeaseStartDate column exists on ApplicationLinks
IF COL_LENGTH('dbo.ApplicationLinks', 'LeaseStartDate') IS NULL
BEGIN
    ALTER TABLE dbo.ApplicationLinks ADD LeaseStartDate DATETIME2 NULL;
END
GO

-- Ensure LeaseDurationMonths column exists on ApplicationLinks
IF COL_LENGTH('dbo.ApplicationLinks', 'LeaseDurationMonths') IS NULL
BEGIN
    ALTER TABLE dbo.ApplicationLinks ADD LeaseDurationMonths INT NOT NULL DEFAULT(12);
END
GO

-- Indexes
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_ApplicationLinks_UnitId')
BEGIN
    CREATE INDEX IX_ApplicationLinks_UnitId ON dbo.ApplicationLinks(UnitId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_ApplicationLinks_AgentId')
BEGIN
    CREATE INDEX IX_ApplicationLinks_AgentId ON dbo.ApplicationLinks(AgentId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_ApplicationLinks_Status')
BEGIN
    CREATE INDEX IX_ApplicationLinks_Status ON dbo.ApplicationLinks(Status);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'UQ_Users_Email')
BEGIN
    CREATE UNIQUE INDEX UQ_Users_Email ON dbo.Users(Email);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Users_CompanyId')
BEGIN
    CREATE INDEX IX_Users_CompanyId ON dbo.Users(CompanyId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Users_RoleId')
BEGIN
    CREATE INDEX IX_Users_RoleId ON dbo.Users(RoleId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_Users_Status')
BEGIN
    CREATE INDEX IX_Users_Status ON dbo.Users(Status);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_OutboxMessages_CreatedAt')
BEGIN
    CREATE INDEX IX_OutboxMessages_CreatedAt ON dbo.OutboxMessages(CreatedAt);
END
GO

-- =============================================
-- PERMISSIONS SYSTEM
-- =============================================

-- Permissions table
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'Permissions' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.Permissions (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Code NVARCHAR(100) NOT NULL,
    Name NVARCHAR(200) NOT NULL,
    Description NVARCHAR(500) NULL,
    Category NVARCHAR(100) NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE())
);

-- Seed default permissions
INSERT INTO dbo.Permissions (Code, Name, Description, Category) VALUES
    -- Application permissions
    ('create_application_link', 'Create Application Links', 'Ability to create application links for prospective tenants', 'Applications'),
    ('view_applications', 'View Applications', 'Ability to view tenant applications', 'Applications'),
    ('review_applications', 'Review Applications', 'Ability to review and process applications', 'Applications'),
    ('approve_applications', 'Approve Applications', 'Ability to approve or reject applications', 'Applications'),
    -- Lease permissions
    ('generate_lease', 'Generate Lease', 'Ability to generate lease documents', 'Leases'),
    ('send_lease', 'Send Lease', 'Ability to send lease documents to tenants', 'Leases'),
    ('approve_lease', 'Approve Signed Lease', 'Ability to approve signed lease documents', 'Leases'),
    -- Unit permissions
    ('create_units', 'Create Units', 'Ability to create new property units', 'Units'),
    ('edit_units', 'Edit Units', 'Ability to edit existing property units', 'Units'),
    ('delete_units', 'Delete Units', 'Ability to delete property units', 'Units'),
    -- User management permissions
    ('view_users', 'View Users', 'Ability to view company users', 'Users'),
    ('invite_users', 'Invite Users', 'Ability to invite new users to the company', 'Users'),
    ('approve_users', 'Approve Users', 'Ability to approve pending user registrations', 'Users'),
    ('change_roles', 'Change Roles', 'Ability to change user roles', 'Users'),
    ('remove_users', 'Remove Users', 'Ability to remove users from the company', 'Users'),
    -- Configuration permissions
    ('manage_permissions', 'Manage Permissions', 'Ability to grant or restrict user permissions', 'Configuration'),
    ('view_settings', 'View Settings', 'Ability to view company settings', 'Configuration'),
    ('edit_company_settings', 'Edit Company Settings', 'Ability to edit company settings', 'Configuration'),
    -- Financial permissions
    ('view_financials', 'View Financials', 'Ability to view financial information', 'Financials'),
    ('manage_billing', 'Manage Billing', 'Ability to manage billing and payments', 'Financials');
END
GO

-- Unique index on permission code
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'UQ_Permissions_Code')
BEGIN
    CREATE UNIQUE INDEX UQ_Permissions_Code ON dbo.Permissions(Code);
END
GO

-- RolePermissions table (default permissions for each role)
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'RolePermissions' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.RolePermissions (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    RoleId INT NOT NULL,
    PermissionId INT NOT NULL,
    IsGranted BIT NOT NULL DEFAULT(1),
    CreatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE()),
    CONSTRAINT FK_RolePermissions_Roles FOREIGN KEY (RoleId) REFERENCES dbo.Roles(Id),
    CONSTRAINT FK_RolePermissions_Permissions FOREIGN KEY (PermissionId) REFERENCES dbo.Permissions(Id)
);

-- Seed default role permissions
-- Owner gets all permissions
INSERT INTO dbo.RolePermissions (RoleId, PermissionId, IsGranted)
SELECT 4, Id, 1 FROM dbo.Permissions;

-- Admin gets all permissions
INSERT INTO dbo.RolePermissions (RoleId, PermissionId, IsGranted)
SELECT 6, Id, 1 FROM dbo.Permissions;

-- Property Manager gets most permissions (except manage_permissions and manage_billing)
INSERT INTO dbo.RolePermissions (RoleId, PermissionId, IsGranted)
SELECT 3, Id, 1 FROM dbo.Permissions WHERE Code NOT IN ('manage_permissions', 'manage_billing');

-- Landlord gets most permissions
INSERT INTO dbo.RolePermissions (RoleId, PermissionId, IsGranted)
SELECT 5, Id, 1 FROM dbo.Permissions WHERE Code NOT IN ('manage_permissions');

-- Agent gets application and lease permissions
INSERT INTO dbo.RolePermissions (RoleId, PermissionId, IsGranted)
SELECT 2, Id, 1 FROM dbo.Permissions 
WHERE Code IN ('create_application_link', 'view_applications', 'review_applications', 
               'generate_lease', 'send_lease', 'view_settings', 'edit_units');

-- Tenant gets minimal permissions
INSERT INTO dbo.RolePermissions (RoleId, PermissionId, IsGranted)
SELECT 1, Id, 1 FROM dbo.Permissions WHERE Code IN ('view_settings');
END
GO

-- Unique constraint on RoleId + PermissionId
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'UQ_RolePermissions_RoleId_PermissionId')
BEGIN
    CREATE UNIQUE INDEX UQ_RolePermissions_RoleId_PermissionId ON dbo.RolePermissions(RoleId, PermissionId);
END
GO

-- UserPermissions table (user-specific permission overrides)
IF NOT EXISTS (SELECT * FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE t.name = 'UserPermissions' AND s.name = 'dbo')
BEGIN
CREATE TABLE dbo.UserPermissions (
    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    UserId UNIQUEIDENTIFIER NOT NULL,
    PermissionId INT NOT NULL,
    IsGranted BIT NOT NULL DEFAULT(1),
    GrantedByUserId UNIQUEIDENTIFIER NOT NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT(GETUTCDATE()),
    UpdatedAt DATETIME2 NULL,
    CONSTRAINT FK_UserPermissions_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(Id),
    CONSTRAINT FK_UserPermissions_Permissions FOREIGN KEY (PermissionId) REFERENCES dbo.Permissions(Id)
);
END
GO

-- Unique constraint on UserId + PermissionId
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'UQ_UserPermissions_UserId_PermissionId')
BEGIN
    CREATE UNIQUE INDEX UQ_UserPermissions_UserId_PermissionId ON dbo.UserPermissions(UserId, PermissionId);
END
GO

-- Index for fast lookups by UserId
IF NOT EXISTS (SELECT 1 FROM sys.indexes i WHERE i.name = 'IX_UserPermissions_UserId')
BEGIN
    CREATE INDEX IX_UserPermissions_UserId ON dbo.UserPermissions(UserId);
END
GO
