/// <reference path="../types.d.ts" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ProfileRow = {
  id: string;
  role: string | null;
  company_id: string | null;
};

type InitializePaymentRequest = {
  chargeId?: string | null;
  additionalChargeIds?: string[];
  paymentType?: "rent" | "additional_charges" | "mixed";
  billingMonths?: string[];
  amountInCents?: number;
  paymentMethod?: string;
  callbackUrl?: string;
};

function jsonResponse(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function toReference() {
  return `pay_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

async function initializePaystack(options: {
  apiUrl: string;
  secretKey: string;
  callbackUrl: string;
  amountInCents: number;
  email: string;
  reference: string;
  metadata: Record<string, unknown>;
}) {
  const response = await fetch(
    `${options.apiUrl.replace(/\/$/, "")}/transaction/initialize`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: options.amountInCents,
        email: options.email,
        reference: options.reference,
        callback_url: options.callbackUrl,
        metadata: options.metadata,
        currency: String(Deno.env.get("PAYSTACK_CURRENCY") || "ZAR"),
      }),
    },
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload?.status || !payload?.data?.authorization_url) {
    return {
      ok: false,
      error: payload?.message || "Paystack initialize failed.",
    };
  }

  return {
    ok: true,
    authorizationUrl: String(payload.data.authorization_url),
    providerReference: String(payload.data.reference || options.reference),
    raw: payload,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse(500, {
        error: "Missing Supabase environment variables for function runtime.",
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return jsonResponse(401, { error: "Missing bearer token." });
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
      auth: {
        persistSession: false,
      },
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(401, { error: "Unauthorized caller." });
    }

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, role, company_id")
      .eq("id", user.id)
      .single();

    const typedProfile = profile as ProfileRow | null;

    if (profileError || !typedProfile) {
      return jsonResponse(403, { error: "Caller profile not found." });
    }

    const body = (await req
      .json()
      .catch(() => ({}))) as InitializePaymentRequest;
    const amountInCents = Number(body?.amountInCents || 0);
    const additionalChargeIds = Array.isArray(body?.additionalChargeIds)
      ? body.additionalChargeIds.filter(Boolean)
      : [];
    const billingMonths = Array.isArray(body?.billingMonths)
      ? body.billingMonths.filter(Boolean)
      : [];
    const paymentTypeRaw = String(body?.paymentType || "").trim();
    const paymentType = (paymentTypeRaw || "additional_charges") as
      | "rent"
      | "additional_charges"
      | "mixed";
    const paymentMethod = String(body?.paymentMethod || "card");

    if (!["rent", "additional_charges", "mixed"].includes(paymentType)) {
      return jsonResponse(400, {
        error: "paymentType must be one of: rent, additional_charges, mixed.",
      });
    }

    if (!Number.isFinite(amountInCents) || amountInCents <= 0) {
      return jsonResponse(400, {
        error: "amountInCents must be a positive number.",
      });
    }

    const reference = toReference();
    const amount = amountInCents / 100;

    const { error: insertError } = await adminClient
      .from("tenant_payments")
      .insert({
        company_id: typedProfile.company_id,
        tenant_user_id: typedProfile.id,
        reference,
        amount,
        payment_method: paymentMethod,
        status: "initialized",
        additional_charge_ids: JSON.stringify(additionalChargeIds),
      });

    if (insertError) {
      return jsonResponse(500, {
        error: "Failed to persist payment initialization.",
      });
    }

    const callbackUrl = String(body?.callbackUrl || "").trim();
    const paystackSecret = String(
      Deno.env.get("PAYSTACK_SECRET_KEY") || "",
    ).trim();
    const paystackApiUrl = String(
      Deno.env.get("PAYSTACK_API_URL") || "https://api.paystack.co",
    ).trim();
    const paystackMode =
      String(Deno.env.get("PAYSTACK_MODE") || "")
        .trim()
        .toLowerCase() ||
      (paystackSecret.startsWith("sk_test_") ? "test" : "live");

    if (paystackSecret) {
      if (!callbackUrl) {
        return jsonResponse(400, {
          error:
            "callbackUrl is required when PAYSTACK_SECRET_KEY is configured.",
        });
      }

      const initialized = await initializePaystack({
        apiUrl: paystackApiUrl,
        secretKey: paystackSecret,
        callbackUrl,
        amountInCents,
        email: String(user.email || ""),
        reference,
        metadata: {
          tenantUserId: typedProfile.id,
          companyId: typedProfile.company_id,
          paymentType,
          billingMonths,
          additionalChargeIds,
          chargeId: body?.chargeId || null,
        },
      });

      if (!initialized.ok) {
        await adminClient
          .from("tenant_payments")
          .update({ status: "failed" })
          .eq("reference", reference);

        return jsonResponse(502, {
          error: initialized.error,
        });
      }

      return jsonResponse(200, {
        authorizationUrl: initialized.authorizationUrl,
        reference: initialized.providerReference,
        provider: "paystack",
        mode: paystackMode,
        paymentType,
        billingMonths,
      });
    }

    if (!callbackUrl) {
      return jsonResponse(200, {
        authorizationUrl: "",
        reference,
        provider: "none",
        mockMode: true,
        paymentType,
        billingMonths,
      });
    }

    const url = new URL(callbackUrl);
    url.searchParams.set("status", "success");
    url.searchParams.set("reference", reference);

    return jsonResponse(200, {
      authorizationUrl: url.toString(),
      reference,
      provider: "none",
      mockMode: true,
      paymentType,
      billingMonths,
    });
  } catch (error) {
    return jsonResponse(500, {
      error:
        error instanceof Error ? error.message : "Unhandled function error.",
    });
  }
});
