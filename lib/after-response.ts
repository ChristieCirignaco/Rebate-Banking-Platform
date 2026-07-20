import { after } from "next/server";

// Run work AFTER the response is sent, without detaching it from the platform.
//
// The pattern this replaces was `void (async () => { … })()`. That returns the response
// immediately and leaves the promise floating — which reads as "fire and forget" but on a
// serverless host means something worse: once the response is finished the runtime is free to
// FREEZE the instance, suspending the in-flight request mid-flight. It only resumes if that same
// instance happens to serve another request, which may be seconds, minutes, or never.
//
// That is why transactional mail arrived late "sometimes": under traffic the instance stays warm
// and the floating promise finishes in milliseconds, but in a quiet period nothing keeps it
// alive. The symptom therefore tracks traffic inversely, which is what made it look random.
//
// `after()` tells the platform to keep the invocation alive until the callback settles, so the
// user still gets their response immediately and the send actually runs.
export function afterResponse(task: () => Promise<unknown>): void {
  try {
    after(task);
  } catch {
    // Outside a request scope (a plain script, a non-request cron path) there is no response to
    // defer past and `after()` throws. Fall back to running it detached — no worse than before,
    // and these paths are long-lived rather than serverless-frozen.
    void task().catch((error) => {
      console.error("[afterResponse] deferred task failed:", error);
    });
  }
}
