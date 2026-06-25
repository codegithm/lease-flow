import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText, Plus, Edit, Trash2, Copy, Building2 } from "lucide-react";

interface LeaseTemplate {
  id: string;
  name: string;
  description: string;
  isShared: boolean;
  unitId?: string;
  unitName?: string;
  content: string;
  createdAt: string;
}

const defaultTemplates: LeaseTemplate[] = [
  {
    id: "1",
    name: "Standard Residential Lease",
    description: "General lease agreement for residential properties",
    isShared: true,
    content: "RESIDENTIAL LEASE AGREEMENT\n\nThis Lease Agreement is made on {{LEASE_START_DATE}}, by and between:\n\nLANDLORD: {{LANDLORD_NAME}}\nAddress: {{LANDLORD_ADDRESS}}\n\nTENANT: {{TENANT_NAME}}\nEmail: {{TENANT_EMAIL}}\nPhone: {{TENANT_PHONE}}\n\nPROPERTY: {{UNIT_NAME}}\nAddress: {{UNIT_ADDRESS}}\n\n1. LEASE TERM\nThe lease shall begin on {{LEASE_START_DATE}} and end on {{LEASE_END_DATE}}.\n\n2. RENT\nMonthly rent: ${{MONTHLY_RENT}}\nDue date: {{RENT_DUE_DAY}} of each month\nSecurity deposit: ${{SECURITY_DEPOSIT}}\n\n3. UTILITIES\nThe following utilities are included: {{INCLUDED_UTILITIES}}\nTenant is responsible for: {{TENANT_UTILITIES}}\n\n4. OCCUPANTS\nThis property shall be occupied by {{TENANT_NAME}} and the following additional occupants: {{ADDITIONAL_OCCUPANTS}}\n\n5. PETS\n{{PET_POLICY}}\n\n6. MAINTENANCE\nTenant agrees to maintain the property in good condition and report any maintenance issues promptly.\n\n7. TERMINATION\nEither party may terminate this lease with {{NOTICE_PERIOD}} days written notice.\n\n8. SIGNATURES\n\nLandlord Signature: _________________________  Date: ____________\n\nTenant Signature: _________________________  Date: ____________",
    createdAt: "Dec 1, 2024",
  },
  {
    id: "2",
    name: "Short-Term Lease",
    description: "For leases under 6 months",
    isShared: true,
    content: "SHORT-TERM RESIDENTIAL LEASE\n\nLandlord: {{LANDLORD_NAME}}\nTenant: {{TENANT_NAME}}\nProperty: {{UNIT_NAME}}, {{UNIT_ADDRESS}}\n\nTerm: {{LEASE_START_DATE}} to {{LEASE_END_DATE}}\nMonthly Rent: ${{MONTHLY_RENT}}\nDeposit: ${{SECURITY_DEPOSIT}}\n\nThis is a short-term lease agreement. All standard residential terms apply.\n\nSignatures:\nLandlord: _________________________\nTenant: _________________________",
    createdAt: "Dec 5, 2024",
  },
];

interface LeaseTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate?: (template: LeaseTemplate) => void;
  unitId?: string;
  unitName?: string;
}

