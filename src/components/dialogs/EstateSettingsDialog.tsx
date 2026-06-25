import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Building2,
  Upload,
  Trash2,
  Loader2,
  ImageIcon,
  Save,
  X,
} from "lucide-react";
import {
  getEstate,
  updateEstate,
  uploadEstateLogo,
  deleteEstateLogo,
  getEstateLogoUrl,
} from "@/lib/api";

interface Estate {
  id: string;
  name: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  logoUrl?: string;
  logoBlobName?: string;
}

interface EstateSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estateId: string;
  onSuccess?: () => void;
}

export function EstateSettingsDialog({
  open,
  onOpenChange,
  estateId,
  onSuccess,
}: EstateSettingsDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isDeletingLogo, setIsDeletingLogo] = useState(false);
  const [estate, setEstate] = useState<Estate | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    description: "",
    contactEmail: "",
    contactPhone: "",
  });

  useEffect(() => {
    if (open && estateId) {
      loadEstate();
    }
  }, [open, estateId]);

  const loadEstate = async () => {
    setIsLoading(true);
    try {
      const data = await getEstate(estateId);
      setEstate(data);
      setFormData({
        name: data.name || "",
        address: data.address || "",
        city: data.city || "",
        province: data.province || "",
        postalCode: data.postalCode || "",
        description: data.description || "",
        contactEmail: data.contactEmail || "",
        contactPhone: data.contactPhone || "",
      });
      // Set logo preview if exists
      if (data.logoUrl || data.logoBlobName) {
        setLogoPreview(data.logoUrl || getEstateLogoUrl(estateId));
      } else {
        setLogoPreview(null);
      }
    } catch (err: any) {
      console.error("Failed to load estate", err);
      toast.error(err?.message || "Failed to load estate details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error("Estate name is required");
      return;
    }

    setIsSaving(true);
    try {
      await updateEstate(estateId, {
        name: formData.name,
        address: formData.address || undefined,
        city: formData.city || undefined,
        province: formData.province || undefined,
        postalCode: formData.postalCode || undefined,
        description: formData.description || undefined,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
      });
      toast.success("Estate settings saved");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save estate settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/gif",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Please select an image file (PNG, JPEG, GIF, or WebP)");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be less than 5MB");
      return;
    }

    // Upload immediately
    handleLogoUpload(file);
  };

  const handleLogoUpload = async (file: File) => {
    setIsUploadingLogo(true);
    try {
      const result = await uploadEstateLogo(estateId, file);
      toast.success("Logo uploaded successfully");
      // Update preview with cache-busting query param
      setLogoPreview(`${result.logoUrl}?t=${Date.now()}`);
      setEstate((prev) =>
        prev
          ? { ...prev, logoUrl: result.logoUrl, logoBlobName: result.blobName }
          : prev,
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload logo");
    } finally {
      setIsUploadingLogo(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleLogoDelete = async () => {
    setIsDeletingLogo(true);
    try {
      await deleteEstateLogo(estateId);
      toast.success("Logo deleted");
      setLogoPreview(null);
      setEstate((prev) =>
        prev ? { ...prev, logoUrl: undefined, logoBlobName: undefined } : prev,
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete logo");
    } finally {
      setIsDeletingLogo(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const allowedTypes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/gif",
        "image/webp",
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Please select an image file (PNG, JPEG, GIF, or WebP)");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Logo must be less than 5MB");
        return;
      }
      handleLogoUpload(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Estate Settings
          </DialogTitle>
          <DialogDescription>
            Manage estate details and company branding for lease documents.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            {/* Logo Section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Company Logo</Label>
              <p className="text-xs text-muted-foreground">
                Upload your company logo to appear on lease documents.
                Recommended: 300x100px, PNG or JPEG.
              </p>

              <div
                className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploadingLogo ? (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Uploading...
                    </span>
                  </div>
                ) : logoPreview ? (
                  <div className="relative group">
                    <img
                      src={logoPreview}
                      alt="Company Logo"
                      className="max-h-24 mx-auto object-contain"
                      onError={() => setLogoPreview(null)}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        Replace
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLogoDelete();
                        }}
                        disabled={isDeletingLogo}
                      >
                        {isDeletingLogo ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    <div className="text-sm">
                      <span className="text-primary font-medium">
                        Click to upload
                      </span>{" "}
                      <span className="text-muted-foreground">
                        or drag and drop
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      PNG, JPEG, GIF, or WebP (max 5MB)
                    </span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Estate Details */}
            <div className="space-y-3 pt-2">
              <Label htmlFor="name">Estate Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g., Sunset Gardens"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="Street address"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="e.g., Cape Town"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Province</Label>
                <Input
                  id="province"
                  value={formData.province}
                  onChange={(e) => handleChange("province", e.target.value)}
                  placeholder="e.g., Western Cape"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                value={formData.postalCode}
                onChange={(e) => handleChange("postalCode", e.target.value)}
                placeholder="e.g., 8001"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => handleChange("contactEmail", e.target.value)}
                  placeholder="admin@estate.co.za"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => handleChange("contactPhone", e.target.value)}
                  placeholder="021 123 4567"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
