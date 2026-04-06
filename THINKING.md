# THINKING.md — Week 1 Architecture Decisions

Every decision made during Week 1, explained in full detail:
what we did, why we did it, what we considered and dropped, and the exact reasoning behind each call.

---

## 1. Why a Separate Repo (`upstar-app`) Instead of the Same Repo as the Presentation Site

The presentation site (`almogya/UpStar`) is a single static HTML file — it has no build step,
no dependencies, no deployment pipeline beyond GitHub Pages. The application we are building is a
full-stack SaaS product with a Next.js frontend, a Python worker service, Terraform infrastructure
code, SQL migrations, and environment secrets management.

Mixing these two concerns into one repository would create several problems:
- GitHub Pages (which serves the presentation site) would try to deploy the entire application
  folder, including server-side code it cannot execute.
- Pull requests would mix infrastructure changes with presentation copy changes, making code
  review noisy and unclear.
- The two codebases have entirely different deployment pipelines: the presentation site deploys
  automatically on every `git push`, while the application requires a structured CI/CD pipeline
  with secrets, Docker builds, and AWS deployments.

**Considered and dropped:** Monorepo with workspaces (e.g. Turborepo). This would work technically,
but adds tooling complexity (workspace config, shared packages) that is not justified at this stage.
We are a small team with a tight April deadline — we do not need the overhead of a monorepo until
we have multiple packages that genuinely share code.

---

## 2. Why Next.js (and Not Something Else)

The dashboard the hotel managers will use needs to be a web application. Three realistic options:

**Option A — Next.js (chosen)**
Next.js gives us the App Router, which handles both the React frontend and the API routes in one
codebase. This means the webhook endpoint, the authentication routes, and the hotel dashboard UI
all live in a single deployable unit during development. Server Components let us query the
database directly on the server without building a separate REST API layer for every UI screen.
The team already uses it (per the blueprint), and it has a massive ecosystem for auth
(NextAuth), data fetching, and hosting.

**Option B — Vite + React (SPA) + Separate Express/FastAPI backend**
Splitting the frontend and backend into two separate processes is the classical architecture. It is
perfectly valid, but it doubles the deployment surface: we need to manage two servers, two build
pipelines, and handle CORS. For a team that is moving fast and using AI to generate code, having
one unified codebase reduces cognitive overhead significantly. We would revisit this split only if
the Next.js API routes became a performance bottleneck — which is unlikely for an analytics
dashboard that serves hotel managers, not millions of concurrent users.

**Option C — Remix**
Remix has excellent data loading primitives and is arguably a better framework for form-heavy,
server-rendered applications. However, its ecosystem is smaller, fewer Claude Code / v0 outputs
will match it by default, and the team's familiarity is with Next.js. Switching to Remix to gain
marginal benefits does not make sense given the timeline.

**Why TypeScript was non-negotiable:** The pipeline handles complex nested data structures — review
payloads, atomic items, confidence scores, category mappings. Without TypeScript, a mistyped field
name in a database query would only surface at runtime, potentially corrupting the analytical
database. TypeScript catches these errors at compile time, which is especially important when the
code is AI-generated and needs to be reviewed rather than line-by-line written.

**Why Tailwind CSS:** v0 by Vercel (the tool we will use in Week 6 for UI generation) outputs
Tailwind by default. If we used a different CSS approach — CSS Modules, styled-components, Emotion
— we would have to convert every v0 output before it could work in our project. Tailwind keeps the
v0 workflow frictionless.

---

## 3. Why We Used `pg` (Node-Postgres) Instead of an ORM

This was a deliberate and important decision. Three main options:

**Option A — Raw `pg` (chosen)**
The `pg` library gives us direct SQL access. This matters for two specific reasons in this project:

First, pgvector queries (ANN similarity search combined with relational filters) cannot be expressed
cleanly in any ORM's query builder. We would end up writing raw SQL inside the ORM anyway, which
defeats the purpose of using one.

