import { describe, it, expect } from "vitest";
import {
  SEARCH_RETRIEVAL_BOTS,
  TRAINING_CRAWLER_BOTS,
  auditBotGovernance,
  buildEnterpriseRobotsTxt,
  classifyBotUserAgent,
} from "./bot-governance";

describe("Enterprise AIO Bot Governance (Search/Retrieval vs Training Allow Policy)", () => {
  it("separates retrieval bots from model-training bots cleanly", () => {
    const retrievalIds = SEARCH_RETRIEVAL_BOTS.map((b) => b.id);
    const trainingIds = TRAINING_CRAWLER_BOTS.map((b) => b.id);

    expect(retrievalIds).toContain("OAI-SearchBot");
    expect(retrievalIds).toContain("PerplexityBot");
    expect(retrievalIds).toContain("Claude-SearchBot");
    expect(retrievalIds).toContain("Googlebot");
    expect(retrievalIds).toContain("Bingbot");
    expect(retrievalIds).toContain("BraveBot");

    expect(trainingIds).toContain("GPTBot");
    expect(trainingIds).toContain("Google-Extended");
    expect(trainingIds).toContain("CCBot");
    expect(trainingIds).toContain("anthropic-ai");
    expect(trainingIds).toContain("ClaudeBot");
    expect(trainingIds).toContain("Applebot-Extended");

    const overlap = retrievalIds.filter((id) => trainingIds.includes(id));
    expect(overlap).toEqual([]);
  });

  it("buildEnterpriseRobotsTxt separates sections and explicitly allows ALL training bots (Zero Penalty Policy)", () => {
    const robots = buildEnterpriseRobotsTxt("https://web-ready.ag");
    expect(robots).toContain("Section 1: Live Search & Citation Retrieval Bots");
    expect(robots).toContain("Section 2: Foundation Model Training Crawlers");
    expect(robots).toContain("User-agent: GPTBot\nAllow: /");
    expect(robots).toContain("User-agent: Google-Extended\nAllow: /");
    expect(robots).toContain("User-agent: CCBot\nAllow: /");
    expect(robots).toContain("User-agent: ClaudeBot\nAllow: /");
    expect(robots).toContain("User-agent: OAI-SearchBot\nAllow: /");
    expect(robots).toContain("Disallow: /*?q=*");
    expect(robots).toContain("Disallow: /*?utm_*=*");

    const audit = auditBotGovernance(robots);
    expect(audit.passed).toBe(true);
    expect(audit.sectionsSeparated).toBe(true);
    expect(audit.allRetrievalBotsAllowed).toBe(true);
    expect(audit.allTrainingBotsAllowed).toBe(true);
    expect(audit.blockedTrainingBots).toEqual([]);
    expect(audit.blockedRetrievalBots).toEqual([]);
    expect(audit.score).toBe(100);
  });

  it("flags blocking model-training bots (GPTBot/Google-Extended/CCBot) as a penalty risk", () => {
    const robotsBlockingTraining = `
User-agent: OAI-SearchBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Claude-SearchBot
Allow: /
User-agent: Googlebot
Allow: /
User-agent: Bingbot
Allow: /
User-agent: BraveBot
Allow: /

User-agent: GPTBot
Disallow: /

User-agent: Google-Extended
Disallow: /
`;
    const audit = auditBotGovernance(robotsBlockingTraining);
    expect(audit.passed).toBe(false);
    expect(audit.allTrainingBotsAllowed).toBe(false);
    expect(audit.blockedTrainingBots).toContain("GPTBot");
    expect(audit.blockedTrainingBots).toContain("Google-Extended");
    expect(audit.score).toBeLessThan(80);
  });

  it("classifies User-Agent strings accurately and catches 403 WAF bot probes", () => {
    expect(classifyBotUserAgent("Mozilla/5.0 (compatible; OAI-SearchBot/1.0)")).toEqual({
      bot: "OAI-SearchBot",
      category: "search_retrieval",
    });
    expect(classifyBotUserAgent("Mozilla/5.0 (compatible; GPTBot/1.2)")).toEqual({
      bot: "GPTBot",
      category: "model_training",
    });
    expect(classifyBotUserAgent("Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36")).toEqual({
      bot: "human_or_other",
      category: "other",
    });

    const robots = buildEnterpriseRobotsTxt("https://web-ready.ag");
    const auditWithWaf = auditBotGovernance(robots, [
      {
        bot: "OAI-SearchBot",
        category: "search_retrieval",
        status: 403,
        wafBlocked: true,
        challengeDetected: true,
        ok: false,
      },
      {
        bot: "GPTBot",
        category: "model_training",
        status: 200,
        wafBlocked: false,
        challengeDetected: false,
        ok: true,
      },
    ]);

    expect(auditWithWaf.passed).toBe(false);
    expect(auditWithWaf.wafBlockedBots).toContain("OAI-SearchBot");
    expect(auditWithWaf.http200Bots).toContain("GPTBot");
  });

  it("classifies ChatGPT-User & Claude-User as retrieval and detects conflicting Disallow:/ + Allow:/ edge overrides", () => {
    expect(classifyBotUserAgent("ChatGPT-User/1.0")).toEqual({
      bot: "ChatGPT-User",
      category: "search_retrieval",
    });
    expect(classifyBotUserAgent("Claude-User/1.0")).toEqual({
      bot: "Claude-User",
      category: "search_retrieval",
    });

    const conflictingRobots = `
User-agent: GPTBot
Disallow: /

User-agent: CCBot
Disallow: /

${buildEnterpriseRobotsTxt("https://web-ready.ag")}
`;
    const audit = auditBotGovernance(conflictingRobots);
    expect(audit.passed).toBe(false);
    expect(audit.conflictingBots).toContain("GPTBot");
    expect(audit.conflictingBots).toContain("CCBot");
    expect(audit.allTrainingBotsAllowed).toBe(false);
    expect(audit.findings.some((f) => /Conflicting Disallow/i.test(f))).toBe(true);
  });
});
