import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Home,
  Target,
  Users,
  Shield,
  Zap,
  Award,
  ArrowRight,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const team = [
  {
    name: "Sarah Mitchell",
    role: "CEO & Co-Founder",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
  },
  {
    name: "David Chen",
    role: "CTO & Co-Founder",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
  },
  {
    name: "Emily Rodriguez",
    role: "Head of Product",
    image:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
  },
  {
    name: "Marcus Johnson",
    role: "Head of Engineering",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
  },
];

const values = [
  {
    icon: Target,
    title: "Mission-Driven",
    description:
      "We're on a mission to simplify property management for everyone, from individual landlords to enterprise portfolios.",
  },
  {
    icon: Users,
    title: "Customer-Centric",
    description:
      "Our customers are at the heart of every decision we make. We build what you need, not what we think you need.",
  },
  {
    icon: Shield,
    title: "Trust & Security",
    description:
      "We handle sensitive data with the utmost care. Enterprise-grade security is built into everything we do.",
  },
  {
    icon: Zap,
    title: "Innovation",
    description:
      "We constantly push the boundaries of what's possible in property technology with AI and automation.",
  },
];

export default function About() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <Link
              to="/#features"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              to="/#how-it-works"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              How It Works
            </Link>
            <Link
              to="/about"
              className="text-sm font-medium text-foreground transition-colors"
            >
              About
            </Link>
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

        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden border-t border-border bg-background px-4 py-4"
          >
            <div className="flex flex-col gap-4">
              <Link to="/#features" className="text-sm font-medium">
                Features
              </Link>
              <Link to="/#how-it-works" className="text-sm font-medium">
                How It Works
              </Link>
              <Link to="/about" className="text-sm font-medium">
                About
              </Link>
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

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero pt-32 pb-24">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-accent/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              About <span className="text-accent">LeasePilot</span>
            </h1>
            <p className="text-lg text-white/70 mb-8 max-w-2xl mx-auto">
              We're building the future of property management. Our mission is
              to help landlords and property managers save time, reduce costs,
              and provide better experiences for tenants.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-display text-3xl sm:text-4xl font-bold mb-6">
                Our Story
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  LeasePilot was born out of frustration. Our founders,
                  experienced property managers themselves, were tired of
                  juggling multiple tools, spreadsheets, and paper processes to
                  manage their portfolios.
                </p>
                <p>
                  In 2020, they set out to build the platform they wished
                  existed—one that brings every aspect of property management
                  into a single, intuitive interface.
                </p>
                <p>
                  Today, LeasePilot helps thousands of property managers across
                  the country manage over 50,000 units with an average occupancy
                  rate of 98%.
                </p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <Card className="bg-accent/10 border-accent/20">
                    <CardContent className="p-6 text-center">
                      <p className="font-display text-4xl font-bold text-accent">
                        50K+
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Units Managed
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="font-display text-4xl font-bold">98%</p>
                      <p className="text-sm text-muted-foreground">
                        Occupancy Rate
                      </p>
                    </CardContent>
                  </Card>
                </div>
                <div className="space-y-4 mt-8">
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="font-display text-4xl font-bold">5K+</p>
                      <p className="text-sm text-muted-foreground">
                        Happy Customers
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-accent/10 border-accent/20">
                    <CardContent className="p-6 text-center">
                      <p className="font-display text-4xl font-bold text-accent">
                        72hrs
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Avg. Time to Lease
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Our Values
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              These principles guide everything we do at LeasePilot.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                      <value.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-display text-lg font-semibold mb-2">
                      {value.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
              Meet the Team
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The people behind LeasePilot who are passionate about transforming
              property management.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="mb-4 inline-block rounded-full p-1 bg-gradient-to-r from-accent to-accent/50">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="h-32 w-32 rounded-full object-cover"
                  />
                </div>
                <h3 className="font-display text-lg font-semibold">
                  {member.name}
                </h3>
                <p className="text-sm text-muted-foreground">{member.role}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-hero">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Award className="h-12 w-12 text-accent mx-auto mb-6" />
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
              Join property managers across South Africa
            </h2>
            <p className="text-lg text-white/70 mb-8">
              Get started free today. We only charge 0.005% on rent payments
              collected.
            </p>
            <Link to="/signup">
              <Button variant="hero" size="xl">
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
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
              <Link
                to="/about"
                className="hover:text-foreground transition-colors"
              >
                About
              </Link>
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