Second, the time-series aggregation queries in Stage 6 (month-over-month deltas, percentage share
calculations, window functions) are analytically complex. ORMs tend to generate verbose, suboptimal
SQL for these patterns. Writing them directly gives us full control over the query plan and index
usage.

**Option B — Prisma**
Prisma is the most popular ORM for Next.js and TypeScript. It generates a type-safe client from a
schema file, which is genuinely useful for CRUD operations. However:
- Prisma does not support pgvector natively. There are community workarounds using `$queryRaw`, but
  this breaks the type safety Prisma promises and adds a maintenance burden.
- Prisma's migration system would conflict with our handwritten SQL migrations, which are necessary
  because we need to run `CREATE EXTENSION vector` and create HNSW indexes with specific parameters
  that Prisma cannot express.
- Prisma adds a significant cold start penalty due to the Rust-based query engine binary it bundles.
  This matters for serverless/edge runtimes.

**Option C — Drizzle ORM**
Drizzle is a newer ORM that is lighter than Prisma and supports raw SQL escapes more elegantly. It
also has a better story for edge runtimes. However, its pgvector support is still limited at this
stage, and the community / AI training data around Drizzle is smaller than Prisma. Since Claude
Code generates the database queries, larger training data coverage means better-quality output.

**Decision:** Use `pg` with a thin wrapper (`query` and `queryOne` helpers in `src/lib/db.ts`).
We get full SQL control, pgvector compatibility, and zero cold-start overhead.

---

## 4. The Database Schema — Every Table and Why It Exists

### `hotels`
The entire system is multi-tenant — each hotel is an isolated entity. Every other table has a
`hotel_id` foreign key. This is the root of the data hierarchy. The `plan` column (free/premium)
is stored here so that a single query can determine which features to unlock for a given hotel
without joining to a separate subscriptions table. We will add Stripe subscription ID here in a
later week when billing is implemented.

### `raw_reviews`
This table stores exactly the 12 fields mandated by the SOW, nothing more. The normalization layer
(Week 2) will be responsible for discarding all other fields from the Apify payload before
inserting here. The `external_id` column has a UNIQUE constraint — this is how we implement
idempotent ingestion. If the Apify webhook fires twice for the same review (retries, bugs), the
second insert fails silently on conflict rather than creating a duplicate. `user_name_hash` stores
a hashed version of the original username — the plaintext is never persisted (GDPR compliance).

### `atomic_items`
Each row here is a single-topic unit extracted from a review by Claude (Stage 3). The `check_out_date`
column is denormalized (copied from `raw_reviews`) even though we could always join to get it. This
denormalization exists for a specific performance reason: Stage 6 requires filtering all atomic items
by checkout date across potentially millions of rows. A JOIN to `raw_reviews` on every such query
would be expensive. By storing `check_out_date` directly on `atomic_items`, a simple `WHERE
check_out_date BETWEEN ...` query can use a B-tree index without touching `raw_reviews` at all.
The `embedding` column (added in migration 002) stores the vector representation of the item text,
used in Stage 5 for semantic similarity search.

### `consensus_categories`
This stores the output of Stage 4 — the 20 validated categories (10 positive, 10 negative) per hotel.
The `model_votes` column records how many of the 4 models agreed on this category, which gives us
an audit trail and allows us to display confidence-in-consensus on the dashboard. The
UNIQUE(hotel_id, label) constraint prevents duplicate categories from being inserted if the
consensus pipeline runs multiple times.

### `category_mappings`
This is the central mapping table — it connects every atomic item to its final category (or marks it
as OTHER/IRRELEVANT). The `confidence` column stores the calibrated logprob score (0.0 to 1.0).
The `classification` enum makes it explicit which bucket the item fell into. Again, `check_out_date`
is denormalized here for the same reason as in `atomic_items` — Stage 6 aggregations filter by this
column constantly.

