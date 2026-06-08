import type { GenericActionCtx, GenericDataModel, GenericMutationCtx, GenericQueryCtx } from "convex/server";
import { ConvexError } from "convex/values";

import { getSellerEmail, getSellerSubject, isWallPrintProSellerIdentity } from "../lib/seller-admin";

export { getSellerEmail, getSellerSubject, isWallPrintProSellerIdentity } from "../lib/seller-admin";

type AuthCtx =
  | GenericQueryCtx<GenericDataModel>
  | GenericMutationCtx<GenericDataModel>
  | GenericActionCtx<GenericDataModel>;

export async function requireWallPrintProSeller(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "Sign in to open the Wall Print Pro admin workspace."
    });
  }

  if (!isWallPrintProSellerIdentity(identity)) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "This account cannot open the Wall Print Pro admin workspace."
    });
  }

  const sellerSubject = getSellerSubject(identity);

  if (!sellerSubject) {
    throw new ConvexError({
      code: "INVALID_IDENTITY",
      message: "This account is missing a stable sign-in identity."
    });
  }

  return {
    subject: sellerSubject,
    email: getSellerEmail(identity) ?? undefined
  };
}
