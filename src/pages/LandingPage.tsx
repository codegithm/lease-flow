import { motion } from "framer-motion";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Shield,
  Zap,
  FileSignature,
  CreditCard,
  Users,
  ArrowRight,
  Check,
  Home,
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";

const features = [
  {
    icon: Building2,
    title: "Unit Management",
    description:
      "Manage your entire portfolio with powerful tools for listings, occupancy tracking, and maintenance.",
  },
  {
    icon: Users,
    title: "Applicant Screening",
    description:
      "Automated credit checks, income verification, and risk assessment to find quality tenants.",
  },
  {
    icon: FileSignature,
    title: "Digital Leases",
    description:
      "Generate, customize, and e-sign leases in minutes. Full audit trail included.",
  },
  {
    icon: CreditCard,
    title: "Payment Processing",
    description:
      "Accept rent payments online with automated reminders and late fee handling.",
  },
  {
    icon: Shield,
    title: "Compliance & Security",
    description:
      "GDPR-compliant data handling with enterprise-grade encryption and access controls.",
  },
  {
    icon: Zap,
    title: "Automation",
    description:
      "Automate repetitive tasks from application intake to lease renewals.",
  },
];

const stats = [
  { value: "50K+", label: "Units Managed" },
  { value: "98%", label: "Occupancy Rate" },
  { value: "72hrs", label: "Avg. Time to Lease" },
  { value: "4.9/5", label: "Customer Rating" },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // If a registration query param is present on the root, forward to /apply
  const register = searchParams.get("register");
  useEffect(() => {
    if (register) {
      navigate(`/apply?register=${encodeURIComponent(register)}`, {
        replace: true,
      });
    }
  }, [register, navigate]);

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
              <Home className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="font-display text-xl font-bold">LeasePilot</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a
              href="#features"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              How It Works
            </a>
            <a
              href="#about"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              About
            </a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/signin">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button variant="accent">Get Started</Button>
            </Link>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden border-t border-border bg-background px-4 py-4"
          >
            <div className="flex flex-col gap-4">
              <a href="#features" className="text-sm font-medium">
                Features
              </a>
              <a href="#how-it-works" className="text-sm font-medium">
                How It Works
              </a>
              <a href="#about" className="text-sm font-medium">
                About
              </a>
              <hr className="border-border" />
              <Link to="/signin">
                <Button variant="outline" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button variant="accent" className="w-full">
                  Get Started
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero pt-32 pb-24">
        {/* Background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-accent/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm text-accent mb-6">
                <Zap className="h-4 w-4" />
                Now with AI-powered screening
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
                Property management,{" "}
                <span className="text-accent">simplified</span>
              </h1>

              <p className="text-lg text-white/70 mb-8 max-w-xl">
                The modern platform for landlords and property managers.
                Streamline applications, automate leases, and collect
                payments—all in one place.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/signup">
                  <Button variant="hero" size="xl" className="w-full sm:w-auto">
                    Get Started Free
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button variant="hero-outline" size="xl">
                    Learn More
                  </Button>
                </a>
              </div>

              <div className="mt-10 flex items-center gap-6 text-white/60 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-accent" />
                  Free to use
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-accent" />
                  Only 0.005% on payments
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-2 shadow-2xl">
                <div className="rounded-xl bg-background overflow-hidden">
                  <div className="h-8 bg-muted flex items-center gap-2 px-4">
                    <div className="h-3 w-3 rounded-full bg-destructive/50" />
                    <div className="h-3 w-3 rounded-full bg-warning/50" />
                    <div className="h-3 w-3 rounded-full bg-success/50" />
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                        <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                      </div>
                      <div className="h-8 w-20 bg-accent/20 rounded-lg" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="rounded-lg bg-muted p-4 space-y-2"
                        >
                          <div className="h-8 w-8 bg-accent/20 rounded-lg" />
                          <div className="h-3 w-full bg-muted-foreground/10 rounded" />
                          <div className="h-6 w-16 bg-foreground/10 rounded" />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="flex items-center gap-4 rounded-lg bg-muted/50 p-3"
                        >
                          <div className="h-10 w-10 bg-muted rounded-lg" />
                          <div className="flex-1 space-y-1">
                            <div className="h-3 w-32 bg-muted-foreground/20 rounded" />
                            <div className="h-2 w-24 bg-muted-foreground/10 rounded" />
                          </div>
                          <div className="h-6 w-16 bg-success/20 rounded-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating cards */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute -right-8 top-1/4 rounded-xl bg-background border border-border shadow-lg p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                    <Check className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Application Approved</p>
                    <p className="text-xs text-muted-foreground">Just now</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, delay: 1 }}
                className="absolute -left-8 bottom-1/4 rounded-xl bg-background border border-border shadow-lg p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Payment Received</p>
                    <p className="text-xs text-muted-foreground">$1,850.00</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-border bg-muted/30 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <p className="font-display text-3xl sm:text-4xl font-bold text-accent">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to manage properties
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From listing to lease signing, we've got every step covered with
              powerful automation and intuitive tools.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-lg hover:border-accent/30"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-hero">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to streamline your property management?
            </h2>
            <p className="text-lg text-white/70 mb-8">
              Join property managers across South Africa who trust LeasePilot to
              streamline their portfolio.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup">
                <Button variant="hero" size="xl">
                  Get Started Free
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/signin">
                <Button variant="hero-outline" size="xl">
                  Sign In
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                <Home className="h-4 w-4 text-accent-foreground" />
              </div>
              <span className="font-display text-lg font-bold">LeasePilot</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-foreground transition-colors">
                Contact
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 LeasePilot. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
