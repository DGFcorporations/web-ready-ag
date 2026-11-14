-- Enterprise 4-Layer Search Visibility (SEO, AEO, GEO, AIO) telemetry & verification tables

CREATE TABLE IF NOT EXISTS `crawl_telemetry_runs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `domain` VARCHAR(255) NOT NULL,
  `log_source` VARCHAR(32) NOT NULL DEFAULT 'cloudflare',
  `total_hits` INT NOT NULL DEFAULT 0,
  `retrieval_bot_hits` INT NOT NULL DEFAULT 0,
  `training_bot_hits` INT NOT NULL DEFAULT 0,
  `human_hits` INT NOT NULL DEFAULT 0,
  `non_200_rate` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `orphan_urls_json` JSON,
  `crawl_trap_urls_json` JSON,
  `uncrawled_urls_json` JSON,
  `crawl_waste_percent` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `crawl_to_citation_ratio` DECIMAL(8,2),
  `summary_json` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `ai_referral_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `domain` VARCHAR(255) NOT NULL,
  `source_host` VARCHAR(120) NOT NULL,
  `landing_path` VARCHAR(500) NOT NULL,
  `sessions_count` INT NOT NULL DEFAULT 0,
  `conversions_count` INT NOT NULL DEFAULT 0,
  `revenue_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `recorded_date` VARCHAR(10) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `gsc_export_rows` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `domain` VARCHAR(255) NOT NULL,
  `data_date` VARCHAR(10) NOT NULL,
  `url_path` VARCHAR(500) NOT NULL,
  `query_text` VARCHAR(500),
  `clicks` INT NOT NULL DEFAULT 0,
  `impressions` INT NOT NULL DEFAULT 0,
  `ctr` DECIMAL(6,4) NOT NULL DEFAULT 0.0000,
  `avg_position` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
  `bigquery_dataset` VARCHAR(120),
  `bigquery_table` VARCHAR(120),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `llm_prompt_runs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `domain` VARCHAR(255) NOT NULL,
  `prompt_text` VARCHAR(500) NOT NULL,
  `stage` VARCHAR(32) NOT NULL,
  `engine` VARCHAR(32) NOT NULL,
  `cited_brand` BOOLEAN NOT NULL DEFAULT FALSE,
  `competitor_citations` INT NOT NULL DEFAULT 0,
  `provenance` VARCHAR(32) NOT NULL,
  `sentiment` VARCHAR(24) NOT NULL,
  `response_excerpt` TEXT,
  `measured_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `entity_corroborations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `domain` VARCHAR(255) NOT NULL,
  `source_type` VARCHAR(48) NOT NULL,
  `expected_json` JSON,
  `observed_json` JSON,
  `conflict_count` INT NOT NULL DEFAULT 0,
  `conflicts_json` JSON,
  `third_party_citations_90d` INT NOT NULL DEFAULT 0,
  `favorable_sentiment_pct` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `checked_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `bot_access_probes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `domain` VARCHAR(255) NOT NULL,
  `target_url` VARCHAR(500) NOT NULL,
  `bot_name` VARCHAR(64) NOT NULL,
  `bot_category` VARCHAR(32) NOT NULL,
  `http_status` INT,
  `waf_blocked` BOOLEAN NOT NULL DEFAULT FALSE,
  `challenge_detected` BOOLEAN NOT NULL DEFAULT FALSE,
  `robots_allowed` BOOLEAN NOT NULL DEFAULT TRUE,
  `probed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `schema_verification_jobs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `domain` VARCHAR(255) NOT NULL,
  `target_url` VARCHAR(500) NOT NULL,
  `status` VARCHAR(24) NOT NULL DEFAULT 'pending',
  `trigger_source` VARCHAR(32) NOT NULL DEFAULT 'manual',
  `overall_score` INT,
  `seo_score` INT,
  `aeo_score` INT,
  `geo_score` INT,
  `aio_score` INT,
  `dangling_refs_count` INT NOT NULL DEFAULT 0,
  `report_json` JSON,
  `scheduled_for` TIMESTAMP NULL,
  `completed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
