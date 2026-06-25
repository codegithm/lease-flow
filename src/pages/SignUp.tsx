import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Home, Eye, EyeOff, Loader2, Check, X, Globe } from "lucide-react";
import { buildAppUser, persistLegacyAuthSession } from "@/lib/auth";
import { getSupportedCountries } from "@/lib/api";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const signUpSchema = z
  .object({
    firstName: z
      .string()
      .min(2, { message: "First name must be at least 2 characters" })
      .max(50, { message: "First name must be less than 50 characters" })
      .regex(/^[a-zA-Z\s'-]+$/, {
        message:
          "First name can only contain letters, spaces, hyphens and apostrophes",
      }),
    lastName: z
      .string()
      .min(2, { message: "Last name must be at least 2 characters" })
      .max(50, { message: "Last name must be less than 50 characters" })
      .regex(/^[a-zA-Z\s'-]+$/, {
        message:
          "Last name can only contain letters, spaces, hyphens and apostrophes",
      }),
    email: z
      .string()
      .email({ message: "Please enter a valid email address" })
      .max(255, { message: "Email must be less than 255 characters" }),
    phone: z
      .string()
      .min(10, { message: "Phone number must be at least 10 digits" })
      .max(20, { message: "Phone number must be less than 20 characters" })
      .regex(/^[\d\s\-+()]+$/, {
        message: "Please enter a valid phone number",
      }),
    companyMode: z.enum(["existing", "new"]),
    companyId: z.string().optional(),
    newCompanyName: z.string().optional(),
    newCompanyAddress: z.string().optional(),
    countryCode: z.string().min(2, { message: "Please select your country" }),
    role: z.string().min(1, { message: "Please select your role" }),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" })
      .regex(/[A-Z]/, {
        message: "Password must contain at least one uppercase letter",
      })
      .regex(/[a-z]/, {
        message: "Password must contain at least one lowercase letter",
      })
      .regex(/[0-9]/, { message: "Password must contain at least one number" })
      .regex(/[^A-Za-z0-9]/, {
        message: "Password must contain at least one special character",
      }),
    confirmPassword: z.string(),
    terms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms and conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .superRefine((data, ctx) => {
    if (data.companyMode === "existing") {
      const companyId = data.companyId?.trim() || "";
      if (!companyId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Company ID is required",
          path: ["companyId"],
        });
      } else if (!z.string().uuid().safeParse(companyId).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Company ID must be a valid UUID",
          path: ["companyId"],
        });
      }
      return;
    }

    const name = data.newCompanyName?.trim() || "";
    if (!name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company name is required when creating a new company",
        path: ["newCompanyName"],
      });
    } else if (name.length < 2 || name.length > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company name must be between 2 and 100 characters",
        path: ["newCompanyName"],
      });
    }

    const location = data.newCompanyAddress?.trim() || "";
    if (!location) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company location is required when creating a new company",
        path: ["newCompanyAddress"],
      });
    } else if (location.length > 250) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company location must be less than 250 characters",
        path: ["newCompanyAddress"],
      });
    }
  });

type SignUpFormValues = z.infer<typeof signUpSchema>;

function formatSignUpError(error: unknown) {
  const payload =
    typeof error === "object" && error !== null
      ? (error as { code?: unknown; message?: unknown })
      : {};
  const code = String(payload.code || "").toLowerCase();
  const message = String(payload.message || "").toLowerCase();

  if (code === "over_email_send_rate_limit") {
    return "Too many sign-up emails were sent. Wait a few minutes, then try again. If this is local testing, disable email confirmation in Supabase Auth settings.";
  }

  if (
    code === "user_already_exists" ||
    message.includes("already registered")
  ) {
    return "This email is already registered. Sign in instead, or use password reset.";
  }

  if (message.includes("invalid login credentials")) {
    return "Invalid credentials for signup request. Please double-check your email and password.";
  }

  if (message.includes("company id") && message.includes("does not exist")) {
    return "The company ID you entered was not found. Check the ID or create a new company.";
  }

  if (message.includes("invalid company id format")) {
    return "Company ID format is invalid. Use the exact UUID shown for your company.";
  }

  if (message.includes("company location is required")) {
    return "Company location is required when creating a new company.";
  }

  return String(payload.message || "Registration failed");
}

const passwordRequirements = [
  { label: "At least 8 characters", regex: /.{8,}/ },
  { label: "One uppercase letter", regex: /[A-Z]/ },
  { label: "One lowercase letter", regex: /[a-z]/ },
  { label: "One number", regex: /[0-9]/ },
  { label: "One special character", regex: /[^A-Za-z0-9]/ },
];

