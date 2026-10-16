import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const courses = sqliteTable(
  "courses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    teacher: text("teacher").notNull().default(""),
    category: text("category").notNull().default("negocios"),
    thumbnailUrl: text("thumbnail_url").notNull().default(""),
    position: integer("position").notNull().default(0),
    status: text("status", { enum: ["draft", "published", "archived"] })
      .notNull()
      .default("draft"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("courses_slug_unique").on(table.slug),
    index("courses_status_idx").on(table.status),
  ],
);

export const lessons = sqliteTable(
  "lessons",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    moduleId: integer("module_id").references(() => courseModules.id, {
      onDelete: "set null",
    }),
    moduleTitle: text("module_title").notNull().default("Fundamentos"),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    videoKey: text("video_key").notNull().default(""),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    position: integer("position").notNull().default(0),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("published"),
    isPreview: integer("is_preview", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("lessons_course_idx").on(table.courseId),
    index("lessons_module_idx").on(table.moduleId),
    index("lessons_position_idx").on(table.courseId, table.position),
  ],
);

/**
 * Módulos são persistidos separadamente das aulas. `lessons.moduleTitle` é
 * mantido para preservar aulas cadastradas antes desta estrutura; a interface
 * as agrupa em um módulo legado até que a equipe escolha reorganizá-las.
 */
export const courseModules = sqliteTable(
  "course_modules",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    position: integer("position").notNull().default(0),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("published"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("course_modules_course_idx").on(table.courseId, table.position),
    uniqueIndex("course_modules_course_title_unique").on(table.courseId, table.title),
  ],
);

export const memberProgress = sqliteTable(
  "member_progress",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    memberEmail: text("member_email").notNull(),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    watchSeconds: integer("watch_seconds").notNull().default(0),
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
    startedAt: text("started_at"),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("member_lesson_progress_unique").on(
      table.memberEmail,
      table.lessonId,
    ),
    index("member_progress_email_idx").on(table.memberEmail),
  ],
);

export const lessonNotes = sqliteTable(
  "lesson_notes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    memberEmail: text("member_email").notNull(),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    content: text("content").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("lesson_notes_member_lesson_unique").on(
      table.memberEmail,
      table.lessonId,
    ),
    index("lesson_notes_member_idx").on(table.memberEmail),
  ],
);

export const lessonMaterials = sqliteTable(
  "lesson_materials",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    kind: text("kind", { enum: ["file", "link"] }).notNull(),
    storageKey: text("storage_key"),
    externalUrl: text("external_url"),
    mimeType: text("mime_type").notNull().default(""),
    position: integer("position").notNull().default(0),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("published"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("lesson_materials_lesson_idx").on(table.lessonId, table.position),
    uniqueIndex("lesson_materials_storage_key_unique").on(table.storageKey),
  ],
);

export const lessonReviews = sqliteTable(
  "lesson_reviews",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    lessonId: integer("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    memberEmail: text("member_email").notNull(),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull().default(""),
    status: text("status", { enum: ["published", "hidden"] })
      .notNull()
      .default("published"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("lesson_reviews_member_lesson_unique").on(table.memberEmail, table.lessonId),
    index("lesson_reviews_lesson_idx").on(table.lessonId, table.status, table.updatedAt),
  ],
);

export const communityPosts = sqliteTable(
  "community_posts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    authorEmail: text("author_email").notNull(),
    authorName: text("author_name").notNull(),
    content: text("content").notNull(),
    category: text("category", {
      enum: ["general", "opportunity", "achievement", "question", "business", "offer", "news"],
    }).notNull().default("general"),
    title: text("title").notNull().default(""),
    company: text("company").notNull().default(""),
    benefit: text("benefit").notNull().default(""),
    discount: text("discount").notNull().default(""),
    conditions: text("conditions").notNull().default(""),
    validUntil: text("valid_until"),
    contact: text("contact").notNull().default(""),
    attachmentsJson: text("attachments_json").notNull().default("[]"),
    official: integer("official", { mode: "boolean" }).notNull().default(false),
    likesCount: integer("likes_count").notNull().default(0),
    commentsCount: integer("comments_count").notNull().default(0),
    status: text("status", { enum: ["published", "hidden", "pending"] })
      .notNull()
      .default("published"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("community_posts_status_idx").on(table.status),
    index("community_posts_created_idx").on(table.createdAt),
  ],
);

export const communityPostLikes = sqliteTable(
  "community_post_likes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => communityPosts.id, { onDelete: "cascade" }),
    memberEmail: text("member_email").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("community_post_likes_unique").on(table.postId, table.memberEmail),
    index("community_post_likes_post_idx").on(table.postId),
  ],
);

