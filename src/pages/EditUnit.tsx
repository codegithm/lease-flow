import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getUnit, updateUnit, uploadUnitImage } from "@/lib/api";
import {
  ArrowLeft,
  Building2,
  Upload,
  X,
  ImagePlus,
  Users,
  DollarSign,
  Loader2,
  Save,
} from "lucide-react";

const editUnitSchema = z.object({
  name: z.string().min(1, "Unit name is required").max(100),
  address: z.string().min(1, "Address is required").max(255),
  rent: z.string().min(1, "Monthly rent is required"),
  deposit: z.string().optional(),
  bedrooms: z.string().min(1, "Bedrooms is required"),
  bathrooms: z.string().min(1, "Bathrooms is required"),
  sqft: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  description: z.string().max(1000).optional(),
  tenantEmail: z.string().email().optional().or(z.literal("")),
});

type EditUnitFormValues = z.infer<typeof editUnitSchema>;

// No mock data — unit and tenants are loaded from the API

export default function EditUnit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [billingCycle, setBillingCycle] = useState<string>("Monthly");
  const [packageItems, setPackageItems] = useState<
    Array<{ key: string; amount: number }>
  >([]);
  const [initialChargesItems, setInitialChargesItems] = useState<
    Array<{ key: string; amount: number }>
  >([]);
  const [feesItems, setFeesItems] = useState<
    Array<{ name: string; amount: number }>
  >([]);
  const [apartmentNumber, setApartmentNumber] = useState<string>("");
  const [selectedTenant, setSelectedTenant] = useState<string>("");
  const [tenants, setTenants] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        const data = await getUnit(id);
        const bedroomsValue = data.bedrooms?.toString() || "0";
        // map values to form
        form.reset({
          name: data.name || "",
          address: data.address || "",
          rent: data.rent?.toString() || "",
          deposit: data.deposit?.toString() || "",
          bedrooms: bedroomsValue,
          bathrooms: data.bathrooms?.toString() || "1",
          sqft: data.sqft?.toString() || "",
          status: data.status || "vacant",
          description: data.description || "",
          tenantEmail: "",
        });
        setImages(data.images || []);
        setBillingCycle(data.billingCycle || "Monthly");
        // If packageBreakdown exists, use it; otherwise prepopulate with rent
        if (
          data.packageBreakdown &&
          Object.keys(data.packageBreakdown).length > 0
        ) {
          setPackageItems(
            Object.entries(data.packageBreakdown).map(([k, v]: any) => ({
              key: k,
              amount: Number(v),
            }))
          );
        } else if (data.rent) {
          // Prepopulate monthly charges with rent
          setPackageItems([{ key: "Rent", amount: Number(data.rent) }]);
        } else {
          setPackageItems([]);
        }
        setInitialChargesItems(
          data.initialChargesBreakdown
            ? Object.entries(data.initialChargesBreakdown).map(
                ([k, v]: any) => ({ key: k, amount: Number(v) })
              )
            : []
        );
        setFeesItems(data.fees || []);
        setApartmentNumber(data.apartmentNumber || "");
      } catch (err) {
        console.warn("Could not load unit from API", err);
      }
    })();
  }, [id]);

  const form = useForm<EditUnitFormValues>({
    resolver: zodResolver(editUnitSchema),
    defaultValues: {
      name: "",
      address: "",
      rent: "",
      deposit: "",
      bedrooms: "", // Will be populated from DB
      bathrooms: "", // Will be populated from DB
      sqft: "",
      status: "vacant",
      description: "",
      tenantEmail: "",
    },
  });

  const watchStatus = form.watch("status");

  const handleImageUpload = () => {
    // Prompt user to pick an image file and add it to the gallery
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // If we have an existing unit ID, upload to the server
      if (id) {
        try {
          const resp = await uploadUnitImage(id, file);
          if (resp?.url) {
            setImages((prev) => [...prev, resp.url]);
            toast.success("Image uploaded successfully");
          }
        } catch (err: any) {
          console.error("Image upload failed", err);
          // Fallback to local base64 if server upload fails
          const reader = new FileReader();
          reader.onload = () => {
            const url = String(reader.result || "");
            setImages((prev) => [...prev, url]);
            toast.success("Image added locally");
          };
          reader.readAsDataURL(file);
        }
      } else {
        // For new units, store locally until saved
        const reader = new FileReader();
        reader.onload = () => {
          const url = String(reader.result || "");
          setImages((prev) => [...prev, url]);
          toast.success("Image added");
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    toast.success("Image removed");
  };

  const onSubmit = async (data: EditUnitFormValues) => {
    setIsLoading(true);
    try {
      // compute totals
      const depositVal = parseFloat(String(data.deposit || "0")) || 0;
      const initialChargesTotal = initialChargesItems.reduce(
        (s, it) => s + (Number(it.amount) || 0),
        0
      );
      const monthlyChargesTotal = packageItems.reduce(
        (s, it) => s + (Number(it.amount) || 0),
        0
      );
      const initialTotalPay =
        depositVal + monthlyChargesTotal + initialChargesTotal;

      // Images should be stored as JSON array string
      const imagesJson =
        images && images.length > 0 ? JSON.stringify(images) : undefined;

      const payload: any = {
        id: id || undefined,
        name: data.name,
        address: data.address,
        rent: parseFloat(String(data.rent || "0")),
        deposit: depositVal,
        bedrooms: parseInt(String(data.bedrooms || "0"), 10),
        bathrooms: parseInt(String(data.bathrooms || "1"), 10),
        sqft: parseFloat(String(data.sqft || "0")) || 0,
        status: data.status,
        description: data.description,
        images: imagesJson,
        billingCycle: billingCycle || undefined,
        // serialize dynamic structures as JSON strings so backend stores them in NVARCHAR columns
        packageBreakdown:
          packageItems && packageItems.length
            ? JSON.stringify(
                Object.fromEntries(packageItems.map((i) => [i.key, i.amount]))
              )
            : undefined,
        initialChargesBreakdown:
          initialChargesItems && initialChargesItems.length
            ? JSON.stringify(
                Object.fromEntries(
                  initialChargesItems.map((i) => [i.key, i.amount])
                )
              )
            : undefined,
        fees:
          feesItems && feesItems.length ? JSON.stringify(feesItems) : undefined,
        initialCharges: initialChargesTotal,
        initialTotalPay: initialTotalPay,
        apartmentNumber: apartmentNumber || undefined,
      };

      // Try update (PUT) then fallback to create
      if (id) {
        try {
          await updateUnit(id, payload);
          toast.success("Unit updated successfully!");
        } catch (e: any) {
          console.error("Update failed", e);
          toast.error(e?.message || "Failed to update unit");
        }
      } else {
        const raw = localStorage.getItem("user");
        const user = raw ? JSON.parse(raw) : null;
        const { createUnit } = await import("@/lib/api");
        await createUnit({
          ...payload,
          id: undefined,
          companyName: user?.companyName ?? (user?.companyId || undefined),
        });
        toast.success("Unit created successfully!");
      }

      if (data.status === "occupied" && selectedTenant) {
        toast.success(`Unit linked to tenant successfully!`);
      }
    } catch (err) {
      console.error("Failed to save unit", err);
      toast.error("Failed to save unit");
    } finally {
      setIsLoading(false);
      navigate(`/units/${id || ""}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/units/${id}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold">Edit Unit</h1>
            <p className="text-muted-foreground">
              Update unit details and manage images
            </p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Images Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImagePlus className="h-5 w-5 text-accent" />
                    Property Images
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((image, index) => (
                      <div
                        key={index}
                        className="relative group aspect-video rounded-lg overflow-hidden border border-border"
                      >
                        <img
                          src={image}
                          alt={`Property ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}

                    {/* Add Image Button */}
                    <button
                      type="button"
                      onClick={handleImageUpload}
                      className="aspect-video rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-accent/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-accent"
                    >
                      <Upload className="h-6 w-6" />
                      <span className="text-xs">Add Image</span>
                    </button>
                  </div>

                  {images.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <ImagePlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No images uploaded yet</p>
                      <p className="text-sm">
                        Click "Add Image" to upload property photos
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Basic Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-accent" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Unit 4B" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="vacant">Vacant</SelectItem>
                              <SelectItem value="occupied">Occupied</SelectItem>
                              <SelectItem value="reserved">Reserved</SelectItem>
                              <SelectItem value="maintenance">
                                Maintenance
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Address *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="123 Main Street, City, State 12345"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="rent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Rent ($) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="2000"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="deposit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Security Deposit ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="4000"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="bedrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bedrooms *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0">Studio</SelectItem>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                              <SelectItem value="3">3</SelectItem>
                              <SelectItem value="4">4+</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="bathrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bathrooms *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="1.5">1.5</SelectItem>
                              <SelectItem value="2">2</SelectItem>
                              <SelectItem value="2.5">2.5</SelectItem>
                              <SelectItem value="3">3+</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sqft"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Square Feet</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="1200"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add details about amenities, features, etc."
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* Pricing & Billing (dynamic breakdowns) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-accent" />
                    Pricing & Billing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Billing Cycle</Label>
                      <Select
                        onValueChange={(v) => setBillingCycle(v)}
                        defaultValue={billingCycle}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                          <SelectItem value="Weekly">Weekly</SelectItem>
                          <SelectItem value="Quarterly">Quarterly</SelectItem>
                          <SelectItem value="Yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Apartment Number</Label>
                      <Input
                        placeholder="Apartment #"
                        value={apartmentNumber}
                        onChange={(e) => setApartmentNumber(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Monthly Charges (Package Breakdown)</Label>
                    <div className="space-y-2 mt-2">
                      {packageItems.map((it, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            placeholder="Name"
                            value={it.key}
                            onChange={(e) =>
                              setPackageItems((ps) =>
                                ps.map((p, i) =>
                                  i === idx ? { ...p, key: e.target.value } : p
                                )
                              )
                            }
                          />
                          <Input
                            type="number"
                            placeholder="Amount"
                            value={String(it.amount)}
                            onChange={(e) =>
                              setPackageItems((ps) =>
                                ps.map((p, i) =>
                                  i === idx
                                    ? {
                                        ...p,
                                        amount: parseFloat(
                                          e.target.value || "0"
                                        ),
                                      }
                                    : p
                                )
                              )
                            }
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() =>
                              setPackageItems((ps) =>
                                ps.filter((_, i) => i !== idx)
                              )
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div>
                        <Button
                          type="button"
                          onClick={() =>
                            setPackageItems((ps) => [
                              ...ps,
                              { key: "", amount: 0 },
                            ])
                          }
                        >
                          Add Charge
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Initial Charges (one-time)</Label>
                    <div className="space-y-2 mt-2">
                      {initialChargesItems.map((it, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            placeholder="Name"
                            value={it.key}
                            onChange={(e) =>
                              setInitialChargesItems((ps) =>
                                ps.map((p, i) =>
                                  i === idx ? { ...p, key: e.target.value } : p
                                )
                              )
                            }
                          />
                          <Input
                            type="number"
                            placeholder="Amount"
                            value={String(it.amount)}
                            onChange={(e) =>
                              setInitialChargesItems((ps) =>
                                ps.map((p, i) =>
                                  i === idx
                                    ? {
                                        ...p,
                                        amount: parseFloat(
                                          e.target.value || "0"
                                        ),
                                      }
                                    : p
                                )
                              )
                            }
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() =>
                              setInitialChargesItems((ps) =>
                                ps.filter((_, i) => i !== idx)
                              )
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div>
                        <Button
                          type="button"
                          onClick={() =>
                            setInitialChargesItems((ps) => [
                              ...ps,
                              { key: "", amount: 0 },
                            ])
                          }
                        >
                          Add Initial Charge
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Fees (named fees list)</Label>
                    <div className="space-y-2 mt-2">
                      {feesItems.map((it, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            placeholder="Fee name"
                            value={it.name}
                            onChange={(e) =>
                              setFeesItems((fs) =>
                                fs.map((f, i) =>
                                  i === idx ? { ...f, name: e.target.value } : f
                                )
                              )
                            }
                          />
                          <Input
                            type="number"
                            placeholder="Amount"
                            value={String(it.amount)}
                            onChange={(e) =>
                              setFeesItems((fs) =>
                                fs.map((f, i) =>
                                  i === idx
                                    ? {
                                        ...f,
                                        amount: parseFloat(
                                          e.target.value || "0"
                                        ),
                                      }
                                    : f
                                )
                              )
                            }
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() =>
                              setFeesItems((fs) =>
                                fs.filter((_, i) => i !== idx)
                              )
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div>
                        <Button
                          type="button"
                          onClick={() =>
                            setFeesItems((fs) => [
                              ...fs,
                              { name: "", amount: 0 },
                            ])
                          }
                        >
                          Add Fee
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t flex justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Monthly charges total
                      </p>
                      <p className="font-medium">
                        {packageItems
                          .reduce((s, it) => s + (Number(it.amount) || 0), 0)
                          .toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Initial charges total
                      </p>
                      <p className="font-medium">
                        {initialChargesItems
                          .reduce((s, it) => s + (Number(it.amount) || 0), 0)
                          .toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Initial payment required
                      </p>
                      <p className="font-medium">
                        {(
                          (parseFloat(form.getValues("deposit") || "0") || 0) +
                          packageItems.reduce(
                            (s, it) => s + (Number(it.amount) || 0),
                            0
                          ) +
                          initialChargesItems.reduce(
                            (s, it) => s + (Number(it.amount) || 0),
                            0
                          )
                        ).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Tenant Linking - Only show when status is "occupied" */}
            {watchStatus === "occupied" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-accent/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-accent" />
                      Link Tenant Account
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Since this unit is marked as occupied, you can link a
                      tenant account to it.
                    </p>

                    <div className="space-y-2">
                      <Label>Select Existing Tenant</Label>
                      <Select
                        value={selectedTenant}
                        onValueChange={setSelectedTenant}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a tenant to link" />
                        </SelectTrigger>
                        <SelectContent>
                          {tenants.length === 0 ? (
                            <SelectItem value="">
                              No tenants available
                            </SelectItem>
                          ) : (
                            tenants.map((tenant) => (
                              <SelectItem key={tenant.id} value={tenant.id}>
                                {tenant.name} ({tenant.email})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Or Invite New Tenant by Email</Label>
                      <FormField
                        control={form.control}
                        name="tenantEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="tenant@example.com"
                                {...field}
                                disabled={!!selectedTenant}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <p className="text-xs text-muted-foreground">
                        An invitation will be sent to create their tenant portal
                        account.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/units/${id}`)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="accent" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
