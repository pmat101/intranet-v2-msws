// MSAL configuration. These are public identifiers, not secrets.
export const msalConfig = {
  auth: {
    clientId: "a0640e62-6b90-4c4b-999c-0ed595a6b4c8",
    authority:
      "https://login.microsoftonline.com/62acdb32-484e-47ca-9e3a-0b58359edbb5",
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

// The permission we ask for when calling our own API.
export const apiRequest = {
  scopes: ["api://a0640e62-6b90-4c4b-999c-0ed595a6b4c8/access_as_user"],
};