export function LeaseTemplateDialog({
  open,
  onOpenChange,
  onSelectTemplate,
  unitId,
  unitName,
}: LeaseTemplateDialogProps) {
  const [templates, setTemplates] = useState<LeaseTemplate[]>(defaultTemplates);
  const [activeTab, setActiveTab] = useState("select");
  const [editingTemplate, setEditingTemplate] = useState<LeaseTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    isShared: true,
    content: "",
  });

  const sharedTemplates = templates.filter((t) => t.isShared);
  const unitTemplates = templates.filter((t) => !t.isShared && t.unitId === unitId);

  const handleSelectTemplate = (template: LeaseTemplate) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
    onOpenChange(false);
    toast.success(`Selected template: ${template.name}`);
  };

  const handleCreateTemplate = () => {
    if (!newTemplate.name || !newTemplate.content) {
      toast.error("Please fill in all required fields");
      return;
    }

    const template: LeaseTemplate = {
      id: Date.now().toString(),
      name: newTemplate.name,
      description: newTemplate.description,
      isShared: newTemplate.isShared,
      unitId: newTemplate.isShared ? undefined : unitId,
      unitName: newTemplate.isShared ? undefined : unitName,
      content: newTemplate.content,
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };

    setTemplates([...templates, template]);
    setNewTemplate({ name: "", description: "", isShared: true, content: "" });
    setActiveTab("select");
    toast.success("Template created successfully");
  };

  const handleDuplicateTemplate = (template: LeaseTemplate) => {
    const duplicate: LeaseTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };
    setTemplates([...templates, duplicate]);
    toast.success("Template duplicated");
  };

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(templates.filter((t) => t.id !== templateId));
    toast.success("Template deleted");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            Lease Templates
          </DialogTitle>
          <DialogDescription>
            Select a shared template or create a unit-specific lease template
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="select">Select Template</TabsTrigger>
            <TabsTrigger value="create">Create New</TabsTrigger>
          </TabsList>

          <TabsContent value="select" className="space-y-6 mt-4">
            {/* Shared Templates */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent" />
                Shared Templates
              </h3>
              <div className="grid gap-3">
                {sharedTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="p-4 rounded-lg border border-border hover:border-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{template.name}</h4>
                          <Badge variant="secondary">Shared</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                        <p className="text-xs text-muted-foreground mt-2">Created: {template.createdAt}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDuplicateTemplate(template)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="accent"
                          size="sm"
                          onClick={() => handleSelectTemplate(template)}
                        >
                          Use Template
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Unit-Specific Templates */}
            {unitId && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-accent" />
                  {unitName || "Unit"} Templates
                </h3>
                {unitTemplates.length > 0 ? (
                  <div className="grid gap-3">
                    {unitTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="p-4 rounded-lg border border-border hover:border-accent/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{template.name}</h4>
                              <Badge variant="accent">Unit Specific</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTemplate(template.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="accent"
                              size="sm"
                              onClick={() => handleSelectTemplate(template)}
                            >
                              Use Template
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border border-dashed border-border rounded-lg">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No unit-specific templates yet</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setActiveTab("create")}
                      className="mt-2"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Create one
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="template-name">Template Name *</Label>
                <Input
                  id="template-name"
                  placeholder="e.g., Standard 12-Month Lease"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="template-description">Description</Label>
                <Input
                  id="template-description"
                  placeholder="Brief description of this template"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                />
              </div>

              {unitId && (
                <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div>
                    <Label>Template Scope</Label>
                    <p className="text-sm text-muted-foreground">
                      {newTemplate.isShared
                        ? "Available for all units"
                        : `Only for ${unitName || "this unit"}`}
                    </p>
                  </div>
                  <Switch
                    checked={!newTemplate.isShared}
                    onCheckedChange={(checked) =>
                      setNewTemplate({ ...newTemplate, isShared: !checked })
                    }
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="template-content">
                  Lease Content *
                  <span className="text-muted-foreground font-normal ml-2">
                    Use {"{{VARIABLE}}"} for dynamic fields
                  </span>
                </Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[
                    "TENANT_NAME",
                    "TENANT_EMAIL",
                    "TENANT_PHONE",
                    "UNIT_NAME",
                    "UNIT_ADDRESS",
                    "MONTHLY_RENT",
                    "SECURITY_DEPOSIT",
                    "LEASE_START_DATE",
                    "LEASE_END_DATE",
                    "LANDLORD_NAME",
                  ].map((variable) => (
                    <Badge
                      key={variable}
                      variant="secondary"
                      className="cursor-pointer text-xs"
                      onClick={() =>
                        setNewTemplate({
                          ...newTemplate,
                          content: newTemplate.content + `{{${variable}}}`,
                        })
                      }
                    >
                      {variable}
                    </Badge>
                  ))}
                </div>
                <Textarea
                  id="template-content"
                  placeholder="Enter your lease agreement content here..."
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                  className="min-h-[300px] font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActiveTab("select")}>
                Cancel
              </Button>
              <Button variant="accent" onClick={handleCreateTemplate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