### `category_stats`
This table is pre-aggregated. Rather than running expensive GROUP BY queries across millions of
category_mappings rows every time a hotel manager loads the dashboard, the pipeline populates this
table after every run. The UI reads directly from here, which makes dashboard queries O(1) — a
simple SELECT WHERE hotel_id = ? AND period_month BETWEEN ? AND ?. The `mom_delta` column stores
the pre-computed month-over-month change so the UI does not need to do any arithmetic.

### `ingestion_cursors`
This is the delta scraping mechanism. After each Apify run, we update this row with the most
recently processed review's ID and date. When the next Apify run is scheduled, we pass these
values as parameters to the actor so it only fetches reviews newer than the cursor. Without this
table, we would re-scrape and re-process the entire review history on every run — wasteful and
expensive.

---

## 5. Why Two Separate Migration Files

**`001_initial_schema.sql`** creates all the relational tables. It has no external dependencies —
it only requires standard PostgreSQL.

**`002_pgvector.sql`** requires the `pgvector` extension to be installed on the database server
first. On Amazon RDS, you must explicitly enable extensions via `CREATE EXTENSION`. By separating
this into a second migration file, we can run `001` immediately after provisioning RDS (to verify
connectivity and schema correctness), and run `002` only after confirming that pgvector is enabled
on the specific RDS instance. If we combined them into one file, a failure on the extension step
would roll back the entire schema, leaving nothing.

---

## 6. Why HNSW Over IVFFlat for the Vector Index

pgvector supports two vector index types: IVFFlat and HNSW (Hierarchical Navigable Small World).

**IVFFlat** divides the vector space into buckets (Voronoi cells) and searches only the nearest
buckets. It requires a training step (running `VACUUM` or specifying `lists` parameter) and its
recall degrades if the data distribution shifts. It is faster to build but slower to query at high
recall rates.

**HNSW (chosen)** builds a multi-layer navigable graph. It has higher build time and more memory
usage than IVFFlat, but its query performance at ≥99% recall is significantly better. Critically,
HNSW does not require a training step — it maintains accuracy as data is incrementally inserted,
which is exactly our pattern (new reviews arrive daily). For our use case — daily incremental
inserts and interactive dashboard queries where recall accuracy directly impacts the quality of
semantic search results — HNSW is the correct choice.

The parameters `m = 16, ef_construction = 64` are the pgvector recommended defaults. `m` controls
the number of connections per node (higher = better recall, more memory). `ef_construction` controls
the search depth during index build (higher = better index quality, slower build). These defaults
give a good recall/speed tradeoff and can be tuned later if benchmarks reveal a bottleneck.

**Embedding dimension of 1536:** This matches the output dimension of OpenAI's `text-embedding-3-small`
and Anthropic's embedding models. If we switch embedding providers, we may need to adjust this and
rebuild the index — but 1536 is the safe default for the current ecosystem.

---

## 7. Why Terraform Over AWS CDK

Both tools provision AWS resources from code. The architectural blueprint specified Terraform, but
we considered CDK seriously:

**AWS CDK (dropped)**
CDK uses TypeScript (or Python) to define infrastructure. Since the application is already TypeScript,
there is an appeal to using one language for everything. CDK also handles certain AWS-specific
abstractions elegantly (e.g., it auto-creates IAM roles with least-privilege permissions when you
connect two constructs). However:
- CDK synthesizes to CloudFormation, which is verbose and harder to debug when something goes wrong.
- CDK's TypeScript types are AWS-specific — Claude Code is far better trained on Terraform HCL than
  CDK TypeScript for infrastructure code. The AI output quality is noticeably higher for Terraform.
- Terraform's plan output (`terraform plan`) is exceptionally readable — it shows exactly what will
  be created, modified, or destroyed before any action is taken. This is critical for a team that
  wants to review AI-generated infrastructure changes before applying them.