export const communityPostSaves = sqliteTable(
  "community_post_saves",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => communityPosts.id, { onDelete: "cascade" }),
    memberEmail: text("member_email").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("community_post_saves_unique").on(table.postId, table.memberEmail),
    index("community_post_saves_member_idx").on(table.memberEmail),
  ],
);

export const communityComments = sqliteTable(
  "community_comments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => communityPosts.id, { onDelete: "cascade" }),
    authorEmail: text("author_email").notNull(),
    authorName: text("author_name").notNull(),
    content: text("content").notNull(),
    status: text("status", { enum: ["published", "hidden"] })
      .notNull()
      .default("published"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("community_comments_post_idx").on(table.postId, table.createdAt),
    index("community_comments_status_idx").on(table.status),
  ],
);

export const communityReports = sqliteTable(
  "community_reports",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => communityPosts.id, { onDelete: "cascade" }),
    commentId: integer("comment_id").references(() => communityComments.id, {
      onDelete: "cascade",
    }),
    reporterEmail: text("reporter_email").notNull(),
    reason: text("reason").notNull().default(""),
    status: text("status", { enum: ["pending", "reviewed", "dismissed"] })
      .notNull()
      .default("pending"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: text("reviewed_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("community_reports_unique").on(
      table.postId,
      table.commentId,
      table.reporterEmail,
    ),
    index("community_reports_status_idx").on(table.status, table.createdAt),
  ],
);

export const courseReviews = sqliteTable(
  "course_reviews",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    memberEmail: text("member_email").notNull(),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("course_member_review_unique").on(
      table.courseId,
      table.memberEmail,
    ),
    index("course_reviews_course_idx").on(table.courseId),
  ],
);

export const members = sqliteTable(
  "members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull(),
    fullName: text("full_name").notNull().default(""),
    phone: text("phone").notNull().default(""),
    authUserId: text("auth_user_id"),
    stripeCustomerId: text("stripe_customer_id"),
    accessStatus: text("access_status", {
      enum: ["pending", "active", "complimentary", "past_due", "canceled", "blocked"],
    }).notNull().default("pending"),
    accessExpiresAt: text("access_expires_at"),
    lastSeenAt: text("last_seen_at"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("members_email_unique").on(table.email),
    uniqueIndex("members_stripe_customer_unique").on(table.stripeCustomerId),
    index("members_access_status_idx").on(table.accessStatus),
  ],
);

export const offers = sqliteTable(
  "offers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("brl"),
    billingType: text("billing_type", {
      enum: ["one_time", "subscription"],
    }).notNull().default("subscription"),
    billingInterval: text("billing_interval", { enum: ["month", "year"] }),
    intervalCount: integer("interval_count").notNull().default(1),
    trialDays: integer("trial_days").notNull().default(0),
    stripePriceId: text("stripe_price_id"),
    accessKey: text("access_key").notNull().default("membership"),
    active: integer("active", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("offers_slug_unique").on(table.slug),
    index("offers_active_idx").on(table.active),
  ],
);

export const checkoutOrders = sqliteTable(
  "checkout_orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    stripeSessionId: text("stripe_session_id").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    memberEmail: text("member_email").notNull(),
    memberAuthUserId: text("member_auth_user_id"),
    memberName: text("member_name").notNull().default(""),
    memberPhone: text("member_phone").notNull().default(""),
    offerId: integer("offer_id").notNull().references(() => offers.id, { onDelete: "restrict" }),
    amountTotal: integer("amount_total").notNull().default(0),
    currency: text("currency").notNull().default("brl"),
    status: text("status", {
      enum: ["open", "complete", "expired", "failed", "refunded"],
    }).notNull().default("open"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("checkout_orders_session_unique").on(table.stripeSessionId),
    index("checkout_orders_member_idx").on(table.memberEmail),
    index("checkout_orders_member_auth_idx").on(table.memberAuthUserId),
    index("checkout_orders_status_idx").on(table.status),
  ],
);

/** Aceites versionados: o conteúdo jurídico continua sendo mantido pela TIME. */
export const memberAgreements = sqliteTable(
  "member_agreements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    memberEmail: text("member_email").notNull(),
    memberAuthUserId: text("member_auth_user_id").notNull(),
    documentType: text("document_type", { enum: ["terms_of_use", "privacy_policy", "membership_agreement"] }).notNull(),
    documentVersion: text("document_version").notNull(),
    documentReference: text("document_reference").notNull(),
    acceptedAt: text("accepted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("member_agreements_version_unique").on(table.memberAuthUserId, table.documentType, table.documentVersion),
    index("member_agreements_member_idx").on(table.memberEmail, table.acceptedAt),
  ],
);

