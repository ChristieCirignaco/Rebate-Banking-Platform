import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { ac, roles } from "@/lib/permissions";

// Same access controller + roles as the server so client and server checks agree.
export const authClient = createAuthClient({
  plugins: [adminClient({ ac, roles })],
});

export const { signIn, signOut, signUp, useSession } = authClient;
