ALTER TABLE `event_attendees` ADD `roster_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `event_attendees`
SET `roster_key` = CASE
  WHEN `attendee_type` = 'guest' THEN 'guest:' || lower(trim(`display_name`))
  ELSE 'member:' || lower(trim(`display_name`))
END
WHERE `roster_key` = '';--> statement-breakpoint
-- Mantém a chegada registrada quando a mesma pessoa foi incluída mais de uma
-- vez antes da chave única existir. O histórico é transferido para a linha que
-- fica na lista antes da remoção das cópias.
UPDATE `check_in_history`
SET `attendee_id` = (
  SELECT keep.id
  FROM `event_attendees` AS keep
  WHERE keep.event_id = (SELECT duplicate.event_id FROM `event_attendees` AS duplicate WHERE duplicate.id = `check_in_history`.`attendee_id`)
    AND keep.roster_key = (SELECT duplicate.roster_key FROM `event_attendees` AS duplicate WHERE duplicate.id = `check_in_history`.`attendee_id`)
  ORDER BY CASE keep.status WHEN 'present' THEN 0 WHEN 'expected' THEN 1 WHEN 'absent' THEN 2 ELSE 3 END, keep.id ASC
  LIMIT 1
)
WHERE `attendee_id` IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (
      PARTITION BY event_id, roster_key
      ORDER BY CASE status WHEN 'present' THEN 0 WHEN 'expected' THEN 1 WHEN 'absent' THEN 2 ELSE 3 END, id ASC
    ) AS row_number
    FROM `event_attendees`
  ) WHERE row_number > 1
);--> statement-breakpoint
DELETE FROM `event_attendees`
WHERE `id` IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (
      PARTITION BY event_id, roster_key
      ORDER BY CASE status WHEN 'present' THEN 0 WHEN 'expected' THEN 1 WHEN 'absent' THEN 2 ELSE 3 END, id ASC
    ) AS row_number
    FROM `event_attendees`
  ) WHERE row_number > 1
);--> statement-breakpoint
CREATE UNIQUE INDEX `event_attendees_roster_unique` ON `event_attendees` (`event_id`,`roster_key`);
