ALTER TABLE `llm_prompt_runs`
  ADD COLUMN `prompt_source` VARCHAR(500) NULL,
  ADD COLUMN `citations` JSON NULL;
