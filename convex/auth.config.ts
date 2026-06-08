const clerkJwtIssuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;

export default {
  providers: clerkJwtIssuerDomain
    ? [
        {
          domain: clerkJwtIssuerDomain,
          applicationID: "convex"
        }
      ]
    : []
};
