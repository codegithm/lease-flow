import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  MapPin,
  Check,
  ChevronsUpDown,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/use-currency";

interface Estate {
  id: string;
  name: string;
  address?: string;
  city?: string;
}

interface AddUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddUnitDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddUnitDialogProps) {
  const { currencySymbol } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [estates, setEstates] = useState<Estate[]>([]);
  const [estatesLoading, setEstatesLoading] = useState(false);
  const [estateSearch, setEstateSearch] = useState("");
  const [estatePopoverOpen, setEstatePopoverOpen] = useState(false);
  const [showNoEstatesDialog, setShowNoEstatesDialog] = useState(false);
  const [showCreateEstateDialog, setShowCreateEstateDialog] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    rent: "",
    bedrooms: "",
    bathrooms: "",
    sqft: "",
    status: "vacant",
    description: "",
    estateId: "",
    estateName: "",
  });

  const [newEstateData, setNewEstateData] = useState({
    name: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
  });

  // Load estates when dialog opens
  useEffect(() => {
    if (!open) return;
    loadEstates();
  }, [open]);

  const loadEstates = async () => {
    setEstatesLoading(true);
    try {
      const raw = localStorage.getItem("user");
      const user = raw ? JSON.parse(raw) : null;
      const api = await import("@/lib/api");

      const data = await api.getEstates({
        companyId: user?.companyId,
        companyName: user?.companyName,
      });

      setEstates(data || []);

      // Check if no estates exist
      if (data.length === 0) {
        setShowNoEstatesDialog(true);
      }
    } catch (err) {
      console.error("Failed to load estates", err);
      setEstates([]);
    } finally {
      setEstatesLoading(false);
    }
  };

  const handleEstateSelect = (estate: Estate) => {
    setFormData((prev) => ({
      ...prev,
      estateId: estate.id,
      estateName: estate.name,
    }));
    setEstatePopoverOpen(false);
  };

  const handleCreateEstate = async () => {
    if (!newEstateData.name) {
      toast.error("Please enter an estate name");
      return;
    }

    try {
      const raw = localStorage.getItem("user");
      const user = raw ? JSON.parse(raw) : null;
      const api = await import("@/lib/api");

      const created = await api.createEstate({
        name: newEstateData.name,
        address: newEstateData.address || undefined,
        city: newEstateData.city || undefined,
        province: newEstateData.province || undefined,
        postalCode: newEstateData.postalCode || undefined,
        companyId: user?.companyId,
        companyName: user?.companyName,
      });

      toast.success("Estate created successfully!");
      setShowCreateEstateDialog(false);
      setShowNoEstatesDialog(false);
      setNewEstateData({
        name: "",
        address: "",
        city: "",
        province: "",
        postalCode: "",
      });

      // Select the new estate
      setFormData((prev) => ({
        ...prev,
        estateId: created.id,
        estateName: created.name,
      }));

      // Reload estates list
      loadEstates();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create estate");
    }
  };

  const filteredEstates = estateSearch
    ? estates.filter(
        (e) =>
          e.name.toLowerCase().includes(estateSearch.toLowerCase()) ||
          e.address?.toLowerCase().includes(estateSearch.toLowerCase()) ||
          e.city?.toLowerCase().includes(estateSearch.toLowerCase())
      )
    : estates;

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.address || !formData.rent) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!formData.estateId) {
      toast.error("Please select an estate for this unit");
      return;
    }

    setIsSubmitting(true);
    try {
      const raw = localStorage.getItem("user");
      const user = raw ? JSON.parse(raw) : null;
      const api = await import("@/lib/api");
      const payload = {
        name: formData.name,
        address: formData.address,
        rent: parseFloat(formData.rent || "0"),
        status: formData.status,
        companyId: user?.companyId,
        companyName: user?.companyName,
        estateId: formData.estateId,
        estateName: formData.estateName,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms, 10) : null,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
        sqft: formData.sqft ? parseInt(formData.sqft, 10) : null,
        description: formData.description || null,
      };
      await api.createUnit(payload);
      toast.success("Unit added successfully!");
      setIsSubmitting(false);
      setFormData({
        name: "",
        address: "",
        rent: "",
        bedrooms: "",
        bathrooms: "",
        sqft: "",
        status: "vacant",
        description: "",
        estateId: "",
        estateName: "",
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add unit");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* No Estates Dialog */}
      <AlertDialog
        open={showNoEstatesDialog}
        onOpenChange={setShowNoEstatesDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent" />
              No Estates Found
            </AlertDialogTitle>
            <AlertDialogDescription>
              You need to create an estate before adding units. An estate
              represents a property complex or building where units are located.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowNoEstatesDialog(false);
                onOpenChange(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowNoEstatesDialog(false);
                setShowCreateEstateDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Estate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Estate Dialog */}
      <Dialog
        open={showCreateEstateDialog}
        onOpenChange={setShowCreateEstateDialog}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent" />
              Create New Estate
            </DialogTitle>
            <DialogDescription>
              Add a new estate/property complex to your portfolio.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="estate-name">Estate Name *</Label>
              <Input
                id="estate-name"
                placeholder="e.g., Sunset Gardens"
                value={newEstateData.name}
                onChange={(e) =>
                  setNewEstateData((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estate-address">Address</Label>
              <Input
                id="estate-address"
                placeholder="123 Main Street"
                value={newEstateData.address}
                onChange={(e) =>
                  setNewEstateData((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estate-city">City</Label>
                <Input
                  id="estate-city"
                  placeholder="Johannesburg"
                  value={newEstateData.city}
                  onChange={(e) =>
                    setNewEstateData((prev) => ({
                      ...prev,
                      city: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estate-province">Province</Label>
                <Input
                  id="estate-province"
                  placeholder="Gauteng"
                  value={newEstateData.province}
                  onChange={(e) =>
                    setNewEstateData((prev) => ({
                      ...prev,
                      province: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estate-postal">Postal Code</Label>
              <Input
                id="estate-postal"
                placeholder="2001"
                value={newEstateData.postalCode}
                onChange={(e) =>
                  setNewEstateData((prev) => ({
                    ...prev,
                    postalCode: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateEstateDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="accent" onClick={handleCreateEstate}>
              Create Estate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Add Unit Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Building2 className="h-5 w-5 text-accent" />
              Add New Unit
            </DialogTitle>
            <DialogDescription>
              Add a new property unit to your portfolio.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Estate Selection */}
            <div className="space-y-2">
              <Label>Estate *</Label>
              <div className="flex gap-2">
                <Popover
                  open={estatePopoverOpen}
                  onOpenChange={setEstatePopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={estatePopoverOpen}
                      className="flex-1 justify-between"
                    >
                      {formData.estateName || "Select estate..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search estates..."
                        value={estateSearch}
                        onValueChange={setEstateSearch}
                      />
                      <CommandList>
                        {estatesLoading ? (
                          <div className="py-6 text-center text-sm">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                            Loading estates...
                          </div>
                        ) : (
                          <>
                            <CommandEmpty>
                              No estates found.
                              <Button
                                variant="link"
                                className="mt-2"
                                onClick={() => {
                                  setEstatePopoverOpen(false);
                                  setShowCreateEstateDialog(true);
                                }}
                              >
                                Create new estate
                              </Button>
                            </CommandEmpty>
                            <CommandGroup>
                              {filteredEstates.map((estate) => (
                                <CommandItem
                                  key={estate.id}
                                  value={estate.id}
                                  onSelect={() => handleEstateSelect(estate)}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.estateId === estate.id
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <div>
                                    <div className="font-medium">
                                      {estate.name}
                                    </div>
                                    {estate.address && (
                                      <div className="text-xs text-muted-foreground">
                                        {estate.address}
                                        {estate.city ? `, ${estate.city}` : ""}
                                      </div>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowCreateEstateDialog(true)}
                  title="Create new estate"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Select the estate/property complex where this unit is located
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Unit Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Unit 4B"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vacant">Vacant</SelectItem>
                    <SelectItem value="occupied">Occupied</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Full Address *</Label>
              <Input
                id="address"
                placeholder="123 Main Street, City, State 12345"
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rent">Monthly Rent ({currencySymbol}) *</Label>
                <Input
                  id="rent"
                  type="number"
                  placeholder="6000"
                  value={formData.rent}
                  onChange={(e) => handleChange("rent", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sqft">Square Meters</Label>
                <Input
                  id="sqft"
                  type="number"
                  placeholder="85"
                  value={formData.sqft}
                  onChange={(e) => handleChange("sqft", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Select
                  value={formData.bedrooms}
                  onValueChange={(value) => handleChange("bedrooms", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Studio</SelectItem>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Select
                  value={formData.bathrooms}
                  onValueChange={(value) => handleChange("bathrooms", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="1.5">1.5</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="2.5">2.5</SelectItem>
                    <SelectItem value="3">3+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add details about amenities, features, etc."
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Unit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