- Terraform is provider-agnostic. If we ever need to provision resources on a non-AWS provider
  (e.g., Cloudflare for DNS, Datadog for monitoring), Terraform handles it uniformly. CDK is
  AWS-only.

**Decision:** Terraform with an S3 remote backend for state storage.

**Why Remote State:** Terraform stores the state of your infrastructure in a `.tfstate` file.
If this file is local, two team members running `terraform apply` simultaneously will corrupt the
state. The S3 backend stores the state file in a shared S3 bucket and uses DynamoDB for state
locking (preventing concurrent applies). This is standard production practice and the only safe
approach for a team environment.

---

## 8. VPC Architecture — Public and Private Subnets

We provision two public subnets and two private subnets across two Availability Zones (AZs).

**Why two AZs:** AWS requires a minimum of two subnets in different AZs for RDS Multi-AZ deployments
and for the Application Load Balancer. Even if we do not enable Multi-AZ on RDS immediately (to
save cost), the subnet group must span two AZs. This also gives us resilience — if one AZ goes
down, traffic routes to the other.

**Why private subnets for RDS and ECS workers:** The database must never be directly reachable
from the internet. By placing it in a private subnet with a security group that only allows
inbound port 5432 from the ECS worker security group, we enforce network-level isolation. Even
if an attacker obtained the database credentials, they cannot reach the endpoint without being
inside the VPC. ECS workers also live in private subnets because they should not be directly
addressable — they pull tasks from SQS and push results to the database. There is no reason for
them to have a public IP.

**Why public subnets for the ALB:** The Application Load Balancer must be reachable from the
internet (it is the entry point for hotel managers accessing the dashboard and for Apify webhooks
posting to our API). ALBs in AWS require at least two public subnets. The ALB's security group
only opens ports 80 and 443.

---

## 9. Why RDS PostgreSQL 16 (Not Aurora, Not Neon, Not Supabase)

**Aurora PostgreSQL (dropped):** Aurora is a distributed PostgreSQL-compatible database with
significantly higher throughput than standard RDS. However, Aurora starts at roughly $0.10/hr
for the cheapest configuration versus $0.034/hr for a `db.t3.micro`. For our early-stage product
with a handful of hotel clients, Aurora is expensive overkill. Aurora also has a minimum 10GB
storage billing floor. We would revisit Aurora when we approach thousands of hotels or when
query latency becomes a measurable issue.

**Neon (dropped):** Neon is a serverless PostgreSQL provider with excellent scale-to-zero economics
and native pgvector support. It is genuinely compelling for this use case. We dropped it because:
- Neon's serverless model introduces cold start latency (seconds) on the first query after idle
  periods. For a pipeline that fires after each Apify run, a 3-second cold start on the database
  connection is unacceptable.
- Neon's branching and serverless features are most valuable during development, less so in
  production pipelines.
- We want to keep all production infrastructure inside AWS to simplify IAM, networking, and billing.

**Supabase (dropped):** Supabase provides PostgreSQL with pgvector, auth, and an auto-generated
REST API. For a project that is specifically building its own AI pipeline and auth layer (NextAuth),
Supabase's auto-generated features would conflict with our architecture rather than help it. We
would be paying for features we deliberately do not use.

**RDS PostgreSQL 16 (chosen):** Standard, managed, AWS-native. We get automated backups, point-in-time
recovery, encryption at rest, and monitoring through CloudWatch — all without managing a database
server. PostgreSQL 16 supports pgvector via the extension mechanism. `db.t3.medium` gives us 2 vCPUs
and 4GB RAM — more than sufficient for the initial launch, and easily scaled vertically to `db.t3.large`
or `db.r6g` when needed.

**`deletion_protection = true`:** This prevents the database from being accidentally destroyed by a
`terraform destroy` command. We have to explicitly disable this flag before RDS will allow deletion.
This is a production safeguard — losing the hotel analytics database would be catastrophic.

