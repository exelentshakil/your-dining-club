"use client";

import { useState } from "react";
import { US_STATES } from "@/data/us-states";
import { ALL_CATEGORIES } from "@/data/categories";
import { MAX_PARTNERS_PER_CATEGORY_PER_MARKET } from "@/lib/business-model";

const POSITIONS = ["Owner", "Co-Owner", "President", "General Manager", "Manager", "Marketing Director", "Other"];

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "ok"; slotsLeft: number }
  | { kind: "duplicate" }
  | { kind: "full"; message: string }
  | { kind: "error"; message: string };

export function PartnerForm({ initialCategory }: { initialCategory?: string }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [emailMismatch, setEmailMismatch] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();

    if (get("businessEmail") !== get("confirmEmail")) {
      setEmailMismatch(true);
      return;
    }
    setEmailMismatch(false);
    setStatus({ kind: "sending" });

    const body = {
      decisionMaker: {
        firstName: get("dmFirst"), lastName: get("dmLast"),
        position: get("dmPosition"), cellPhone: get("dmPhone"),
      },
      contact: {
        firstName: get("cpFirst"), lastName: get("cpLast"),
        position: get("cpPosition"), cellPhone: get("cpPhone"),
      },
      businessEmail: get("businessEmail"),
      businessPhone: get("businessPhone"),
      businessName: get("businessName"),
      businessType: get("businessType"),
      categorySlug: get("categorySlug") || undefined,
      yearsInBusiness: get("years") || undefined,
      address: {
        street: get("street"), city: get("city"),
        region: get("region"), postalCode: get("zip"),
      },
      online: {
        website: get("website"), facebook: get("facebook"),
        instagram: get("instagram"), other: get("otherSocial"),
      },
      stats: {
        locations: get("locations") || undefined,
        dailyCustomers: get("dailyCustomers") || undefined,
        posSystem: get("pos"),
        avgTransaction: get("avgTransaction") || undefined,
        otherAdvertising: get("otherAds"),
      },
      pitch: get("pitch"),
    };

    try {
      const res = await fetch("/api/partners/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.status === 409) return setStatus({ kind: "full", message: data.message });
      if (!res.ok) return setStatus({ kind: "error", message: data.error ?? "Something went wrong." });
      if (data.status === "duplicate") return setStatus({ kind: "duplicate" });
      setStatus({ kind: "ok", slotsLeft: data.slotsLeft ?? 0 });
    } catch {
      setStatus({ kind: "error", message: "Network error — please try again." });
    }
  }

  if (status.kind === "ok" || status.kind === "duplicate") {
    return (
      <div className="card p-10 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-3xl">✓</div>
        <h3 className="mt-5 text-2xl font-bold">
          {status.kind === "duplicate" ? "We already have your application" : "Application received"}
        </h3>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
          {status.kind === "duplicate"
            ? "Our partnership team already has an open application for this business email and will be in touch."
            : "Our partnership team will review your application and contact you within 24–48 hours."}
        </p>
        {status.kind === "ok" && (
          <p className="mt-4 inline-block rounded-pill bg-brand-50 px-4 py-2 text-[13px] font-semibold text-brand-700">
            {status.slotsLeft > 0
              ? `${status.slotsLeft} of ${MAX_PARTNERS_PER_CATEGORY_PER_MARKET} category spots remain in your market`
              : "You claimed the last spot in your category for this market"}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 sm:p-9">
      <span className="eyebrow">▤ Application Form</span>
      <h2 className="mt-4 text-2xl font-bold">Reserve Your Spot in Your Market</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
        <strong className="text-flame">
          Spots are limited to {MAX_PARTNERS_PER_CATEGORY_PER_MARKET} businesses per category, per market.
        </strong>{" "}
        Complete the form below and our team will reach out within 24–48 hours.
      </p>

      <Section title="Decision Maker Information">
        <Field name="dmFirst" label="First Name" required placeholder="First name" />
        <Field name="dmLast" label="Last Name" required placeholder="Last name" />
        <SelectField name="dmPosition" label="Position" required options={POSITIONS} placeholder="Select position" />
        <Field name="dmPhone" label="Cell Phone" required type="tel" placeholder="000-000-0000" />
      </Section>

      <Section title="Contact Person" hint="Leave blank if same as above">
        <Field name="cpFirst" label="First Name" placeholder="First name" />
        <Field name="cpLast" label="Last Name" placeholder="Last name" />
        <SelectField name="cpPosition" label="Position" options={POSITIONS} placeholder="Select position" />
        <Field name="cpPhone" label="Cell Phone" type="tel" placeholder="000-000-0000" />
      </Section>

      <Section title="Email Addresses" columns={3}>
        <Field name="businessEmail" label="Business Email" required type="email" placeholder="business@email.com" />
        <Field
          name="confirmEmail"
          label="Confirm Email"
          required
          type="email"
          placeholder="Confirm email"
          error={emailMismatch ? "Emails do not match" : undefined}
        />
        <Field name="businessPhone" label="Business Phone" required type="tel" placeholder="000-000-0000" />
      </Section>

      <Section title="Business Information">
        <Field name="businessName" label="Business Name" required placeholder="Restaurant / business name" />
        <Field name="businessType" label="Business Type" required placeholder="e.g. Italian restaurant" />
        <SelectField
          name="categorySlug"
          label="YDC Category"
          required
          defaultValue={initialCategory}
          options={ALL_CATEGORIES.map((c) => [c.slug, c.name] as [string, string])}
          placeholder="Select category"
        />
        <Field name="years" label="Years In Business" type="number" min={0} placeholder="e.g. 5" />
      </Section>

      <Section title="Business Address" columns={4}>
        <div className="sm:col-span-2">
          <Field name="street" label="Street Address" required placeholder="123 Main St" />
        </div>
        <Field name="city" label="City" required placeholder="City" />
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            name="region"
            label="State"
            required
            options={US_STATES.map(([abbr]) => abbr)}
            placeholder="ST"
          />
          <Field name="zip" label="Zip" required placeholder="00000" />
        </div>
      </Section>

      <Section title="Online Presence (Optional)">
        <Field name="website" label="Business Website" placeholder="https://..." />
        <Field name="facebook" label="Facebook Page" placeholder="facebook.com/..." />
        <Field name="instagram" label="Instagram" placeholder="@username" />
        <Field name="otherSocial" label="Other Social" placeholder="TikTok, etc." />
      </Section>

      <Section title="Business Stats" columns={5}>
        <Field name="locations" label="# Locations" type="number" min={1} placeholder="1" />
        <Field name="dailyCustomers" label="Daily Customers" type="number" min={0} placeholder="250" />
        <Field name="pos" label="POS System" placeholder="Clover, Toast, Square" />
        <Field name="avgTransaction" label="Avg. Transaction" type="number" min={0} step="0.01" placeholder="$" />
        <Field name="otherAds" label="Other Advertising" placeholder="Google Ads, etc." />
      </Section>

      <Section title="Tell Us About Your Business" columns={1}>
        <label className="block">
          <span className="label">Why would you like to be a Your Dining Club partner?</span>
          <textarea
            name="pitch"
            rows={5}
            className="field mt-1.5 resize-y"
            placeholder="Tell us what makes your business unique, how you stand out from the competition, and why you'd be a great addition to Your Dining Club..."
          />
        </label>
      </Section>

      {status.kind === "full" && (
        <p className="mt-6 rounded-card border border-brand-200 bg-brand-50 p-4 text-sm text-ink-soft">
          {status.message}
        </p>
      )}
      {status.kind === "error" && (
        <p className="mt-6 rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {status.message}
        </p>
      )}

      <div className="mt-8 text-center">
        <button type="submit" className="btn-dark w-full sm:w-auto sm:px-12" disabled={status.kind === "sending"}>
          {status.kind === "sending" ? "Submitting…" : "➤ Submit My YDC Application"}
        </button>
        <p className="mt-3 text-[12px] text-ink-muted">
          Our partnership team will review your application and contact you within 24–48 hours.
        </p>
      </div>
    </form>
  );
}

/* ── Field primitives ─────────────────────────────────────────────────────── */

function Section({
  title, hint, columns = 4, children,
}: { title: string; hint?: string; columns?: 1 | 3 | 4 | 5; children: React.ReactNode }) {
  const cols = {
    1: "sm:grid-cols-1",
    3: "sm:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
    5: "sm:grid-cols-2 lg:grid-cols-5",
  }[columns];
  return (
    <fieldset className="mt-9 border-t border-ink-line pt-6 first:mt-6">
      <legend className="-mt-9 mb-4 bg-white pr-3 text-[11px] font-bold uppercase tracking-[0.14em] text-flame">
        {title}
        {hint && <span className="ml-2 font-medium normal-case tracking-normal text-ink-muted">— {hint}</span>}
      </legend>
      <div className={`grid gap-4 ${cols}`}>{children}</div>
    </fieldset>
  );
}

function Field({
  name, label, required, type = "text", placeholder, error, min, step,
}: {
  name: string; label: string; required?: boolean; type?: string;
  placeholder?: string; error?: string; min?: number; step?: string;
}) {
  return (
    <label className="block">
      <span className="label">
        {label} {required && <span className="text-flame">*</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        min={min}
        step={step}
        aria-invalid={error ? true : undefined}
        className={`field mt-1.5 ${error ? "border-flame focus:border-flame focus:ring-flame/25" : ""}`}
      />
      {error && <span className="mt-1 block text-[12px] font-medium text-flame">{error}</span>}
    </label>
  );
}

function SelectField({
  name, label, required, options, placeholder, defaultValue,
}: {
  name: string; label: string; required?: boolean;
  options: Array<string | [string, string]>; placeholder: string; defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="label">
        {label} {required && <span className="text-flame">*</span>}
      </span>
      <select name={name} required={required} defaultValue={defaultValue ?? ""} className="field mt-1.5">
        <option value="">{placeholder}</option>
        {options.map((o) => {
          const [value, text] = Array.isArray(o) ? o : [o, o];
          return <option key={value} value={value}>{text}</option>;
        })}
      </select>
    </label>
  );
}
