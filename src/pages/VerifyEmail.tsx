import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Home, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const [email, setEmail] = useState(initialEmail);
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    const safeEmail = email.trim();
    if (!safeEmail) {
      toast.error("Please enter your email address first.");
      return;
    }

    if (!isSupabaseConfigured) {
      toast.error(
        "Supabase environment variables are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
      );
      return;
    }

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: safeEmail,
        options: {
          emailRedirectTo:
            import.meta.env.VITE_SUPABASE_REDIRECT_URL ||
            `${window.location.origin}/signin`,
        },
      });

      if (error) {
        throw error;
      }

      toast.success("Confirmation email resent. Check your inbox.", {
        duration: 6000,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Failed to resend confirmation email.";
      toast.error(message, {
        duration: 7000,
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
              <Home className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="font-display text-2xl font-bold text-white">
              LeasePilot
            </span>
          </Link>
        </div>

        <Card className="border-white/10 bg-background/95 backdrop-blur-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
              <MailCheck className="h-6 w-6 text-accent" />
            </div>
            <CardTitle className="font-display text-2xl">
              Confirm Your Email
            </CardTitle>
            <CardDescription>
              We sent a confirmation link to your email. Open it to activate
              your account, then sign in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button
              type="button"
              variant="accent"
              className="w-full"
              onClick={handleResend}
              disabled={isResending}
            >
              {isResending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resending...
                </>
              ) : (
                "Resend Confirmation Email"
              )}
            </Button>

            <div className="pt-2 text-center text-sm text-muted-foreground">
              Already confirmed?{" "}
              <Link to="/signin" className="text-accent hover:underline">
                Go to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
