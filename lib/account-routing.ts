import { isWallPrintProSellerIdentity, type SellerIdentityLike } from "@/lib/seller-admin";

type ClerkEmailAddress = {
  id?: string | null;
  emailAddress?: string | null;
};

export type ClerkUserLike = {
  primaryEmailAddressId?: string | null;
  primaryEmailAddress?: ClerkEmailAddress | null;
  emailAddresses?: ClerkEmailAddress[] | null;
};

export type AccountDashboardPath = "/account" | "/admin";

export function getClerkUserEmail(user: ClerkUserLike | null) {
  if (!user) {
    return null;
  }

  return (
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses?.find((emailAddress) => emailAddress.id === user.primaryEmailAddressId)?.emailAddress ??
    user.emailAddresses?.[0]?.emailAddress ??
    null
  );
}

export function getAccountDashboardPath(
  identity: SellerIdentityLike | null,
  env?: Record<string, string | undefined>
): AccountDashboardPath {
  return isWallPrintProSellerIdentity(identity, env) ? "/admin" : "/account";
}
