import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Google sign-in only needs basic identity. Do not request Drive permissions.
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({ prompt: 'select_account' });

let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedIdToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, accessToken: string | null, idToken: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const idToken = await user.getIdToken();
      cachedIdToken = idToken;
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken, idToken);
      } else if (!isSigningIn) {
        if (onAuthSuccess) onAuthSuccess(user, null, idToken);
      }
    } else {
      cachedAccessToken = null;
      cachedIdToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string | null;
  idToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleAuthProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    cachedIdToken = await result.user.getIdToken();
    return {
      user: result.user,
      accessToken: cachedAccessToken,
      idToken: cachedIdToken,
    };
  } catch (error) {
    console.error('Google Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getIdToken = async (): Promise<string | null> => {
  if (auth.currentUser) {
    cachedIdToken = await auth.currentUser.getIdToken();
  }
  return cachedIdToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  cachedIdToken = null;
};
