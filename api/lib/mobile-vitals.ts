import type { MobileVitalsResult } from "./human-audit-types";

export interface MobileVitalsOptions {
  viewportWidth?: number;
  viewportHeight?: number;
  cpuThrottlingRate?: number; // e.g. 4 for 4x slowdown
  measuredTaskTimesMs?: number[];
}

/**
 * Analyzes HTML, scripts, and runtime telemetry for mobile performance,
 * specifically measuring main-thread blocking time, heavy canvas animation loops,
 * and estimating lab Total Blocking Time (TBT) on mobile (390px viewport).
 */
export function auditMobileVitals(
  html: string,
  options?: MobileVitalsOptions,
): MobileVitalsResult {
  const width = options?.viewportWidth ?? 390;
  const height = options?.viewportHeight ?? 844;
  const isMobile = width <= 430;
  const cpuThrottling = options?.cpuThrottlingRate ?? 4;

  const details: string[] = [];
  const unthrottledAnimationLoops: string[] = [];

  // 1. Detect canvas elements and WebGL/2D contexts
  const hasCanvasTag = /<canvas\b[^>]*>/i.test(html);
  const hasCanvasContext =
    /(?:getContext\s*\(\s*['"](?:2d|webgl|webgl2)['"]\)|THREE\.(?:WebGLRenderer|Scene)|BABYLON\.Engine)/i.test(
      html,
    );
  const heavyCanvasDetected = hasCanvasTag || hasCanvasContext;

  // 2. Detect requestAnimationFrame loops and setInterval without mobile pause/guard
  const rafMatches = html.match(
    /(?:requestAnimationFrame|function\s+[a-zA-Z0-9_$]+\s*\([^)]*\)\s*\{[\s\S]{0,120}requestAnimationFrame)/gi,
  );
  const setIntervalLoops = html.match(
    /setInterval\s*\(\s*(?:function|\([^)]*\)\s*=>)[\s\S]{0,80}(?:render|draw|animate|tick|update)/gi,
  );

  const hasMobileResponsiveGuard =
    /(?:window\.innerWidth\s*[<>]=?\s*(?:640|768|1024)|matchMedia\s*\(\s*['"][^'"]*(?:max-width|min-width)[^'"]*['"]\)|isMobile|hasTouch)/i.test(
      html,
    );

  if (heavyCanvasDetected && (rafMatches || setIntervalLoops)) {
    if (!hasMobileResponsiveGuard) {
      unthrottledAnimationLoops.push(
        "Continuous canvas animation loop executing on mobile viewport without window.matchMedia or viewport guard",
      );
      details.push(
        "Heavy canvas animation loop detected without mobile viewport throttling or off-screen pause guards.",
      );
    }
  }

  // 3. Detect heavy synchronous external scripts blocking the main thread in <head>
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const headContent = headMatch ? headMatch[1] : "";
  const syncHeadScripts =
    headContent.match(/<script\b(?![^>]*\b(?:async|defer|type=["']module["']))[^>]*\bsrc=["'][^"']+["'][^>]*>/gi) ||
    [];

  if (syncHeadScripts.length > 0) {
    details.push(
      `Found ${syncHeadScripts.length} synchronous script(s) in <head> blocking initial parse.`,
    );
  }

  // 4. Calculate estimated TBT (Total Blocking Time)
  // Lab TBT: Sum of (task_duration - 50ms) for tasks > 50ms.
  let estimatedTbtMs = 0;
  let blockingTasksCount = 0;

  if (options?.measuredTaskTimesMs && options.measuredTaskTimesMs.length > 0) {
    for (const taskMs of options.measuredTaskTimesMs) {
      const throttledMs = taskMs * (isMobile ? cpuThrottling : 1);
      if (throttledMs > 50) {
        blockingTasksCount++;
        estimatedTbtMs += throttledMs - 50;
      }
    }
  } else {
    // Synthetic lab model based on detected JS weight & unthrottled animation loops
    if (unthrottledAnimationLoops.length > 0) {
      // Unthrottled continuous canvas rendering loops on mobile typically produce extreme TBT (often 3,000ms - 9,000ms+)
      estimatedTbtMs += 6500;
      blockingTasksCount += 15;
    }

    if (heavyCanvasDetected && !hasMobileResponsiveGuard) {
      estimatedTbtMs += 2500;
      blockingTasksCount += 5;
    }

    if (syncHeadScripts.length > 0) {
      estimatedTbtMs += syncHeadScripts.length * 150;
      blockingTasksCount += syncHeadScripts.length;
    }

    // Measure total inline script volume
    const scriptTags = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || [];
    let inlineScriptChars = 0;
    for (const tag of scriptTags) {
      inlineScriptChars += tag.length;
    }

    if (inlineScriptChars > 150_000) {
      const extraTasks = Math.floor(inlineScriptChars / 50_000);
      blockingTasksCount += extraTasks;
      estimatedTbtMs += extraTasks * 180;
      details.push(
        `High inline script volume (${Math.round(inlineScriptChars / 1024)} KB) contributing to main-thread execution delay.`,
      );
    }
  }

  // Thresholds:
  // <= 200ms: PASS (Good Core Web Vitals)
  // 201ms - 600ms: WARN (Needs Improvement)
  // > 600ms: CRITICAL FAIL (Severe main-thread blocking; Manus/Cue caught 9,090ms on mobile canvas loops)
  let severity: "PASS" | "WARN" | "CRITICAL" = "PASS";
  let passed = true;

  if (estimatedTbtMs > 600) {
    severity = "CRITICAL";
    passed = false;
    details.push(
      `CRITICAL DEFECT: Mobile Total Blocking Time estimated at ${Math.round(estimatedTbtMs)}ms (exceeds 600ms critical ceiling).`,
    );
  } else if (estimatedTbtMs > 200) {
    severity = "WARN";
    passed = false;
    details.push(
      `WARNING: Mobile Total Blocking Time estimated at ${Math.round(estimatedTbtMs)}ms (exceeds 200ms target).`,
    );
  } else {
    details.push(`Mobile TBT within acceptable limits (${Math.round(estimatedTbtMs)}ms <= 200ms).`);
  }

  return {
    viewport: {
      width,
      height,
      isMobile,
    },
    estimatedTbtMs: Math.round(estimatedTbtMs),
    blockingTasksCount,
    heavyCanvasDetected,
    unthrottledAnimationLoops,
    passed,
    severity,
    details,
  };
}
