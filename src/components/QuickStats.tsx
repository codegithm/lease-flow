import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Home,
  FileText,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCard {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  accentColor?: string;
}

interface QuickStatsProps {
  stats?: StatCard[];
}

const defaultStats: StatCard[] = [
  {
    title: "Monthly Revenue",
    value: "R 125,450",
    change: 12.5,
    changeLabel: "vs last month",
    icon: DollarSign,
    trend: 'up',
  },
  {
    title: "Active Tenants",
    value: 48,
    change: 3,
    changeLabel: "new this month",
    icon: Users,
    trend: 'up',
  },
  {
    title: "Occupancy Rate",
    value: "94%",
    change: -2,
    changeLabel: "vs last month",
    icon: Home,
    trend: 'down',
  },
  {
    title: "Pending Applications",
    value: 7,
    icon: FileText,
    trend: 'neutral',
  },
  {
    title: "Outstanding Balance",
    value: "R 15,200",
    change: -8.3,
    changeLabel: "vs last month",
    icon: AlertTriangle,
    trend: 'down',
  },
  {
    title: "Avg Days to Lease",
    value: "4.2",
    change: -1.5,
    changeLabel: "days faster",
    icon: Clock,
    trend: 'up',
  },
];

export function QuickStats({ stats = defaultStats }: QuickStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const isPositive = stat.trend === 'up';
        const isNegative = stat.trend === 'down';
        
        return (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center",
                    isPositive ? "bg-success/10 text-success" :
                    isNegative ? "bg-destructive/10 text-destructive" :
                    "bg-accent/10 text-accent"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {stat.change !== undefined && (
                    <div className={cn(
                      "flex items-center gap-1 text-xs font-medium",
                      isPositive ? "text-success" : isNegative ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {isPositive ? <TrendingUp className="h-3 w-3" /> : 
                       isNegative ? <TrendingDown className="h-3 w-3" /> : null}
                      {Math.abs(stat.change)}%
                    </div>
                  )}
                </div>
                <p className="text-2xl font-bold mb-0.5">{stat.value}</p>
                <p className="text-xs text-muted-foreground truncate">{stat.title}</p>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
