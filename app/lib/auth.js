import { msalConfig, apiRequest } from "./auth-config.js";

const msalInstance = new msal.PublicClientApplication(msalConfig);
let account = null;

// Must run once before any other MSAL call.
export async function initAuth() {
  await msalInstance.initialize();

  // If we have just come back from the Microsoft login page,
  // this picks up the result of that redirect.
  const result = await msalInstance.handleRedirectPromise();
  if (result) {
    account = result.account;
  } else {
    const known = msalInstance.getAllAccounts();
    if (known.length > 0) account = known[0];
  }
  return account;
}

export function getAccount() {
  return account;
}

export function signIn() {
  return msalInstance.loginRedirect(apiRequest);
}

export function signOut() {
  return msalInstance.logoutRedirect();
}

// Returns a valid access token for our own API.
// Tries silently first; only interrupts the user if that fails.
export async function getToken() {
  if (!account) throw new Error("Not signed in");
  try {
    const response = await msalInstance.acquireTokenSilent({
      ...apiRequest,
      account,
    });
    return response.accessToken;
  } catch (err) {
    // Silent renewal failed, so the person must sign in again.
    await msalInstance.acquireTokenRedirect(apiRequest);
  }
}
