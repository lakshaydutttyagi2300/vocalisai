// Shared by the profile API (enforced) and the profile page (maxLength), so
// the form can never let someone type more than the server will accept.
export const PROFILE_LIMITS = { name: 100, targetRole: 120, bio: 2000 } as const;