export default function SignUp() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [countries, setCountries] = useState<
    { code: string; name: string; currencySymbol: string }[]
  >([]);
  const [countriesLoading, setCountriesLoading] = useState(true);

  useEffect(() => {
    const loadCountries = async () => {
      try {
        const data = await getSupportedCountries();
        setCountries(data || []);
      } catch (error) {
        console.warn("Failed to load countries from Supabase", error);
        setCountries([]);
      } finally {
        setCountriesLoading(false);
      }
    };

    void loadCountries();
  }, []);

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      companyMode: "existing",
      companyId: "",
      newCompanyName: "",
      newCompanyAddress: "",
      countryCode: "ZA",
      role: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

  const password = form.watch("password");
  const companyMode = form.watch("companyMode");

  const onSubmit = async (data: SignUpFormValues) => {
    setIsLoading(true);
    try {
      if (!isSupabaseConfigured) {
        throw new Error(
          "Supabase environment variables are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
        );
      }

      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo:
            import.meta.env.VITE_SUPABASE_REDIRECT_URL ||
            `${window.location.origin}/signin`,
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            fullName: `${data.firstName} ${data.lastName}`,
            phone: data.phone,
            cellNumber: data.phone,
            companyId:
              data.companyMode === "existing"
                ? data.companyId?.trim()
                : undefined,
            companyName:
              data.companyMode === "new"
                ? data.newCompanyName?.trim()
                : undefined,
            companyAddress:
              data.companyMode === "new"
                ? data.newCompanyAddress?.trim() || undefined
                : undefined,
            countryCode: data.countryCode,
            role: data.role,
            status: "active",
          },
        },
      });

      if (error) {
        throw error;
      }

      if (authData.session && authData.user) {
        persistLegacyAuthSession(authData.session);
        const appUser = buildAppUser(
          authData.user,
          authData.session.access_token,
        );
        toast.success("Account created successfully! Welcome to LeaseFlow.");
        navigate(
          appUser.role === "tenant"
            ? `/tenant-portal/${appUser.id}`
            : "/dashboard",
        );
        return;
      }

      toast.success("Account created. Check your email to confirm it.", {
        duration: 6000,
      });
      navigate(`/signup/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (err: unknown) {
      toast.error(formatSignUpError(err), { duration: 7000 });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4 py-12">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 h-[800px] w-[800px] rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 h-[600px] w-[600px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg"
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
            <CardTitle className="font-display text-2xl">
              Create your account
            </CardTitle>
            <CardDescription>
              Start managing your properties smarter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+1 (555) 000-0000"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="companyMode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Registration *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="How should we assign your company?" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="existing">
                            Join an existing company using Company ID
                          </SelectItem>
                          <SelectItem value="new">
                            Create a new company
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {companyMode === "existing" ? (
                  <FormField
                    control={form.control}
                    name="companyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company ID *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. 61d2f9e4-12ab-4b66-9551-8f8e104f8f2d"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">
                          This ID is verified during registration. Ask your
                          company admin to share it.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <>
                    <FormField
                      control={form.control}
                      name="newCompanyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Company Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Your Property Management Company"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="newCompanyAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Location *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="City, suburb, or business location"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <FormField
                  control={form.control}
                  name="countryCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={countriesLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                            <SelectValue
                              placeholder={
                                countriesLoading
                                  ? "Loading..."
                                  : "Select your country"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.name} ({country.currencySymbol})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        This determines the currency used for your properties
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Role *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="landlord">
                            Landlord / Owner
                          </SelectItem>
                          <SelectItem value="property_manager">
                            Property Manager
                          </SelectItem>
                          <SelectItem value="agent">Leasing Agent</SelectItem>
                          <SelectItem value="admin">Company Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password Requirements */}
                {password && (
                  <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Password requirements:
                    </p>
                    {passwordRequirements.map((req) => {
                      const isMet = req.regex.test(password);
                      return (
                        <div
                          key={req.label}
                          className="flex items-center gap-2 text-xs"
                        >
                          {isMet ? (
                            <Check className="h-3 w-3 text-success" />
                          ) : (
                            <X className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span
                            className={
                              isMet ? "text-success" : "text-muted-foreground"
                            }
                          >
                            {req.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="terms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal">
                          I agree to the{" "}
                          <a href="#" className="text-accent hover:underline">
                            Terms of Service
                          </a>{" "}
                          and{" "}
                          <a href="#" className="text-accent hover:underline">
                            Privacy Policy
                          </a>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  variant="accent"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/signin"
                className="text-accent hover:underline font-medium"
              >
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-white/50 mt-6">
          <Link to="/" className="hover:text-white/70 transition-colors">
            ← Back to home
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
