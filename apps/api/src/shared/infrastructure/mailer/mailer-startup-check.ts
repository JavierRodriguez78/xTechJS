import { getMailerLifecycleManager } from "@xtaskjs/mailer";

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${timeoutMs}ms`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

// Fire-and-forget: never awaited by the boot sequence, so a slow/unreachable SMTP server cannot hang the API.
export function verifyMailerTransportInBackground(timeoutMs = 5000): void {
  withTimeout(getMailerLifecycleManager().verify(), timeoutMs)
    .then(() => {
      console.info("[Mailer] SMTP transport verified successfully");
    })
    .catch((error: unknown) => {
      console.warn("[Mailer] SMTP transport verification failed; email sending may not work", error);
    });
}
