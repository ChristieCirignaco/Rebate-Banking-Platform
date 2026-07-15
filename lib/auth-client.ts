import { adminClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { ac, roles } from "@/lib/permissions";

// Same access controller + roles as the server so client and server checks agree.
export const authClient = createAuthClient({
  plugins: [
    adminClient({ ac, roles }),
    // After a password sign-in for a 2FA-enabled user, the response carries
    // { twoFactorRedirect: true }; this hook routes them to the challenge page.
    twoFactorClient({
      onTwoFactorRedirect: () => {
        window.location.href = "/two-factor";
      },
    }),
  ],
});

export const { signIn, signOut, signUp, useSession } = authClient;
