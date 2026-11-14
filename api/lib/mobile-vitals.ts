import type { MobileVitalsResult } from "./human-audit-types";

export interface MobileVitalsOptions {
  viewportWidth?: number;
  viewportHeight?: number;
  cpuThrottlingRate?: number; // e.g. 4 for 4x slowdown
  measuredTaskTimesMs?: number[];
  measuredLcpMs?: number;
  measuredInpMs?: number;
  measuredCls?: number;
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
  let inlineScriptChars = 0;

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

  // Enterprise Mobile CWV Budgets (LCP < 1,800ms, INP <= 200ms, CLS <= 0.10)
  const unmeasuredImagesCount = (
    html.match(/<img\b(?![^>]*(?:\bwidth=|\bheight=))[^>]*>/gi) ?? []
  ).length;
  const estimatedLcpMs =
    options?.measuredLcpMs ??
    Math.round(
      750 +
        syncHeadScripts.length * 350 +
        (unthrottledAnimationLoops.length > 0 ? 1200 : 0) +
        (inlineScriptChars > 150_000 ? 600 : 0),
    );
  const estimatedInpMs =
    options?.measuredInpMs ??
    Math.min(2000, Math.round(55 + estimatedTbtMs * 0.25));
  const estimatedCls =
    options?.measuredCls ??
    Math.min(0.6, Math.round(unmeasuredImagesCount * 0.04 * 1000) / 1000);

  const cwvPassed =
    estimatedLcpMs < 1800 && estimatedInpMs <= 200 && estimatedCls <= 0.1;

  if (estimatedLcpMs >= 1800) {
    details.push(
      `Mobile LCP (${estimatedLcpMs}ms) exceeds enterprise 1,800ms ceiling.`,
    );
  }
  if (estimatedInpMs > 200) {
    details.push(
      `Mobile INP (${estimatedInpMs}ms) exceeds 200ms responsiveness target.`,
    );
  }
  if (estimatedCls > 0.1) {
    details.push(
      `Mobile CLS (${estimatedCls}) exceeds 0.10 layout stability target (${unmeasuredImagesCount} unsized image(s)).`,
    );
  }

  let severity: "PASS" | "WARN" | "CRITICAL" = "PASS";
  let passed = true;

  if (
    estimatedTbtMs > 600 ||
    (options?.measuredLcpMs !== undefined && options.measuredLcpMs >= 2500) ||
    (options?.measuredInpMs !== undefined && options.measuredInpMs > 500)
  ) {
    severity = "CRITICAL";
    passed = false;
    details.push(
      `CRITICAL DEFECT: Mobile Total Blocking Time estimated at ${Math.round(estimatedTbtMs)}ms (exceeds 600ms critical ceiling).`,
    );
  } else if (
    estimatedTbtMs > 200 ||
    (options?.measuredLcpMs !== undefined && options.measuredLcpMs >= 1800) ||
    (options?.measuredInpMs !== undefined && options.measuredInpMs > 200) ||
    (options?.measuredCls !== undefined && options.measuredCls > 0.1)
  ) {
    severity = "WARN";
    passed = false;
    details.push(
      `WARNING: Mobile performance budget exceeded (TBT ${Math.round(estimatedTbtMs)}ms, LCP ${estimatedLcpMs}ms, INP ${estimatedInpMs}ms, CLS ${estimatedCls}).`,
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
    lcpMs: estimatedLcpMs,
    inpMs: estimatedInpMs,
    cls: estimatedCls,
    cwvPassed,
    blockingTasksCount,
    heavyCanvasDetected,
    unthrottledAnimationLoops,
    passed,
    severity,
    details,
  };
}
