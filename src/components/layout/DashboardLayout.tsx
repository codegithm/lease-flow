import { ReactNode } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { motion } from "framer-motion";
import { SidebarProvider, useSidebar } from "./SidebarContext";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

function DashboardContent({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={cn(
        "min-h-screen pt-20 px-4 pb-4 lg:pt-8 lg:px-8 lg:pb-8 transition-all duration-300",
        collapsed ? "lg:ml-20" : "lg:ml-64"
      )}
    >
      {children}
    </motion.main>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        <DashboardSidebar />
        <DashboardContent>{children}</DashboardContent>
      </div>
    </SidebarProvider>
  );
}
