CREATE TABLE IF NOT EXISTS `benefits` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `slug` text NOT NULL,
  `title` text NOT NULL,
  `category` text NOT NULL,
  `description` text DEFAULT '' NOT NULL,
  `benefit` text NOT NULL,
  `conditions` text DEFAULT '' NOT NULL,
  `valid_until` text,
  `coverage` text DEFAULT '' NOT NULL,
  `cta_label` text DEFAULT 'Saiba mais' NOT NULL,
  `cta_url` text DEFAULT '' NOT NULL,
  `status` text DEFAULT 'inactive' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `benefits_slug_unique` ON `benefits` (`slug`);
CREATE INDEX IF NOT EXISTS `benefits_status_category_idx` ON `benefits` (`status`,`category`);

CREATE TABLE IF NOT EXISTS `ombudsman_messages` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `member_email` text NOT NULL,
  `member_auth_user_id` text NOT NULL,
  `type` text NOT NULL,
  `subject` text NOT NULL,
  `message` text NOT NULL,
  `status` text DEFAULT 'received' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS `ombudsman_member_idx` ON `ombudsman_messages` (`member_email`,`created_at`);
CREATE INDEX IF NOT EXISTS `ombudsman_status_idx` ON `ombudsman_messages` (`status`,`created_at`);

INSERT INTO `benefits` (
  `slug`, `title`, `category`, `description`, `benefit`, `conditions`,
  `valid_until`, `coverage`, `cta_label`, `cta_url`, `status`, `created_at`, `updated_at`
) VALUES
  (
    'homologacao-beneficio-educacao',
    '[HOMOLOGAÇÃO] Benefício Educação',
    'Educação',
    'Registro sintético para validar catálogo, filtros e detalhe no staging.',
    'Condição demonstrativa — sem valor comercial',
    'Uso exclusivo em homologação. Não representa parceiro ou desconto real.',
    '2026-12-31T23:59:59.000Z',
    'Nacional',
    'Ver condições',
    '',
    'active',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'homologacao-beneficio-servicos',
    '[HOMOLOGAÇÃO] Benefício Serviços',
    'Serviços',
    'Registro sintético para validar o estado Em breve no staging.',
    'Benefício demonstrativo em preparação',
    'Uso exclusivo em homologação. Não representa parceiro ou desconto real.',
    NULL,
    'Curitiba',
    'Em breve',
    '',
    'coming_soon',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT (`slug`) DO UPDATE SET
  `title` = excluded.`title`,
  `category` = excluded.`category`,
  `description` = excluded.`description`,
  `benefit` = excluded.`benefit`,
  `conditions` = excluded.`conditions`,
  `valid_until` = excluded.`valid_until`,
  `coverage` = excluded.`coverage`,
  `cta_label` = excluded.`cta_label`,
  `cta_url` = excluded.`cta_url`,
  `status` = excluded.`status`,
  `updated_at` = CURRENT_TIMESTAMP;
