import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddUnitDialog } from "@/components/dialogs/AddUnitDialog";
import { getUnits } from "@/lib/api";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Search,
  Filter,
  MapPin,
  Bed,
  Bath,
  Square,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UnitStatus = "vacant" | "occupied" | "reserved" | "maintenance";

interface Unit {
  id: number;
  name: string;
  address: string;
  rent: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  status: UnitStatus;
  image: string;
}

// demo units removed — frontend now loads units from API

const statusConfig: Record<
  UnitStatus,
  { label: string; variant: "vacant" | "occupied" | "reserved" | "maintenance" }
> = {
  vacant: { label: "Vacant", variant: "vacant" },
  occupied: { label: "Occupied", variant: "occupied" },
  reserved: { label: "Reserved", variant: "reserved" },
  maintenance: { label: "Maintenance", variant: "maintenance" },
};

export default function Units() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const resp = await getUnits();
        if (Array.isArray(resp)) setItems(resp);
        else setItems([]);
      } catch (e) {
        console.error("Failed to fetch units from API", e);
        setItems([]);
        toast.error("Failed to load units");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredUnits = items.filter((unit: any) => {
    const matchesSearch =
      (unit.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (unit.address || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || unit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Units</h1>
            <p className="text-muted-foreground">
              Manage your property portfolio
            </p>
          </div>
          <Button variant="accent" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Unit
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search units..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="vacant">Vacant</SelectItem>
              <SelectItem value="occupied">Occupied</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(statusConfig).map(([status, config]) => {
            const count = items.filter((u) => u.status === status).length;
            return (
              <Card
                key={status}
                className="cursor-pointer hover:border-accent/50 transition-colors"
                onClick={() => setStatusFilter(status)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {config.label}
                      </p>
                      <p className="text-2xl font-bold">{count}</p>
                    </div>
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Units Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUnits.map((unit, index) => (
            <motion.div
              key={unit.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="group overflow-hidden hover:shadow-lg transition-all hover:border-accent/30">
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={
                      unit.image ||
                      "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
                    }
                    alt={unit.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge variant={statusConfig[unit.status].variant}>
                      {statusConfig[unit.status].label}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute top-3 right-3 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => navigate(`/units/${unit.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate(`/units/${unit.id}/edit`)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Unit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => toast.error("Unit deleted.")}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg">{unit.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{unit.address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Bed className="h-4 w-4" />
                      <span>{unit.bedrooms}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath className="h-4 w-4" />
                      <span>{unit.bathrooms}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Square className="h-4 w-4" />
                      <span>{unit.sqft} sqft</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div>
                      <p className="text-2xl font-bold">
                        ${unit.rent.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">/month</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/units/${unit.id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filteredUnits.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No units found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>

      <AddUnitDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={async () => {
          try {
            const resp = await getUnits();
            if (Array.isArray(resp)) setItems(resp);
          } catch (e) {
            console.error("Failed to refresh units", e);
          }
        }}
      />
    </DashboardLayout>
  );
}
