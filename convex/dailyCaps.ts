export const HOMEPAGE_UPLOAD_BUNDLE_DAILY_CAP = 150;
export const UPLOAD_URL_DAILY_CAP = 400;
export const UPLOAD_FINGERPRINT_DAILY_CAP = 5;
export const LEAD_INSERTS_PER_CONTACT_PER_DAY = 10;
export const LEADS_DAILY_CAP = 500;
export const FUNNEL_VISIT_DAILY_CAP = 2000;

async function getDailyCapCounter(ctx: any, scopedDayKey: string) {
  return await ctx.db
    .query("globalGenerationCap")
    .withIndex("by_day_key", (q: any) => q.eq("dayKey", scopedDayKey))
    .first();
}

async function getContactBucketCounter(ctx: any, contactKey: string, bucket: string) {
  return await ctx.db
    .query("leadRateLimits")
    .withIndex("by_contact_bucket", (q: any) => q.eq("contactKey", contactKey).eq("bucket", bucket))
    .first();
}

export async function getDailyCapCount(ctx: any, scopedDayKey: string) {
  const existing = await getDailyCapCounter(ctx, scopedDayKey);

  return existing?.count ?? 0;
}

export async function getContactBucketCount(ctx: any, contactKey: string, bucket: string) {
  const existing = await getContactBucketCounter(ctx, contactKey, bucket);

  return existing?.count ?? 0;
}

export async function reserveDailyCap(ctx: any, scopedDayKey: string, cap: number, now: number) {
  const existing = await getDailyCapCounter(ctx, scopedDayKey);

  if (existing && existing.count >= cap) {
    return false;
  }

  if (existing) {
    await ctx.db.patch(existing._id, {
      count: existing.count + 1,
      updatedAt: now
    });
    return true;
  }

  await ctx.db.insert("globalGenerationCap", {
    dayKey: scopedDayKey,
    count: 1,
    createdAt: now,
    updatedAt: now
  });
  return true;
}

export async function reserveContactBucket(
  ctx: any,
  contactKey: string,
  bucket: string,
  cap: number,
  now: number
) {
  const existing = await getContactBucketCounter(ctx, contactKey, bucket);

  if (existing && existing.count >= cap) {
    return false;
  }

  if (existing) {
    await ctx.db.patch(existing._id, {
      count: existing.count + 1,
      updatedAt: now
    });
    return true;
  }

  await ctx.db.insert("leadRateLimits", {
    contactKey,
    bucket,
    count: 1,
    firstRequestAt: now,
    updatedAt: now
  });
  return true;
}
