import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Gmail scopes requested and confirmed by user
provider.addScope("https://www.googleapis.com/auth/gmail.readonly");
provider.addScope("https://www.googleapis.com/auth/gmail.send");
provider.addScope("https://www.googleapis.com/auth/gmail.modify");

// Cache the access token in memory as required by workspace-integration guidelines
let cachedAccessToken: string | null = null;
try {
  cachedAccessToken = localStorage.getItem("aziz_gmail_access_token");
} catch (e) {}
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        try {
          localStorage.removeItem("aziz_gmail_access_token");
          localStorage.removeItem("aziz_gmail_token_timestamp");
        } catch (e) {}
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      try {
        localStorage.removeItem("aziz_gmail_access_token");
        localStorage.removeItem("aziz_gmail_token_timestamp");
      } catch (e) {}
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to retrieve Google Access Token from Authentication response.");
    }

    cachedAccessToken = credential.accessToken;
    try {
      localStorage.setItem("aziz_gmail_access_token", cachedAccessToken);
      localStorage.setItem("aziz_gmail_token_timestamp", Date.now().toString());
    } catch (e) {}
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Firebase Sign-In Error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  try {
    localStorage.removeItem("aziz_gmail_access_token");
    localStorage.removeItem("aziz_gmail_token_timestamp");
  } catch (e) {}
};
