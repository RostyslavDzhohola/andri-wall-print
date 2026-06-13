/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as arPreviews from "../arPreviews.js";
import type * as builderInvites from "../builderInvites.js";
import type * as bundleGeneration from "../bundleGeneration.js";
import type * as buyerAccounts from "../buyerAccounts.js";
import type * as previewBundles from "../previewBundles.js";
import type * as sellerAuth from "../sellerAuth.js";
import type * as sellerPricing from "../sellerPricing.js";
import type * as uploadValidation from "../uploadValidation.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  arPreviews: typeof arPreviews;
  builderInvites: typeof builderInvites;
  bundleGeneration: typeof bundleGeneration;
  buyerAccounts: typeof buyerAccounts;
  previewBundles: typeof previewBundles;
  sellerAuth: typeof sellerAuth;
  sellerPricing: typeof sellerPricing;
  uploadValidation: typeof uploadValidation;
  validators: typeof validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