/** Concessões administrativas são separadas de cobranças para manter a auditoria. */
export const memberAccessGrants = sqliteTable(
  "member_access_grants",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    memberId: integer("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    grantType: text("grant_type", { enum: ["complimentary"] }).notNull().default("complimentary"),
    reason: text("reason").notNull(),
    grantedByUserId: text("granted_by_user_id").notNull(),
    startsAt: text("starts_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    expiresAt: text("expires_at"),
    revokedAt: text("revoked_at"),
    revokedByUserId: text("revoked_by_user_id"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("member_access_grants_member_idx").on(table.memberId, table.grantType, table.revokedAt),
  ],
);

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    memberEmail: text("member_email").notNull(),
    provider: text("provider").notNull().default("stripe"),
    providerCustomerId: text("provider_customer_id"),
    providerSubscriptionId: text("provider_subscription_id").notNull(),
    offerId: integer("offer_id").references(() => offers.id, { onDelete: "set null" }),
    planName: text("plan_name").notNull(),
    status: text("status", {
      enum: ["active", "past_due", "canceled", "trialing", "unpaid", "incomplete"],
    }).notNull().default("active"),
    currentPeriodEnd: text("current_period_end"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("subscriptions_provider_unique").on(table.provider, table.providerSubscriptionId),
    index("subscriptions_member_idx").on(table.memberEmail),
    index("subscriptions_status_idx").on(table.status),
  ],
);

export const memberEntitlements = sqliteTable(
  "member_entitlements",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    memberEmail: text("member_email").notNull(),
    accessKey: text("access_key").notNull().default("all_courses"),
    source: text("source").notNull().default("stripe"),
    sourceReference: text("source_reference").notNull(),
    status: text("status", {
      enum: ["active", "past_due", "canceled", "blocked"],
    }).notNull().default("active"),
    currentPeriodEnd: text("current_period_end"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("member_entitlements_source_unique").on(
      table.source,
      table.sourceReference,
      table.accessKey,
    ),
    index("member_entitlements_member_idx").on(table.memberEmail),
    index("member_entitlements_status_idx").on(table.status),
  ],
);

export const stripeEvents = sqliteTable(
  "stripe_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventId: text("event_id").notNull(),
    type: text("type").notNull(),
    livemode: integer("livemode", { mode: "boolean" }).notNull().default(false),
    // Registros legados são tratados como já processados na migration; novos
    // eventos são sempre inseridos explicitamente como `processing` no webhook.
    status: text("status", { enum: ["processing", "processed"] }).notNull().default("processed"),
    lastError: text("last_error").notNull().default(""),
    processedAt: text("processed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("stripe_events_event_unique").on(table.eventId),
    index("stripe_events_type_idx").on(table.type),
  ],
);

export const tutorSettings = sqliteTable("tutor_settings", {
  id: integer("id").primaryKey().default(1),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  tone: text("tone", {
    enum: ["execution_mentor", "didactic_teacher", "strategic_consultant"],
  }).notNull().default("execution_mentor"),
  customInstructions: text("custom_instructions").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    actorUserId: text("actor_user_id").notNull(),
    actorEmail: text("actor_email").notNull(),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    detailsJson: text("details_json").notNull().default("{}"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("audit_logs_entity_idx").on(table.entityType, table.entityId, table.createdAt)],
);

export const podcastEpisodes = sqliteTable(
  "podcast_episodes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    guestName: text("guest_name").notNull().default(""),
    seasonNumber: integer("season_number"),
    episodeNumber: integer("episode_number"),
    publishedAt: text("published_at"),
    thumbnailUrl: text("thumbnail_url").notNull().default(""),
    externalUrl: text("external_url").notNull().default(""),
    status: text("status", { enum: ["draft", "published", "archived"] }).notNull().default("draft"),
    position: integer("position").notNull().default(0),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("podcast_episodes_slug_unique").on(table.slug),
    index("podcast_episodes_status_position_idx").on(table.status, table.position),
  ],
);

export const benefits = sqliteTable(
  "benefits",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    category: text("category").notNull(),
    description: text("description").notNull().default(""),
    benefit: text("benefit").notNull(),
    conditions: text("conditions").notNull().default(""),
    validUntil: text("valid_until"),
    coverage: text("coverage").notNull().default(""),
    ctaLabel: text("cta_label").notNull().default("Saiba mais"),
    ctaUrl: text("cta_url").notNull().default(""),
    status: text("status", { enum: ["active", "inactive", "coming_soon"] }).notNull().default("inactive"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("benefits_slug_unique").on(table.slug),
    index("benefits_status_category_idx").on(table.status, table.category),
  ],
);

export const ombudsmanMessages = sqliteTable(
  "ombudsman_messages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    memberEmail: text("member_email").notNull(),
    memberAuthUserId: text("member_auth_user_id").notNull(),
    type: text("type", { enum: ["suggestion", "complaint", "problem", "feedback"] }).notNull(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    status: text("status", { enum: ["received", "in_progress", "completed"] }).notNull().default("received"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("ombudsman_member_idx").on(table.memberEmail, table.createdAt),
    index("ombudsman_status_idx").on(table.status, table.createdAt),
  ],
);

/**
 * Eventos ficam no mesmo banco operacional que cursos e matrículas. A fonte
 * de autenticação continua no Supabase; por isso `checkedInBy` guarda o ID do
 * usuário autenticado, sem duplicar credenciais no D1.
 */
export const events = sqliteTable(
  "events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    bannerUrl: text("banner_url").notNull().default(""),
    startsAt: text("starts_at").notNull(),
    endsAt: text("ends_at"),
    locationName: text("location_name").notNull().default(""),
    city: text("city").notNull().default(""),
    capacity: integer("capacity"),
    registrationDeadline: text("registration_deadline"),
    allowGuests: integer("allow_guests", { mode: "boolean" }).notNull().default(false),
    maxGuestsPerMember: integer("max_guests_per_member").notNull().default(0),
    status: text("status", {
      enum: ["draft", "published", "completed", "cancelled"],
    })
      .notNull()
      .default("published"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("events_slug_unique").on(table.slug),
    index("events_starts_at_idx").on(table.startsAt),
    index("events_status_idx").on(table.status),
  ],
);

/**
 * Convidados existem independentemente de um evento para que o histórico de
 * presença e o anfitrião original sejam preservados caso a pessoa vire membro.
 */
export const eventGuests = sqliteTable(
  "event_guests",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    company: text("company").notNull().default(""),
    jobTitle: text("job_title").notNull().default(""),
    hostMemberId: integer("host_member_id").references(() => members.id, {
      onDelete: "set null",
    }),
    hostName: text("host_name").notNull().default(""),
    firstEventId: integer("first_event_id").references(() => events.id, {
      onDelete: "set null",
    }),
    convertedMemberId: integer("converted_member_id").references(() => members.id, {
      onDelete: "set null",
    }),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("event_guests_host_idx").on(table.hostMemberId),
    index("event_guests_converted_member_idx").on(table.convertedMemberId),
    index("event_guests_name_idx").on(table.fullName),
  ],
);

export const eventAttendees = sqliteTable(
  "event_attendees",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    memberId: integer("member_id").references(() => members.id, {
      onDelete: "set null",
    }),
    guestId: integer("guest_id").references(() => eventGuests.id, {
      onDelete: "set null",
    }),
    attendeeType: text("attendee_type", { enum: ["member", "guest"] })
      .notNull()
      .default("member"),
    // Identidade estável da pessoa dentro de um evento. Ela protege a lista da
    // porta contra cargas concorrentes, inclusive quando um membro ainda não
    // possui uma conta vinculada no banco.
    rosterKey: text("roster_key").notNull().default(""),
    // Snapshots permitem montar a lista da porta mesmo quando uma conta ainda
    // não foi vinculada ao cadastro definitivo no Supabase.
    displayName: text("display_name").notNull(),
    company: text("company").notNull().default(""),
    phone: text("phone").notNull().default(""),
    avatarUrl: text("avatar_url").notNull().default(""),
    hostMemberId: integer("host_member_id").references(() => members.id, {
      onDelete: "set null",
    }),
    hostName: text("host_name").notNull().default(""),
    status: text("status", {
      enum: ["expected", "present", "absent", "cancelled"],
    })
      .notNull()
      .default("expected"),
    checkedInAt: text("checked_in_at"),
    checkedInBy: text("checked_in_by"),
    checkedInByEmail: text("checked_in_by_email").notNull().default(""),
    addedAtDoor: integer("added_at_door", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("event_attendees_member_unique").on(table.eventId, table.memberId),
    uniqueIndex("event_attendees_guest_unique").on(table.eventId, table.guestId),
    uniqueIndex("event_attendees_roster_unique").on(table.eventId, table.rosterKey),
    index("event_attendees_event_status_idx").on(table.eventId, table.status),
    index("event_attendees_event_type_idx").on(table.eventId, table.attendeeType),
    index("event_attendees_name_idx").on(table.displayName),
    index("event_attendees_host_idx").on(table.hostMemberId),
  ],
);

export const checkInHistory = sqliteTable(
  "check_in_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    attendeeId: integer("attendee_id")
      .notNull()
      .references(() => eventAttendees.id, { onDelete: "cascade" }),
    previousStatus: text("previous_status", {
      enum: ["expected", "present", "absent", "cancelled"],
    })
      .notNull()
      .default("expected"),
    newStatus: text("new_status", {
      enum: ["expected", "present", "absent", "cancelled"],
    }).notNull(),
    changedBy: text("changed_by").notNull(),
    changedByEmail: text("changed_by_email").notNull().default(""),
    changedAt: text("changed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("check_in_history_attendee_idx").on(table.attendeeId, table.changedAt),
  ],
);
