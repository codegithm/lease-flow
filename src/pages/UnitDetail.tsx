import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateApplicationLinkDialog } from "@/components/dialogs/CreateApplicationLinkDialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Bed,
  Bath,
  Square,
  Calendar,
  Users,
  DollarSign,
  Edit,
  Link2,
  FileText,
  History,
} from "lucide-react";

const statusConfig = {
  vacant: { label: "Vacant", variant: "vacant" as const },
  occupied: { label: "Occupied", variant: "occupied" as const },
  reserved: { label: "Reserved", variant: "reserved" as const },
  maintenance: { label: "Maintenance", variant: "maintenance" as const },
};

export default function UnitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showApplicationDialog, setShowApplicationDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [unit, setUnit] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);
      try {
        const api = await import("@/lib/api");
        const data = await api.getUnit(id);
        setUnit(data);
      } catch (err: any) {
        console.error("Failed to load unit", err);
        setError(err?.message || String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const effective = unit;
  const status =
    statusConfig[(effective?.status as keyof typeof statusConfig) || "vacant"];
  if (!unit)
    return (
      <DashboardLayout>
        <div className="py-12 text-center">Unit not found.</div>
      </DashboardLayout>
    );
  if (loading)
    return (
      <DashboardLayout>
        <div className="py-12 text-center">Loading unit...</div>
      </DashboardLayout>
    );

  if (error)
    return (
      <DashboardLayout>
        <div className="py-12 text-center text-destructive">
          Failed to load unit: {error}
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/units")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold">
              {effective.name}
            </h1>
            <div className="flex flex-col gap-2 text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{effective.address}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {effective.apartmentNumber && (
                  <span>Unit: {effective.apartmentNumber}</span>
                )}
                {effective.leaseStart && (
                  <span>
                    Lease Start:{" "}
                    {new Date(effective.leaseStart).toLocaleDateString()}
                  </span>
                )}
                {effective.leaseTerm && (
                  <span>Term: {effective.leaseTerm}</span>
                )}
              </div>
            </div>
          </div>
          <Badge variant={status.variant} className="text-sm px-3 py-1">
            {status.label}
          </Badge>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="overflow-hidden">
                <div className="relative h-[400px]">
                  <img
                    src={String((effective.images || [])[selectedImage] || "")}
                    alt={String(effective.name)}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <div className="flex gap-2 overflow-x-auto">
                    {(effective.images || []).map(
                      (img: string, index: number) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImage(index)}
                          className={`shrink-0 h-16 w-24 rounded-lg overflow-hidden border-2 transition-colors ${
                            selectedImage === index
                              ? "border-accent"
                              : "border-transparent"
                          }`}
                        >
                          <img
                            src={img}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </button>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Tabs defaultValue="details">
                <TabsList>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="history">Lease History</TabsTrigger>
                  <TabsTrigger value="applications">Applications</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="mt-4 space-y-6">
                  {/* Description */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">
                        {effective.description}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Amenities */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Amenities</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {(effective.amenities || []).map((amenity: string) => (
                          <Badge key={amenity} variant="secondary">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5 text-accent" />
                        Lease History
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {(effective.leaseHistory || []).map(
                          (lease: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-4 rounded-lg border border-border"
                            >
                              <div>
                                <p className="font-medium">{lease.tenant}</p>
                                <p className="text-sm text-muted-foreground">
                                  {lease.start} - {lease.end}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">
                                  ${lease.rent.toLocaleString()}/mo
                                </p>
                                <Button
                                  variant="link"
                                  size="sm"
                                  className="h-auto p-0"
                                >
                                  View Lease
                                </Button>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="applications" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-accent" />
                        Pending Applications (
                        {effective.pendingApplications || 0})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground mb-4">
                          {effective.pendingApplications || 0} pending
                          applications for this unit
                        </p>
                        <Button onClick={() => navigate("/applications")}>
                          View Applications
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center mb-6">
                    <p className="text-4xl font-bold">
                      $
                      {String(effective.rent).toLocaleString?.() ||
                        effective.rent}
                    </p>
                    <p className="text-muted-foreground">per month</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Security Deposit
                      </span>
                      <span className="font-medium">
                        $
                        {String(effective.deposit).toLocaleString?.() ||
                          effective.deposit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Available From
                      </span>
                      <span className="font-medium">
                        {effective.availableFrom}
                      </span>
                    </div>

                    {/* Dynamic breakdowns */}
                    {effective.packageBreakdown &&
                      Object.keys(effective.packageBreakdown).length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mt-4">
                            Monthly Charges
                          </h4>
                          <div className="mt-2 space-y-2">
                            {Object.entries(effective.packageBreakdown).map(
                              ([k, v]: any) => (
                                <div key={k} className="flex justify-between">
                                  <span className="text-muted-foreground">
                                    {k}
                                  </span>
                                  <span className="font-medium">
                                    ${Number(v).toLocaleString()}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {effective.initialChargesBreakdown &&
                      Object.keys(effective.initialChargesBreakdown).length >
                        0 && (
                        <div>
                          <h4 className="text-sm font-medium mt-4">
                            Initial Charges (one-time)
                          </h4>
                          <div className="mt-2 space-y-2">
                            {Object.entries(
                              effective.initialChargesBreakdown
                            ).map(([k, v]: any) => (
                              <div key={k} className="flex justify-between">
                                <span className="text-muted-foreground">
                                  {k}
                                </span>
                                <span className="font-medium">
                                  ${Number(v).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    {effective.fees && effective.fees.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mt-4">Fees</h4>
                        <div className="mt-2 space-y-2">
                          {effective.fees.map((f: any, i: number) => (
                            <div key={i} className="flex justify-between">
                              <span className="text-muted-foreground">
                                {f.name}
                              </span>
                              <span className="font-medium">
                                ${Number(f.amount).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Specs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Specifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Bed className="h-4 w-4" />
                      <span>Bedrooms</span>
                    </div>
                    <span className="font-medium">{effective.bedrooms}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Bath className="h-4 w-4" />
                      <span>Bathrooms</span>
                    </div>
                    <span className="font-medium">{effective.bathrooms}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Square className="h-4 w-4" />
                      <span>Square Feet</span>
                    </div>
                    <span className="font-medium">
                      {String(effective.sqft).toLocaleString?.() ||
                        effective.sqft}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="accent"
                    className="w-full"
                    onClick={() => setShowApplicationDialog(true)}
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    Create Application Link
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => toast.success("Opening lease generator...")}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Lease
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/units/${id}/edit`)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Unit
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      <CreateApplicationLinkDialog
        open={showApplicationDialog}
        onOpenChange={setShowApplicationDialog}
      />
    </DashboardLayout>
  );
}
