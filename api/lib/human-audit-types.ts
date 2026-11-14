export interface MobileVitalsResult {
  viewport: {
    width: number;
    height: number;
    isMobile: boolean;
  };
  estimatedTbtMs: number;
  lcpMs?: number;
  inpMs?: number;
  cls?: number;
  cwvPassed?: boolean;
  blockingTasksCount: number;
  heavyCanvasDetected: boolean;
  unthrottledAnimationLoops: string[];
  passed: boolean;
  severity: "PASS" | "WARN" | "CRITICAL";
  details: string[];
}

export interface ContrastViolation {
  selector: string;
  element: string;
  sampleText: string;
  fgColor: string;
  bgColor: string;
  contrastRatio: number;
  requiredRatio: number;
  isLargeText: boolean;
  isBadge: boolean;
  severity: "CRITICAL" | "WARN";
  issue: string;
}

export interface ContrastAuditResult {
  elementsAudited: number;
  violationsCount: number;
  passed: boolean;
  themeBleedDetected: boolean;
  violations: ContrastViolation[];
}

export interface LinkGraphNode {
  path: string;
  inDegree: number;
  outDegree: number;
  clickDepth: number;
  inboundFrom: string[];
  outboundTo: string[];
  isOrphan: boolean;
}

export interface LinkGraphResult {
  totalPagesDiscovered: number;
  internalLinksCount: number;
  maxClickDepth: number;
  deepPages: string[];
  inDegreeMap: Record<string, number>;
  homepageClickDepth: Record<string, number>;
  orphanPages: string[];
  sitemapReconciled: boolean;
  passed: boolean;
  nodes: Record<string, LinkGraphNode>;
}

export interface UnconfiguredChatbot {
  provider: string;
  status: "DEAD" | "UNCONFIGURED" | "CSP_BLOCKED" | "RUNTIME_ERROR";
  detail: string;
  scriptSnippet?: string;
}

export interface ConsoleErrorEntry {
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
}

export interface CspViolationEntry {
  directive: string;
  blockedUri: string;
  violatedDirective?: string;
  sampleSource?: string;
}

export interface ClientRuntimeResult {
  consoleErrors: ConsoleErrorEntry[];
  cspViolations: CspViolationEntry[];
  unconfiguredChatbots: UnconfiguredChatbot[];
  passed: boolean;
}

export interface DefectSummary {
  category: "MOBILE_TBT" | "CONTRAST_THEME_BLEED" | "ORPHAN_PAGES" | "CONSOLE_CSP_RUNTIME";
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  title: string;
  description: string;
  remediation: string;
}

export interface HumanGradeAuditResult {
  url: string;
  timestamp: string;
  overallPassed: boolean;
  overallScore: number;
  mobileVitals: MobileVitalsResult;
  contrast: ContrastAuditResult;
  linkGraph: LinkGraphResult;
  clientRuntime: ClientRuntimeResult;
  defectsSummary: DefectSummary[];
}