---

## 10. Why SQS FIFO Over Standard Queues

SQS offers two queue types: Standard and FIFO.

**Standard queues:** Offer unlimited throughput but allow messages to be delivered out of order and
potentially more than once (at-least-once delivery). For our pipeline, this is problematic. If a
DECOMPOSE message for hotel A arrives after a MAP message for hotel A (due to ordering), the mapper
would try to categorize items that have not been decomposed yet. We would need idempotency and retry
logic throughout the entire pipeline to handle this.

**FIFO queues (chosen):** Guarantee exactly-once processing and preserve message order within a
message group. We use `hotel_id` as the `MessageGroupId`, which means all pipeline messages for a
given hotel are processed in strict order, but different hotels can be processed in parallel (different
message groups). This eliminates an entire class of race conditions with no extra code.

The tradeoff is throughput: FIFO queues support up to 3,000 messages per second with batching.
Given that we process at most one batch of reviews per hotel per day, we will never get anywhere
near this limit.

**Dead Letter Queue (DLQ):** After 3 failed processing attempts (an LLM API timeout, a database
error, a rate limit), the message moves to the DLQ instead of being silently dropped. Operations
can inspect the DLQ, fix the root cause, and re-drive the messages back to the main queue.
`maxReceiveCount = 3` means we try 3 times before giving up — enough to handle transient failures
without looping infinitely on a broken message.

**Visibility timeout of 900 seconds (15 minutes):** When a worker picks up a message, SQS hides
it from other workers for 900 seconds. If the worker does not delete the message within that window
(because it crashed or timed out), SQS makes the message visible again for another worker to pick
up. 15 minutes is generous for an LLM API call (which typically takes seconds to minutes), but we
set it high to accommodate worst-case latency on the multi-model consensus step (4 parallel API calls
that could each take 30+ seconds).

---

## 11. Why ECS Fargate Over Lambda and Over EC2

The pipeline worker is the most critical infrastructure decision in this week.

**AWS Lambda (dropped):** Lambda is the natural choice for event-driven workloads triggered by SQS.
Lambda integrates natively with SQS — it can poll the queue and invoke functions automatically.
However, Lambda functions have a hard 15-minute execution timeout. The Stage 4 consensus step calls
four LLM APIs in parallel, and the Stage 7 synthesis step calls GPT with a large context. In
production, with rate limiting and retries, these steps could easily exceed 15 minutes for a large
hotel with thousands of reviews. Lambda would silently kill the function mid-pipeline, leaving the
job in an incomplete state. Additionally, Lambda cold starts on a Python function with multiple AWS
SDK dependencies can add 2-5 seconds of latency per invocation.

**EC2 (dropped):** Running a persistent EC2 instance to poll SQS would work, but we would be paying
for the instance 24/7 even when there is no work to do. A `t3.medium` EC2 instance costs ~$30/month
running continuously. With ECS Fargate, we pay only for the seconds the task is actually running.
EC2 also requires us to manage the OS, apply security patches, and handle instance failures — none
of which are worth the overhead for a worker that runs infrequently.

**ECS Fargate (chosen):** Fargate runs containers without managing servers. We define the task
(CPU, memory, Docker image, environment variables) and Fargate handles the compute. Because the
worker polls SQS itself rather than being invoked by Lambda, there is no execution time limit.
A long-running consensus job can take as long as it needs. Fargate scales based on SQS queue depth
via Application Auto Scaling (which we will add in Week 7) — when the queue is empty, we scale to
zero tasks. When reviews come in, tasks spin up within ~30 seconds.

The `desired_count = 1` in the current Terraform is a starting point. Auto Scaling will adjust this
dynamically based on the number of messages in the queue.

---

## 12. The Application Load Balancer — Why Not API Gateway

Two options for routing HTTP traffic to the Next.js application:

