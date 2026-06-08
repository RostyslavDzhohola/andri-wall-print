export type SellerIdentityLike = {
  subject?: string | null;
  tokenIdentifier?: string | null;
  email?: string | null;
  preferredEmailAddress?: string | null;
};

function parseAllowlist(...values: Array<string | undefined>) {
  return new Set(
    values
      .flatMap((value) => (value ?? "").split(","))
      .map((entry) => entry.trim().replace(/^['"]+|['"]+$/g, "").toLowerCase())
      .filter(Boolean)
  );
}

export function getSellerEmail(identity: SellerIdentityLike) {
  return identity.email ?? identity.preferredEmailAddress ?? null;
}

export function getSellerSubject(identity: SellerIdentityLike) {
  return identity.subject ?? identity.tokenIdentifier ?? null;
}

export function isWallPrintProSellerIdentity(
  identity: SellerIdentityLike | null,
  env: Record<string, string | undefined> = process.env
) {
  if (!identity) {
    return false;
  }

  const subject = getSellerSubject(identity);
  const email = getSellerEmail(identity)?.toLowerCase() ?? null;
  const subjectAllowlist = parseAllowlist(env.WALL_PRINT_PRO_SELLER_USER_IDS);
  const emailAllowlist = parseAllowlist(env.WALL_PRINT_PRO_SELLER_EMAILS);

  if (subjectAllowlist.has("*") || emailAllowlist.has("*")) {
    return true;
  }

  return Boolean((subject && subjectAllowlist.has(subject.toLowerCase())) || (email && emailAllowlist.has(email)));
}
