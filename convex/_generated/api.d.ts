/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiConcepts from "../aiConcepts.js";
import type * as arPreviews from "../arPreviews.js";
import type * as bundleGeneration from "../bundleGeneration.js";
import type * as crons from "../crons.js";
import type * as dailyCaps from "../dailyCaps.js";
import type * as leadRequests from "../leadRequests.js";
import type * as migrations from "../migrations.js";
import type * as previewBundles from "../previewBundles.js";
import type * as retention from "../retention.js";
import type * as uploadValidation from "../uploadValidation.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiConcepts: typeof aiConcepts;
  arPreviews: typeof arPreviews;
  bundleGeneration: typeof bundleGeneration;
  crons: typeof crons;
  dailyCaps: typeof dailyCaps;
  leadRequests: typeof leadRequests;
  migrations: typeof migrations;
  previewBundles: typeof previewBundles;
  retention: typeof retention;
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
