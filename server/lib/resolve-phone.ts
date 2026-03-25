/**
 * Phone Number Resolver — Primary_Phone__pc-aware resolution
 *
 * Implements the team decision (Nitin + Joey):
 * "Phone to be displayed depends on Primary Phone field."
 *
 * Resolution cascade:
 * 1. If Primary_Phone__pc has a value, map to corresponding field
 * 2. If mapped field is empty, fall through to generic Phone
 * 3. If Primary_Phone__pc is null, default to Phone
 * 4. If nothing, return null
 */

export interface MemberPhoneFields {
  Phone?: string | null;
  Primary_Phone__pc?: string | null;
  PersonMobilePhone?: string | null;
  HomePhone?: string | null;
  OtherPhone?: string | null;
}

export interface ResolvedPhone {
  number: string;   // formatted: (XXX) XXX-XXXX
  type: string;     // "Mobile" | "Home" | "Work" | "Other" | "Phone"
  raw: string;      // digits only, for tel: links (+1XXXXXXXXXX)
}

/* ── Primary_Phone__pc → field mapping ──────────────────────── */

const PRIMARY_PHONE_MAP: Record<string, keyof MemberPhoneFields> = {
  Mobile: "PersonMobilePhone",
  Home: "HomePhone",
  Work: "Phone",
  Other: "OtherPhone",
};

/* ── Formatting ─────────────────────────────────────────────── */

function stripNonDigits(s: string): string {
  return s.replace(/\D/g, "");
}

/** Format to (XXX) XXX-XXXX for display */
export function formatPhoneDisplay(raw: string): string {
  const digits = stripNonDigits(raw);
  // 11 digits starting with 1 → strip country code
  const d = digits.length === 11 && digits[0] === "1" ? digits.slice(1) : digits;
  if (d.length === 10) {
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  // Non-standard length — return as-is to avoid breaking international numbers
  return raw.trim();
}

/** Format to +1XXXXXXXXXX for tel: href links */
export function formatPhoneTel(raw: string): string {
  const digits = stripNonDigits(raw);
  const d = digits.length === 11 && digits[0] === "1" ? digits.slice(1) : digits;
  if (d.length === 10) {
    return `+1${d}`;
  }
  // Non-standard — prefix with + and return digits
  return `+${digits}`;
}

/* ── Resolver ───────────────────────────────────────────────── */

export function resolvePhone(member: MemberPhoneFields): ResolvedPhone | null {
  if (!member) return null;

  const primaryType = (member.Primary_Phone__pc || "").trim();

  // Step 1: If Primary_Phone__pc has a value, map to the corresponding field
  if (primaryType) {
    const mappedField = PRIMARY_PHONE_MAP[primaryType];
    if (mappedField) {
      const value = member[mappedField];
      if (value && typeof value === "string" && value.trim()) {
        return {
          number: formatPhoneDisplay(value),
          type: primaryType,
          raw: formatPhoneTel(value),
        };
      }
    }
    // Step 2: Mapped field was empty — fall through to generic Phone
    if (member.Phone && typeof member.Phone === "string" && member.Phone.trim()) {
      return {
        number: formatPhoneDisplay(member.Phone),
        type: "Phone",
        raw: formatPhoneTel(member.Phone),
      };
    }
  }

  // Step 3: Primary_Phone__pc is null — default to Phone
  if (member.Phone && typeof member.Phone === "string" && member.Phone.trim()) {
    return {
      number: formatPhoneDisplay(member.Phone),
      type: "Phone",
      raw: formatPhoneTel(member.Phone),
    };
  }

  // Also try PersonMobilePhone as last resort (it may exist even without Primary_Phone__pc)
  if (member.PersonMobilePhone && typeof member.PersonMobilePhone === "string" && member.PersonMobilePhone.trim()) {
    return {
      number: formatPhoneDisplay(member.PersonMobilePhone),
      type: "Mobile",
      raw: formatPhoneTel(member.PersonMobilePhone),
    };
  }

  // Step 4: No phone data at all
  return null;
}
