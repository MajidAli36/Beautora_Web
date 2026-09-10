/** First-run / reopen Getting Started walkthrough. */

export const GUIDE_COMPLETED_KEY = "salon-getting-started-completed";
export const GUIDE_AUTO_OPEN_KEY = "salon-getting-started-auto-open";
const GUIDE_SESSION_SHOWN_KEY = "salon-getting-started-session-shown";

export function readGuideCompleted(): boolean {
  try {
    return localStorage.getItem(GUIDE_COMPLETED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markGuideCompleted(): void {
  try {
    localStorage.setItem(GUIDE_COMPLETED_KEY, "1");
    localStorage.removeItem(GUIDE_AUTO_OPEN_KEY);
    sessionStorage.setItem(GUIDE_SESSION_SHOWN_KEY, "1");
  } catch {
    /* private mode */
  }
}

/** Call right before redirecting to dashboard after org onboarding. */
export function markGuideAutoOpen(): void {
  try {
    localStorage.setItem(GUIDE_AUTO_OPEN_KEY, "1");
    localStorage.removeItem(GUIDE_COMPLETED_KEY);
    sessionStorage.removeItem(GUIDE_SESSION_SHOWN_KEY);
  } catch {
    /* private mode */
  }
}

/** Peek only — does not clear the auto-open flag. */
export function shouldAutoOpenGuideOnDashboard(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(GUIDE_AUTO_OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Consume the one-shot auto-open flag. Call only when about to open the guide.
 * Session-shown is marked when the guide opens/closes via markGuideShownThisSession.
 */
export function consumeGuideAutoOpen(): boolean {
  try {
    if (localStorage.getItem(GUIDE_AUTO_OPEN_KEY) === "1") {
      localStorage.removeItem(GUIDE_AUTO_OPEN_KEY);
      return true;
    }
  } catch {
    /* private mode */
  }
  return false;
}

/** Keep auto-popup from repeating in this tab after opening a step page. */
export function markGuideShownThisSession(): void {
  try {
    sessionStorage.setItem(GUIDE_SESSION_SHOWN_KEY, "1");
  } catch {
    /* private mode */
  }
}
