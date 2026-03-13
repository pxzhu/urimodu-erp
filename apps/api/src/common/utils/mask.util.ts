export function maskEmail(email?: string | null): string | null {
  if (!email) {
    return null;
  }

  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) {
    return email;
  }

  if (localPart.length <= 2) {
    return `${localPart[0] ?? "*"}*@${domain}`;
  }

  return `${localPart.slice(0, 2)}${"*".repeat(Math.max(1, localPart.length - 2))}@${domain}`;
}

export function maskPhone(phone?: string | null): string | null {
  if (!phone) {
    return null;
  }

  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length < 7) {
    return "***";
  }

  const prefix = digits.slice(0, 3);
  const suffix = digits.slice(-4);
  return `${prefix}-****-${suffix}`;
}

export function maskNationalId(nationalId?: string | null): string | null {
  if (!nationalId) {
    return null;
  }

  const normalized = nationalId.replace(/[^0-9]/g, "");
  if (normalized.length < 7) {
    return "******-*******";
  }

  return `${normalized.slice(0, 6)}-${normalized[6]}******`;
}