**AWS API Gateway (dropped):** API Gateway is a managed HTTP entry point that integrates with Lambda.
Since we chose Fargate (not Lambda) for the backend, API Gateway does not fit naturally. It also
has a 29-second integration timeout — identical to Lambda's timeout issue, just at the HTTP layer.
The Apify webhook POST could trigger a slow pipeline initialization that exceeds this limit.

**ALB (chosen):** The ALB routes traffic to ECS containers (or to a Next.js deployment). It supports
WebSockets (relevant if we add real-time dashboard updates later), has no request timeout limits,
and integrates natively with AWS Certificate Manager for free SSL certificates. The HTTP-to-HTTPS
redirect listener ensures that all traffic is encrypted without requiring application-level handling.

**`/api/health` endpoint:** We created this minimal route specifically for ALB health checks. The
ALB pings this endpoint every 30 seconds. If it returns a non-200 response, the ALB stops routing
traffic to that container and waits for recovery. Without a health check endpoint, the ALB has no
way to know whether the application is ready to handle traffic.

---

## 13. The `.env.example` File — Design Decisions

Every secret the application needs is documented here with:
1. A clear comment explaining which service it belongs to
2. A descriptive variable name that makes its purpose obvious
3. A placeholder value (for the DATABASE_URL) showing the exact format

We explicitly `.gitignore` the actual `.env.local`, `.env.production`, and `.env.staging` files.
The Terraform variables file (`terraform.tfvars`, which contains `db_password`) is also gitignored.
Committing secrets to a public GitHub repository would immediately expose them to credential-scanning
bots that index GitHub in real time.

**Why `NEXTAUTH_SECRET`:** NextAuth v5 (beta) uses this to sign and encrypt session tokens. Without
it set, the application will crash on startup in production. It must be a random 32+ character
string — never a human-readable password.

**Why separate `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_AI_API_KEY`, `PERPLEXITY_API_KEY`:**
The multi-model consensus stage calls all four providers independently. Each requires its own
API key and billing account. Keeping them as separate environment variables means we can rotate
one key without touching the others, and can set different keys per environment (staging vs
production may use different API accounts with separate rate limits and spending caps).

---

## 14. The `src/lib/queue.ts` — The `QueueMessageType` Enum

The queue message type enum (`DECOMPOSE`, `CONSENSUS`, `MAP`, `AGGREGATE`, `INSIGHTS`) maps
directly to the 7 pipeline stages (some stages share a type because they are sequential sub-steps).
By making this a TypeScript union type rather than a string, any worker code that receives a message
and does a `switch (message.type)` will get a compile-time error if it fails to handle a new message
type we add later. This is exactly the kind of correctness guarantee that matters when the code is
AI-generated — TypeScript catches the gaps that a human reviewer might miss.

---

## Summary of What Week 1 Is NOT

Equally important to understand what we deliberately did not build this week:

- **No authentication UI:** The login/signup pages exist as empty folders but contain no code yet.
  We need the database and infrastructure in place before we can design the auth flow properly.
- **No dashboard UI:** Same reason — we need the data layer working before building the interface
  that reads from it.
- **No actual AWS deployment:** The Terraform files are written but not yet applied. Applying
  Terraform requires AWS credentials, a pre-created S3 bucket for the state backend, and a conscious
  decision to start incurring AWS costs. This is a deliberate action that requires the team's sign-off.
- **No Python worker:** The ECS task definition references a Docker image (`var.worker_image`) but
  that image does not exist yet. The Python pipeline worker will be built in Weeks 3–5 as we
  implement each stage.
- **No actual database connection:** `src/lib/db.ts` exists and is correct, but it will throw until
  `DATABASE_URL` is populated in `.env.local` pointing to a running PostgreSQL instance.

These are not gaps — they are the correct sequencing. Infrastructure is defined before it is applied.
Schema is designed before it is connected to. The foundation is solid. Everything else builds on top.
