-- Dados mínimos e claramente identificados para homologação do TIME Connect.
-- A publicação desta migration é restrita ao projeto isolado de staging.

INSERT INTO `courses` (
  `slug`, `title`, `description`, `teacher`, `category`, `thumbnail_url`,
  `position`, `status`, `created_at`, `updated_at`
) VALUES (
  'homologacao-time-connect',
  '[HOMOLOGAÇÃO] Fundamentos para crescer com estratégia',
  'Curso sintético criado exclusivamente para validar a experiência da Escola no staging.',
  '',
  'negocios',
  '',
  1,
  'published',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (`slug`) DO UPDATE SET
  `title` = excluded.`title`,
  `description` = excluded.`description`,
  `teacher` = excluded.`teacher`,
  `category` = excluded.`category`,
  `position` = excluded.`position`,
  `status` = excluded.`status`,
  `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `course_modules` (
  `course_id`, `title`, `description`, `position`, `status`, `created_at`, `updated_at`
)
SELECT
  `id`,
  '[HOMOLOGAÇÃO] Módulo de teste',
  'Módulo sintético para validar navegação, progresso e conclusão.',
  1,
  'published',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM `courses`
WHERE `slug` = 'homologacao-time-connect'
ON CONFLICT (`course_id`, `title`) DO UPDATE SET
  `description` = excluded.`description`,
  `position` = excluded.`position`,
  `status` = excluded.`status`,
  `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `lessons` (
  `course_id`, `module_id`, `module_title`, `title`, `description`, `video_key`,
  `duration_seconds`, `position`, `status`, `is_preview`, `created_at`, `updated_at`
)
SELECT
  c.`id`,
  m.`id`,
  m.`title`,
  '[HOMOLOGAÇÃO] Aula 1 — Estratégia aplicada',
  'Aula sintética para validar player, notas e progresso.',
  'https://www.youtube.com/watch?v=M7lc1UVf-VE',
  120,
  1,
  'published',
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM `courses` c
JOIN `course_modules` m ON m.`course_id` = c.`id`
WHERE c.`slug` = 'homologacao-time-connect'
  AND m.`title` = '[HOMOLOGAÇÃO] Módulo de teste'
  AND NOT EXISTS (
    SELECT 1 FROM `lessons` l
    WHERE l.`course_id` = c.`id`
      AND l.`title` = '[HOMOLOGAÇÃO] Aula 1 — Estratégia aplicada'
  );

INSERT INTO `lessons` (
  `course_id`, `module_id`, `module_title`, `title`, `description`, `video_key`,
  `duration_seconds`, `position`, `status`, `is_preview`, `created_at`, `updated_at`
)
SELECT
  c.`id`,
  m.`id`,
  m.`title`,
  '[HOMOLOGAÇÃO] Aula 2 — Execução consistente',
  'Aula sintética para validar conclusão e continuar aprendendo.',
  'https://www.youtube.com/watch?v=M7lc1UVf-VE',
  120,
  2,
  'published',
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM `courses` c
JOIN `course_modules` m ON m.`course_id` = c.`id`
WHERE c.`slug` = 'homologacao-time-connect'
  AND m.`title` = '[HOMOLOGAÇÃO] Módulo de teste'
  AND NOT EXISTS (
    SELECT 1 FROM `lessons` l
    WHERE l.`course_id` = c.`id`
      AND l.`title` = '[HOMOLOGAÇÃO] Aula 2 — Execução consistente'
  );

INSERT INTO `lesson_materials` (
  `lesson_id`, `title`, `kind`, `storage_key`, `external_url`, `mime_type`,
  `position`, `status`, `created_at`, `updated_at`
)
SELECT
  l.`id`,
  '[HOMOLOGAÇÃO] Material de apoio',
  'link',
  NULL,
  'https://timeescoladenegocios.com.br/',
  'text/html',
  1,
  'published',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM `lessons` l
JOIN `courses` c ON c.`id` = l.`course_id`
WHERE c.`slug` = 'homologacao-time-connect'
  AND l.`title` = '[HOMOLOGAÇÃO] Aula 1 — Estratégia aplicada'
  AND NOT EXISTS (
    SELECT 1 FROM `lesson_materials` lm
    WHERE lm.`lesson_id` = l.`id`
      AND lm.`title` = '[HOMOLOGAÇÃO] Material de apoio'
  );

INSERT INTO `events` (
  `slug`, `title`, `description`, `banner_url`, `starts_at`, `ends_at`,
  `location_name`, `city`, `capacity`, `registration_deadline`,
  `allow_guests`, `max_guests_per_member`, `status`, `created_at`, `updated_at`
) VALUES (
  'homologacao-encontro-time',
  '[HOMOLOGAÇÃO] Encontro TIME Connect',
  'Evento sintético do staging para validar inscrição, convidado, cancelamento e check-in.',
  '',
  '2026-09-20T22:00:00.000Z',
  '2026-09-21T00:00:00.000Z',
  'Ambiente de homologação',
  'Curitiba',
  5,
  '2026-09-20T21:00:00.000Z',
  1,
  1,
  'published',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (`slug`) DO UPDATE SET
  `title` = excluded.`title`,
  `description` = excluded.`description`,
  `starts_at` = excluded.`starts_at`,
  `ends_at` = excluded.`ends_at`,
  `location_name` = excluded.`location_name`,
  `city` = excluded.`city`,
  `capacity` = excluded.`capacity`,
  `registration_deadline` = excluded.`registration_deadline`,
  `allow_guests` = excluded.`allow_guests`,
  `max_guests_per_member` = excluded.`max_guests_per_member`,
  `status` = excluded.`status`,
  `updated_at` = CURRENT_TIMESTAMP;

INSERT INTO `community_posts` (
  `author_email`, `author_name`, `content`, `category`, `title`, `company`,
  `benefit`, `discount`, `conditions`, `valid_until`, `contact`,
  `attachments_json`, `official`, `likes_count`, `comments_count`, `status`,
  `created_at`, `updated_at`
) SELECT
  'homologacao@timeconnect.test',
  'TIME — Homologação',
  'Publicação sintética para validar comentários, reações, salvamento e persistência no staging.',
  'general',
  '[HOMOLOGAÇÃO] Bem-vindo à comunidade',
  'TIME Escola de Negócios',
  '', '', '', NULL, '', '[]', 1, 0, 0, 'published', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM `community_posts`
  WHERE `author_email` = 'homologacao@timeconnect.test'
    AND `title` = '[HOMOLOGAÇÃO] Bem-vindo à comunidade'
);

INSERT INTO `community_posts` (
  `author_email`, `author_name`, `content`, `category`, `title`, `company`,
  `benefit`, `discount`, `conditions`, `valid_until`, `contact`,
  `attachments_json`, `official`, `likes_count`, `comments_count`, `status`,
  `created_at`, `updated_at`
) SELECT
  'homologacao@timeconnect.test',
  'TIME — Homologação',
  'Oferta sintética para validar a experiência de benefícios sem representar uma condição comercial real.',
  'offer',
  '[HOMOLOGAÇÃO] Oferta de teste',
  'TIME Escola de Negócios',
  'Benefício demonstrativo de staging',
  'TESTE',
  'Sem validade comercial. Uso exclusivo em homologação.',
  '2026-12-31T23:59:59.000Z',
  '',
  '[]',
  1,
  0,
  0,
  'published',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM `community_posts`
  WHERE `author_email` = 'homologacao@timeconnect.test'
    AND `title` = '[HOMOLOGAÇÃO] Oferta de teste'
);

INSERT INTO `podcast_episodes` (
  `slug`, `title`, `description`, `guest_name`, `season_number`, `episode_number`,
  `published_at`, `thumbnail_url`, `external_url`, `status`, `position`,
  `created_at`, `updated_at`
) VALUES (
  'homologacao-podcast-time',
  '[HOMOLOGAÇÃO] Podcast TIME',
  'Episódio sintético para validar a área de podcasts no staging.',
  'TIME — Homologação',
  1,
  1,
  CURRENT_TIMESTAMP,
  '',
  'https://www.youtube.com/watch?v=M7lc1UVf-VE',
  'published',
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (`slug`) DO UPDATE SET
  `title` = excluded.`title`,
  `description` = excluded.`description`,
  `status` = excluded.`status`,
  `position` = excluded.`position`,
  `updated_at` = CURRENT_TIMESTAMP;
