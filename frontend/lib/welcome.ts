/** The welcome screen is for people who have a workspace and whom the server has not yet greeted. Unknown counts as seen. */
export const needsWelcome = (user: { organizationId: string | null; welcomeSeen?: boolean } | null): boolean =>
  !!user?.organizationId && user.welcomeSeen === false;
