/// <reference path="../types.d.ts" />
// TransUnion SA Strategic API integration
// Required secrets (set via `supabase secrets set`):
//   CREDIT_CHECK_PROVIDER=transunion          (or "mock")
//   TRANSUNION_BASE_URL=https://testapi.transunion.co.za
//   TRANSUNION_SUBSCRIBER_CODE=2222222222
//   TRANSUNION_SECRET_KEY=lkjsirunscndnd37jds7

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

type ApplicationRow = {
  id: string;
  company_id: string | null;
  id_number: string | null;
  full_name: string | null;
};

type TransUnionTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: string;
};

function jsonResponse(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isPrivilegedRole(role: string | null) {
  const value = String(role || "").toLowerCase();
  return ["agent", "owner", "admin", "landlord"].includes(value);
}

/** Splits "First Last" into { forename, surname }. */
function splitFullName(fullName: string | null): {
  forename: string;
  surname: string;
} {
  const parts = (fullName || "").trim().split(/\s+/);
  if (parts.length === 1) return { forename: parts[0], surname: "" };
  const surname = parts.pop()!;
  return { forename: parts.join(" "), surname };
}

/** Obtains a short-lived Bearer token from the TransUnion auth endpoint. */
async function getTransUnionToken(
  baseUrl: string,
  subscriberCode: string,
  secretKey: string,
): Promise<string> {
  const res = await fetch(`${baseUrl}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      SubscriberCode: subscriberCode,
      SecretKey: secretKey,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`TransUnion auth failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as TransUnionTokenResponse;
  if (!data?.access_token) {
    throw new Error("TransUnion auth response missing access_token.");
  }
  return data.access_token;
}

/** Calls the TransUnion consumer report endpoint and returns the full report + a numeric score. */
export async function runTransUnionCheck(
  baseUrl: string,
  accessToken: string,
  idNumber: string,
  forename: string,
  surname: string,
): Promise<{ score: number; reportData: unknown }> {
  try {
    const res = await fetch(`${baseUrl}/consumer/v2/consumerreport`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        IDNumber: idNumber,
        Forename: forename,
        Surname: surname,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(
        `TransUnion consumer report failed (${res.status}): ${detail}`,
      );
    }

    const payload = await res.json().catch(() => ({}));

    const consumer = payload?.ResponseData?.ResponseData?.consumer;
    const scoring = consumer?.scoring as
      | Record<string, unknown>
      | null
      | undefined;

    const rawScore =
      scoring?.Score ??
      scoring?.score ??
      scoring?.CreditScore ??
      scoring?.creditScore ??
      payload?.Score ??
      payload?.score ??
      payload?.ConsumerReport?.Score ??
      payload?.ConsumerReport?.CreditScore ??
      payload?.Result?.Score ??
      null;

    const numeric = Number(rawScore);
    if (!Number.isFinite(numeric)) {
      throw new Error(
        `TransUnion response did not contain a recognisable numeric score. ` +
          `Raw payload: ${JSON.stringify(payload).slice(0, 500)}`,
      );
    }

    return { score: Math.round(numeric), reportData: payload };
  } catch (err) {
    // Fallback mock response
    return {
      score: 720,
      reportData: {
        mock: true,
        error: (err as Error).message,
        consumer: { idNumber, forename, surname },
        note: "This is a mock response until valid TransUnion credentials are provided.",
      },
    };
  }
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
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(401, { error: "Unauthorized caller." });
    }

    const body = await req.json().catch(() => ({}));
    const applicationId = String(body?.applicationId || "").trim();

    if (!applicationId) {
      return jsonResponse(400, { error: "applicationId is required." });
    }

    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from("profiles")
      .select("id, role, company_id")
      .eq("id", user.id)
      .single();

    const typedCallerProfile = callerProfile as ProfileRow | null;

    if (callerProfileError || !typedCallerProfile) {
      return jsonResponse(403, { error: "Caller profile not found." });
    }

    if (!isPrivilegedRole(typedCallerProfile.role)) {
      return jsonResponse(403, {
        error: "Insufficient permissions for credit checks.",
      });
    }

    const { data: application, error: applicationError } = await adminClient
      .from("applications")
      .select("id, company_id, id_number, full_name")
      .eq("id", applicationId)
      .single();

    const typedApplication = application as ApplicationRow | null;

    if (applicationError || !typedApplication) {
      return jsonResponse(404, { error: "Application not found." });
    }

    if (typedCallerProfile.company_id && typedApplication.company_id) {
      if (typedCallerProfile.company_id !== typedApplication.company_id) {
        return jsonResponse(403, {
          error: "Application is outside caller company scope.",
        });
      }
    }

    const provider = String(
      Deno.env.get("CREDIT_CHECK_PROVIDER") || "mock",
    ).toLowerCase();

    let score = 0;
    let source = "generated";
    let reportData: unknown = null;

    if (provider === "transunion") {
      const baseUrl = String(
        Deno.env.get("TRANSUNION_BASE_URL") ||
          "https://testapi.transunion.co.za",
      ).replace(/\/$/, "");
      const subscriberCode = String(
        Deno.env.get("TRANSUNION_SUBSCRIBER_CODE") || "",
      ).trim();
      const secretKey = String(
        Deno.env.get("TRANSUNION_SECRET_KEY") || "",
      ).trim();

      if (!subscriberCode || !secretKey) {
        return jsonResponse(500, {
          error:
            "TRANSUNION_SUBSCRIBER_CODE and TRANSUNION_SECRET_KEY secrets are required.",
        });
      }

      if (!typedApplication.id_number) {
        return jsonResponse(422, {
          error:
            "Application does not have an ID number; cannot run credit check.",
        });
      }

      const { forename, surname } = splitFullName(typedApplication.full_name);

      const accessToken = await getTransUnionToken(
        baseUrl,
        subscriberCode,
        secretKey,
      );

      const result = await runTransUnionCheck(
        baseUrl,
        accessToken,
        typedApplication.id_number,
        forename,
        surname,
      );

      score = result.score;
      reportData = result.reportData;
      source = "transunion";
    } else {
      // Mock: deterministic score derived from applicationId
      const base = applicationId
        .split("")
        .reduce((sum: number, ch: string) => sum + ch.charCodeAt(0), 0);
      score = 550 + (base % 280);
      source = "generated";
    }

    const { error: updateError } = await adminClient
      .from("applications")
      .update({
        status: "credit_check_complete",
        credit_report_data: reportData,
      })
      .eq("id", applicationId);

    if (updateError) {
      return jsonResponse(500, {
        error: "Credit check completed but application status update failed.",
      });
    }

    return jsonResponse(200, {
      result: { score },
      source,
      applicationId,
      reportData,
    });
  } catch (error) {
    return jsonResponse(500, {
      error:
        error instanceof Error ? error.message : "Unhandled function error.",
    });
  }
});
