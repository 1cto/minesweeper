# Research: a global Best Times leaderboard

Status: research notes for the owner to grill. Nothing here is decided. Researched on 2026-11-01.

Today every browser keeps its own Best Times: `src/ui/bestTimes.ts` decides when a Win beats its Difficulty's Best Time, and `src/ui/storage.ts` keeps them in `localStorage` on the shared `https://1cto.github.io` origin. There is no backend. These notes ask whether a **global** list is feasible, so players can see each other's times, and what it would cost in hosting, trust in the times, and privacy.

> **Glossary gap.** `CONTEXT.md` defines a Best Time as the one time per Difficulty that a Win must beat to replace it, which is the original game's model. A shared list of many players' Wins is a new concept. These notes call it the **global leaderboard** for now. If the idea goes ahead, `/domain-modeling` should name it, along with the other new terms used below: _seed_, _action log_, _replay_ and _3BV_.

## How the sources were read

The environment's outbound proxy blocks most documentation hosts. Every claim below says how its source was reached:

- **[fetched]**: the primary text was read directly. For docs sites this means the site's own source repository, read through `raw.githubusercontent.com`: `cloudflare/cloudflare-docs` (branch `production`), `supabase/supabase`, `github/docs`, `whatwg/fetch`, `mdn/content` and the Lichess repositories. Apple's help pages were fetched directly.
- **[index]**: the official page could not be fetched, but the Context7 documentation index returned excerpts of it, attributed to the official URL. The text is the vendor's own. Only the delivery channel is secondary.
- **[search]**: the official page could not be fetched, and its content was confirmed only through search-engine excerpts of that exact page. Treat these as unverified until someone opens the link.
- **[unverified]**: stated from general knowledge with no source reachable. Each one is marked where it appears.

Unreachable hosts (proxy 403, or DNS failure in the fetch tool): developers.cloudflare.com, cloudflare.com, supabase.com, firebase.google.com, developers.google.com, vercel.com, netlify.com, docs.netlify.com, docs.github.com, github.com (web and API), developer.mozilla.org, fetch.spec.whatwg.org, eur-lex.europa.eu, edpb.europa.eu, ec.europa.eu, commission.europa.eu, data.europa.eu, op.europa.eu, publications.europa.eu, edps.europa.eu, cnil.fr, dataprotection.ie, bfdi.bund.de, ico.org.uk, gdpr-info.eu, partner.steamgames.com, lichess.org, minesweepergame.com, minesweeper.online, speedrun.com, owasp.org, perspectiveapi.com, deno.com, val.town, render.com, fly.io, pocketbase.io, appwrite.io, convex.dev, unpkg.com and cdn.jsdelivr.net. Prices and limits change often, so recheck the live pricing pages before acting on any number.

---

## 1. Hosting and storage options

GitHub Pages serves only static files, and its usage policy rules out running "an online business, e-commerce site, or … commercial software as a service" on it [G1, fetched]. The leaderboard's API must therefore live on another host, on another origin. That makes every option below a cross-origin call from `https://1cto.github.io`.

### Illustrative workload

To turn free-tier limits into something concrete, assume a modest hobby load: **5,000 Games started, 500 Wins submitted and 5,000 leaderboard views a day**, with each view showing the top 10 for each of the three Difficulties (30 entries). These figures are assumptions, not measurements.

### Comparison

| Option                                                                                                          | Free tier, as it bites a leaderboard                                                                                                                                                                                                                                                                                                                                                         | Cost at small scale                                                                                                                                                                                                                                           | CORS from `https://1cto.github.io`                                                                                                                                                                             | Operational burden                                                                                                                                                                                                                                                       | Lock-in                                                                                                       |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Cloudflare Workers + D1** (SQLite)                                                                            | Workers: 100,000 requests/day, reset at midnight UTC, and 10 ms CPU per invocation; over the limit a request gets Error 1027 [C1, C2]. D1: 5 M rows read/day, 100 k rows written/day, 5 GB in total, 500 MB per database, 10 databases; over the limit queries fail until 00:00 UTC [C3, C4].                                                                                                | Workload: about 5.5–10.5 k requests/day (≈5–10 % of the cap). With an index, about 150 k rows read/day (3 %) and 1–15 k rows written/day (≤15 %): **$0**. Workers Paid starts at **$5/month** with 10 M requests/month included, then $0.30 per million [C1]. | You write the headers in the Worker, including the `OPTIONS` preflight; Cloudflare's example does exactly this [C9].                                                                                           | `wrangler deploy` or a Git-connected Workers Builds pipeline [C14]; secrets via `wrangler secret put` [C12]; Workers Logs on Free: 200 k events/day kept for 3 days [C13]. A second account and deploy beside GitHub Pages.                                              | Low to medium. The Worker uses standard `Request`/`Response`; D1 is SQLite; bindings are Cloudflare-specific. |
| **Cloudflare Workers + KV**                                                                                     | 100 k reads/day, **1,000 writes/day**, 1 GB [C5]. **1 write per second to the same key** [C6]. Eventually consistent: "may take up to 60 seconds or more" to show elsewhere [C7].                                                                                                                                                                                                            | 500 entries/day fit, but one session record per Game started (5,000/day) does not. Paid: 1 M writes/month included, then $5 per million [C5].                                                                                                                 | As above.                                                                                                                                                                                                      | As above.                                                                                                                                                                                                                                                                | As above.                                                                                                     |
| **Supabase** (Postgres + Data API + RLS, optionally Edge Functions)                                             | $0: "Unlimited API requests", 500 MB database, 5 GB egress, 500,000 Edge Function invocations/month. "Free projects are paused after 1 week of inactivity. Limit of 2 active projects." [B1, B2]                                                                                                                                                                                             | Workload fits: about 10.5 k function calls/day against roughly 16 k/day allowed. Pro starts at **$25/month** [B1]. Edge Functions bill per started million on paid plans [B3].                                                                                | Data API gateway: "All origins allowed … The auth boundary for Supabase APIs is the `apikey` header rather than the request origin" [B7]. Edge Functions: add headers yourself, or use `withSupabase` [B4].    | Dashboard plus CLI migrations. **RLS is on you**: on projects with the old default grants, a new `public` table starts with every privilege granted to `anon`, and "Adding policies doesn't take those grants back" [B5, B6]. The pause after inactivity needs watching. | Low. Plain Postgres; Edge Functions run on Deno.                                                              |
| **Firebase**: Firestore + Security Rules, optionally Cloud Functions                                            | Firestore: 50,000 document reads/day, 20,000 writes/day, 1 GiB, resetting around midnight Pacific; one free database per project [F1, index]. **Cloud Functions require the pay-as-you-go Blaze plan** (a billing account), with 2 M invocations/month at no cost [F3, F4, index].                                                                                                           | Reads are the tight spot: 5,000 views × 30 documents = 150 k reads/day, three times the free quota, unless the top lists are kept in one document per Difficulty (≈15 k reads/day). On Blaze, "budget alerts are _not_ budget caps" [F8, index].              | Firestore is reached through Google's SDK; access is governed by Security Rules, and I found no CORS setting to manage. HTTP Cloud Functions take a `cors` option with strings, regexes or `true` [F7, index]. | Rules deploys via the Firebase CLI; a billing account for Functions.                                                                                                                                                                                                     | High. Firestore's data model and the Rules language are proprietary.                                          |
| **Vercel Functions** + a Marketplace store                                                                      | Hobby: 1 M invocations, 4 h Active CPU and 360 GB-hrs memory included [V1, index]. Over the limit, "you will have to wait until 30 days have passed" [V2, index]. **Hobby is "non-commercial, personal use only"**; donations are allowed, ads are not [V3, index]. Vercel KV and Postgres are gone; storage comes from Marketplace providers such as Upstash, Neon or Supabase [V4, index]. | Functions fit (≈33 k/day allowed). The store's own free tier applies on top; not researched here.                                                                                                                                                             | Set the headers in the function response [unverified as a Vercel-specific doc].                                                                                                                                | Git-connected deploys; two vendors (Vercel plus the store).                                                                                                                                                                                                              | Medium. Functions are portable; the store is a third party.                                                   |
| **Netlify Functions** + Netlify Blobs                                                                           | Free plan: **300 credits/month, hard limit**. Web requests cost 2 credits per 10,000, compute 10 credits per GB-hour, and **each production deploy 15 credits** [N1, N2, index]. When credits run out, "all of your web projects … are paused" [N3, index]. Blobs are eventually consistent by default, with up to 60 s propagation, or strong on request [N4, index].                       | About 315 k requests/month ≈ 63 credits, plus compute, plus 15 credits per deploy. Fits, but a burst of deploys or traffic pauses every project on the team.                                                                                                  | Set the headers in the function response [unverified as a Netlify-specific doc].                                                                                                                               | Git-connected deploys; credit monitoring.                                                                                                                                                                                                                                | Medium. Blobs are proprietary; functions are portable.                                                        |
| **GitHub only**: submissions as Issues, checked by Actions, leaderboard JSON committed and republished to Pages | No new vendor. Players need a GitHub account, which also gives an identity for moderation. The 10-builds-per-hour soft limit "does not apply if you build and publish your site with a custom GitHub Actions workflow" [G1, fetched], and this repo deploys with one (`.github/workflows/deploy.yml`).                                                                                       | $0 within Actions minutes [unverified].                                                                                                                                                                                                                       | None needed: the Pages site only reads its own JSON.                                                                                                                                                           | Minutes of latency per submission; public issues expose GitHub usernames; abuse handling through GitHub.                                                                                                                                                                 | Low.                                                                                                          |

Notes:

- **The engine runs anywhere JavaScript runs.** `src/engine/game.ts` has no imports and no DOM, clock or randomness (ADR-0001), so the same file can run in a Worker, a Supabase Edge Function (Deno), a Cloud Function, a Vercel or Netlify function, or an Actions job. Only the options with server code can _replay_ a submitted Game (section 2). Supabase without Edge Functions and Firestore with Rules alone can check the shape of a submission, not its truth. Firestore Rules can, for example, require that a timestamp field equals `request.time`, the server's receive time [F5, index].
- **D1 fits better than KV for writes.** KV's 1,000 writes a day, its one-write-per-second-per-key limit and its 60-second propagation [C5–C7] make single-use sessions unreliable. A session checked in one location may not yet be marked used in another. KV's own docs point to Durable Objects for stronger consistency [C7]. D1 is SQL with indexes, and its free write allowance is 100 times KV's [C3].
- **Cloudflare also offers bot friction for free.** Turnstile is free with "unlimited challenges" for up to 20 widgets [C11]. A Workers rate-limiting binding exists too, but its limits are approximate and counted per Cloudflare location [C8]. Durable Objects, for server-held Game state, are available on the Workers Free plan with daily limits [C16].
- **Data location.** A D1 database can be pinned to the `eu` jurisdiction at creation time, and only then [C15]. Supabase lets you pick a specific EU region; its "Europe" grouping includes London and Zurich, which are not EU member states [B8, B9].
- **Back-ups and deletion.** D1 Time Travel keeps point-in-time history for 7 days on Free and 30 on Paid [C4]. A deleted entry therefore stays recoverable for that long, which belongs in any retention statement (section 3).

### CORS from a GitHub Pages project page

- The `Origin` header carries scheme, host and port but no path. It "does not reveal a path" [W3, fetched]. Every project page under `1cto.github.io` therefore sends the same origin, `https://1cto.github.io`. The repo already notes this shared origin in `bestTimes.ts` and `storage.ts`. The API should allow exactly that origin, plus the dev server's `http://localhost:5173`, rather than `*`.
- A `POST` with `Content-Type: application/json` is preflighted. Only `application/x-www-form-urlencoded`, `multipart/form-data` and `text/plain` are safelisted content types [W2, fetched; W4, fetched]. The server must answer `OPTIONS`. `Access-Control-Max-Age` lets the browser cache that answer [W4].
- **CORS is not access control.** The Fetch Standard describes CORS as a way for responses "to declare they can be shared with other origins"; "requirements for user agents are part of the fetch algorithm" [W1, fetched]. Browsers enforce it. `curl` or a script does not. Supabase says the same of its gateway: the auth boundary "is the `apikey` header rather than the request origin" [B7]. Nothing about CORS stops a forged score (section 2).

---

## 2. Resisting forged scores

### What a client-reported time allows

If the client sends `{ Difficulty, seconds, name }`, anyone can send `seconds: 1` for Expert from a terminal. CORS does not stop it (above), and neither does any key shipped in the page. Turnstile's docs warn that "if you expose the secret key in the front-end client code … attackers can bypass the security check" [C10, fetched], and everything on GitHub Pages is public. The Timer's floor of 1 second (`elapsedSeconds` in `game.ts`) means forged entries will simply read 1. Platform leaderboards answer this in two ways:

- **Apple Game Center** relies on after-the-fact moderation. Developers can "view and manage the top 100 scores … deleting fake scores or blocking players that engage in fraudulent behavior", and can restore removals for 30 days [A1, fetched].
- **Steam** lets a leaderboard be set to "Trusted", so that clients cannot set scores at all; only the publisher's server can, through the Web API with a publisher key [A2, search].

### Replay: what the engine already makes possible

The engine is pure (ADR-0001). `newGame(difficulty, { random, layout })` takes the random source; every `Action` (`reveal`, `cycleMarker`, `chord`) carries its own `now`; and `applyAction` is deterministic. A submission could therefore be `{ Difficulty, seed, rules version, action log }`. The server rebuilds `newGame(difficulty, { random: seeded(seed) })`, applies each action, and reads `statusOf` and `finalSeconds`.

Two engine details shape this:

- **The Layout depends on the seed and on the first Reveal's Cell.** `placeMines` draws Mines with `random()` from every Cell except the first Reveal's (`safeIndex`), when that Reveal happens. The same seed gives a different Layout for a different first Cell. The server needs no Layout from the client, and must never accept one.
- **Passing a `layout` bypasses the first-Reveal safety.** `reveal` uses `held.mines` when a Layout was given, so a server-chosen Layout could put a Mine under the first Reveal. To keep the rule "a first Reveal is never a Mine", issue seeds, not Layouts.

I measured this with a throwaway script in the scratchpad, using a copy of `game.ts`, the mulberry32 source from `src/engine/testHelpers.ts` and Node 22. A script that knows the seed made a first Reveal in the middle and then Revealed every Cell without a Mine. Its timestamps were 1 ms apart. It **Won 200 of 200 Expert Games with a Timer of 1**, averaging 218 actions per Game. Replaying each log took about **0.5 ms**. That is only an indication against Workers' 10 ms CPU limit, since it was measured in this container rather than on Workers.

### What a successful replay proves

That the action log, applied by this engine version to the Layout that this seed and this first Reveal produce, ends in a **Win**: every Cell without a Mine was Revealed and no Mine was. It also proves that the Timer value follows from the first Reveal's `now` and the last action's `now`. The submission is internally consistent and legal.

### What it cannot prove

1. **That the timestamps are real.** `now` comes from the client (`Date.now()` in `App.tsx`). Any legal log can be re-stamped into one second, which is what the script above did.
2. **That a human played.** Whoever holds the seed can compute the Layout for any first Reveal by running `placeMines`, so a bot never has to guess. Even without the seed, the client holds the Mines in memory after the first Reveal.
3. **That no solver or assistant helped.** A human can play with a solver in another window.
4. **That this was an honest attempt.** If the client picks the seed, it can search offline for easy Boards. Knowing the seed, it can also pick the first Reveal that gives the biggest Cascade. Server-issued seeds stop the first; nothing stops a player from requesting many seeds and submitting only the lucky ones, beyond counting and rate-limiting issued seeds.
5. **Who the player is.**

### Mitigations, roughly in order of cost

| Mitigation                                                                                                                                                                 | Stops                                                                                                          | Does not stop                                | Notes and sources                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shape and range checks on the server                                                                                                                                       | Malformed or out-of-range entries                                                                              | Any plausible forgery                        | Firestore Rules can type-check fields and pin a timestamp to `request.time` [F5]; Supabase RLS policies can do the same in SQL [B5].                                                                                                                                                                                                                                          |
| Rate limits per IP or session                                                                                                                                              | Floods                                                                                                         | A patient forger                             | The Cloudflare binding is approximate and per location [C8]. An IP address is personal data (section 3).                                                                                                                                                                                                                                                                      |
| Bot friction (Turnstile, App Check)                                                                                                                                        | Naive scripts                                                                                                  | Determined bots                              | Turnstile tokens are single-use, valid for 300 s, and must be verified server-side with `siteverify` [C10]. App Check "prevents some, but not all, abuse vectors" [F6, index].                                                                                                                                                                                                |
| **Server-issued, single-use seeds** in a server-side session (D1 row or Durable Object), or HMAC-signed with an expiry plus a server-side used-set                         | Self-chosen seeds; resubmitting one Game twice                                                                 | Bots; re-timed logs                          | Needs consistent storage (above). Signing needs a Worker secret [C12].                                                                                                                                                                                                                                                                                                        |
| **Replay on the server** with the shared engine                                                                                                                            | Impossible Games: wrong Difficulty, Losses claimed as Wins, a Timer not matching the log                       | Re-timed logs; bots; solvers                 | Pin a rules version: changing `placeMines`, the Cascade, the Chord or Timer arithmetic changes outcomes.                                                                                                                                                                                                                                                                      |
| **Server-side timing**: record server time when the seed is issued at the first Reveal, and again when the Win is submitted                                                | Shrinking a human Game's time: the server-measured span is an upper bound on real play the client cannot lower | Bots, which can finish within one round trip | Network delay inflates times unevenly. Lichess's server-side clock measures each move's elapsed time itself and then subtracts a lag allowance capped by a per-player quota (`comp = lag.atMost(quota)` in `LagTracker.scala`) [A3, fetched].                                                                                                                                 |
| Plausibility checks on the log: minimum gap between actions, minimum time per Difficulty, a ceiling on 3BV/s (3BV is the minimum number of actions that clear a Board)     | Crude bots and re-stamped logs                                                                                 | Human-paced bots                             | The Minesweeper community's tools compute 3BV and 3BV/s from replays (`ms_toollib`, Metasweeper) [A5, fetched]. I found no reachable primary source for human speed limits, so thresholds would have to come from the site's own data. Flag outliers for review rather than rejecting them outright.                                                                          |
| **Server-authoritative play**: the server holds the Game; the client sends each Reveal, Flag or Chord and gets back only the resulting Cell views; the server stamps `now` | Reading Mines from memory; all timestamp forgery                                                               | Solvers, which play from the Clues alone     | One round trip per action: Reveals no longer open the instant the button is released, and offline play is gone. An Expert Game takes a few hundred requests (the script above needed 218 Reveals; a human adds Flags), so the Workers Free plan's 100,000 requests a day carry roughly 400 Expert Games. The Lichess model: the game library's clock runs on the server [A3]. |
| Statistical review and moderation                                                                                                                                          | Whatever the checks above miss                                                                                 | —                                            | Lichess runs Irwin, "the AI that learns cheating patterns, marks cheaters, and assists moderators", and Kaladin [A4, fetched]. At hobby scale the realistic version is Apple's: remove entries, block abusers, keep removals restorable [A1].                                                                                                                                 |
| Signing replays inside the client                                                                                                                                          | Casual edits                                                                                                   | Anyone who extracts the key                  | Metasweeper's official replay signing lives in a closed-source module (`metaminesweeper_checksum.pyd`) [A5]. The EVF format spec cites Kerckhoffs's principle and uses a checksum rather than obfuscation [A5]. A static web page cannot keep such a module secret.                                                                                                           |

### What would change in the code (no code written)

**Engine (`src/engine/game.ts`)**

- Nothing new is needed to replay: `newGame` and `applyAction` are the replay interface, and the engine already never reads the clock or global randomness. Server-authoritative play would pass the server's time as `now` without breaking ADR-0001. A backend would deserve its own ADR. Nothing here contradicts ADR-0001; the leaderboard leans on it.
- A **seeded `RandomSource` in production code**, identical on client and server. Today `seededRandom` (mulberry32, 32-bit state) lives only in `src/engine/testHelpers.ts`, and `App.tsx` passes `Math.random`.
- A **rules version**. `placeMines`' order of `random()` draws, `indexOf`, the Cascade, the Chord and `elapsedSeconds` all become part of the scoring contract. A change to any of them must not silently re-score old submissions.
- Server-authoritative play would also need the client to render from Cell views sent by the server instead of a local `Game`. `Board.tsx` and `StatusPanel.tsx` read a `Game` through `cellView` and `mineCounter`, so this is the biggest UI change of any option.

**UI (`src/ui/`)**

- `App.tsx`: `startGame` and the initial `useReducer` state would get a seed from the server instead of using `Math.random`. A Game whose seed request fails would be playable but not eligible for the global leaderboard. The app has no network code today.
- `boardState.ts`: `applyBoardEvent` already turns every mouse request into an `Action` (`toAction`). The **action log** would accumulate there, alongside `game` in `BoardState`, and reset on `newGame`. A `Game` keeps no history of its own.
- `bestTimes.ts` and `useBestTimes.ts`: local Best Times can stay exactly as they are. A global submission is a separate concern for a new module: it decides when a Win is worth submitting (it may make the global top list without beating the local Best Time), sends the log, and handles failure, rejection and a refused name.
- `NewBestTimeDialog.tsx`: today it appears only for a new local Best Time. A global flow needs consent to publish, the name (the existing 32-character `MAX_NAME_LENGTH` limit carries over), and the server's answer.
- `BestTimesDialog.tsx` and `GameMenuBar.tsx`: a global view needs fetching, loading and error states. **Reset Scores** stays local; it cannot delete global entries, and the UI should say so.
- `storage.ts`: could keep a per-entry deletion token (section 3).
- The test-only `?layout=` hook (`src/testHooks/layoutParam.ts`) stays irrelevant to security: the server must never trust a client Layout, whether or not public builds strip the hook.

---

## 3. Showing player names publicly

### Name moderation

Options, from least to most effort:

- **No free text.** Publish "Anonymous", the existing default, or a generated handle. This removes both moderation and most of the personal-data question.
- **A wordlist filter on the server.** A filter in the client is bypassed like any other client check.
  - `obscenity` matches variants such as repeated letters, Unicode lookalikes and embedded words, and handles false positives with whitelists and word boundaries. Its own README says: "As with all swear filters, Obscenity is not perfect (nor will it ever be). Use its output as a heuristic, and not as the sole judge" [M1, fetched]. Its preset dataset is English.
  - The LDNOOBW lists, compiled at Shutterstock, cover dozens of languages but call themselves subjective: "what wouldn't we want to _suggest_ … varies between culture, language, and geographies" [M2, fetched].
  - `bad-words` is a plain list-and-replace filter [M3, fetched].
- **A restricted character set**, for example letters, digits and spaces. It cuts lookalike-character evasion but rejects many real names.
- **Human moderation.** A report link, plus the owner's ability to delete entries and block abusers, as on Game Center [A1].

Limits common to all filters:

- False positives: innocent names that contain a listed string.
- False negatives: new spellings, other languages, names offensive in context, impersonation.
- Personal data typed into the name field. Players will enter real names, e-mail addresses or phone numbers. Rejecting e-mail and phone patterns and suggesting "don't use your real name" also serves data minimisation (below).

If the site hosts names that users supply, the EU Digital Services Act requires every hosting provider to offer an easy electronic way to report illegal content and to act on reports [L7, search: Art. 16, Recital 50]. Whether a non-commercial hobby site counts as an "information society service" under that regulation is an **open question** I could not settle from reachable sources. A report link meets the practical intent either way.

### Privacy basics for an EU-facing hobby site

_Not legal advice._ The GDPR text and regulator guidance were reachable only through search excerpts [search]. Points marked [unverified] come from general knowledge of the Regulation and must be checked against the linked text.

- **Is a name plus a time personal data?** Personal data is "any information relating to an identified or identifiable natural person", directly or indirectly, a name being the first identifier listed (Art. 4(1)) [L1, search]. A real name or a recognisable handle next to a time and a date is personal data. "Anonymous" or an unlinked random handle may not be, but the API still sees the visitor's **IP address**. Recital 30 names IP addresses as online identifiers [L1, search], and in _Breyer_ (C-582/14) the CJEU held that a dynamic IP address can be personal data for a website operator with legal means to identify the person [L5, search]. Rate limiting by IP is processing personal data even if nothing is stored.
- **The household exemption does not apply.** Art. 2(2)(c) excludes purely personal or household activity [unverified wording]. The CJEU held in _Lindqvist_ (C-101/01) that publishing data on the internet to "an indefinite number of people" is not such an activity [L4, search]. That case concerned the earlier Directive, though it is commonly applied to the GDPR.
- **Roles.** The owner would be the controller. The hosting provider processes on the owner's behalf under a data processing agreement (Art. 28) [unverified]. Supabase's docs link a DPA [B9, fetched]; the other providers' DPA pages were unreachable. GitHub Pages already logs every visitor's IP address "for security purposes" [G2, fetched], but that is GitHub's own processing.
- **Legal basis: two realistic choices.**
  - **Consent** (Art. 6(1)(a)) [unverified]: an explicit "publish my time and name" opt-in at the moment of submission. It must be as easy to withdraw as to give (Art. 7(3)) [unverified]. When consent is the basis for a service offered directly to a child, Art. 8 sets 16 as the default age, which Member States may lower, but not below 13 [L1, search].
  - **Legitimate interests** (Art. 6(1)(f)): the EDPB requires three cumulative conditions (a legitimate interest, necessity, and a balancing test done and documented before processing) and says this basis cannot be used "by default" [L2, search]. Players may then object (Art. 21(1)), and the controller must stop unless it shows compelling grounds [L1, search].
  - Either way, an opt-in submission makes the case far easier than publishing every Win automatically.
- **Transparency.** Tell players at the point of collection who runs the leaderboard, what is stored and why, the legal basis, how long it is kept, which providers process it, where the data goes, and their rights (Art. 13) [unverified]. One line in the dialog plus a short privacy page is the usual form.
- **Minimisation and retention** (Art. 5(1)(c) and (e)) [unverified]:
  - Store only what is shown: name, Difficulty, time and date, plus a hashed deletion token. Do not store IP addresses with entries.
  - Choose a retention rule, such as top N per Difficulty, seasons, or deleting entries after a year.
  - Remember platform logs (3 days on Workers Free [C13]) and back-ups such as D1 Time Travel (7 days on Free [C4]).
- **Deletion requests.** The right to erasure covers, among other cases, data no longer needed and data whose processing was successfully objected to (Art. 17(1)(a) and (c)) [L1, search]. Answer within one month (Art. 12(3)) [L1, search].
  - Without accounts, the simplest self-service is a per-entry deletion token returned at submission and kept in `localStorage`, alongside a contact address.
  - A public GitHub issue is a poor channel for privacy requests.
  - Keeping that token on the device is "storage" under ePrivacy Art. 5(3). The exemption for storage strictly necessary for a service the user explicitly requested is the relevant one. The EDPB's Guidelines 2/2023 discuss the provision's scope, but I could not confirm their English wording on the exemption [L3, search].
- **Transfers.** Cloudflare, Supabase, Google, Vercel and Netlify are US companies. The EU–US Data Privacy Framework adequacy decision (2023/1795) was upheld by the General Court in _Latombe_ (T-553/23, 3 September 2025). An appeal (C-703/25 P) is pending [L6, search]. Choosing EU data location (D1 `eu` jurisdiction, a specific Supabase EU region) reduces exposure but does not remove the provider's US parent from the analysis [B9].
- **Watch for change.** The Commission's "Digital Omnibus" proposal (2025/0360 (COD)), which would amend parts of the GDPR and move cookie and device-access rules into it, was still in Council negotiations in September 2026 [L8, search].

---

## Options at a glance

Three realistic architectures, simplest first. Each one adds to the one before it.

### A. Honour-system list: client-reported times, moderated

The client posts `{ Difficulty, seconds, name }` after a Win, with an opt-in. Storage could be Supabase (a table with an insert-only RLS policy), Firestore with Rules, or a Worker with D1. Add range checks, a rate limit, a server-side name filter and an owner-only delete.

- **For:** a day or two of work; $0; no change to the engine; the smallest UI change (submit plus a global view).
- **Against:** anyone with `curl` can post a 1-second Expert time. The list is as trustworthy as the owner's moderation effort. Supabase's pause after a week of inactivity and Firestore's read quota need watching.

### B. Verified replay: server-issued seeds, replayed on the server

A Worker (or an Edge Function or Cloud Function) issues a single-use seed and records the time. The client plays locally with a seeded `RandomSource`, keeps the action log in `BoardState`, and submits it after a Win. The server replays it with the same engine and rules version, requires a Win, takes the official time from its own clock (bounded by the logged Timer), runs plausibility checks, verifies Turnstile and rate-limits. Sessions and entries live in D1, not KV.

- **For:** stops forged times from scripts and the shrinking of a real Game's time; the engine is reused unchanged (ADR-0001 pays off); still $0 at hobby scale on Workers Free.
- **Against:** a seed and session protocol, a rules-version policy, network-failure states in the UI, and a second deploy pipeline. Bots that read the Layout still win in under a second, so moderation and outlier review remain. Network delay penalises distant players unless allowed for.

### C. Server-authoritative Games: the server holds the Board

Each Reveal, Flag and Chord goes to the server (a Durable Object, or a stateless replay of a stored log on each request, since replay costs about 0.5 ms). The client receives only Cell views. The server stamps every `now`.

- **For:** the client never holds the Layout and cannot forge timestamps; only solver-assisted play remains, for statistical review and moderation.
- **Against:**
  - A round trip on every action changes how Reveals feel and rules out offline play.
  - A few hundred requests per Expert Game caps Workers Free at roughly 400 Expert Games/day; Workers Paid ($5/month) lifts that.
  - `Board.tsx` and `StatusPanel.tsx` would render from server state instead of a local `Game`, the largest UI change.
  - It reverses the original's instant, local feel, which the README treats as a feature.

Questions worth grilling before choosing:

- How much would a forged top entry matter on a hobby site?
- Is a GitHub login (the Issues + Actions variant) acceptable friction?
- Opt-in names, or Anonymous only?
- Which retention rule?
- Is the owner willing to be the controller of EU players' personal data at all?

---

## Sources

Code read in this repo: `CONTEXT.md`, `docs/adr/0001-pure-game-engine.md`, `src/engine/game.ts`, `src/engine/testHelpers.ts`, `src/ui/App.tsx`, `src/ui/boardState.ts`, `src/ui/bestTimes.ts`, `src/ui/useBestTimes.ts`, `src/ui/storage.ts`, `src/ui/Board.tsx`, `src/ui/NewBestTimeDialog.tsx`, `src/ui/BestTimesDialog.tsx`, `src/main.tsx`, `src/testHooks/layoutParam.ts`, `vite.config.ts`, `.github/workflows/deploy.yml`.

**Cloudflare** [fetched from `cloudflare/cloudflare-docs`, branch `production`; the published page is listed first]

- C1 Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/ (`src/content/docs/workers/platform/pricing.mdx`)
- C2 Workers limits: https://developers.cloudflare.com/workers/platform/limits/ (`…/workers/platform/limits.mdx`)
- C3 D1 pricing: https://developers.cloudflare.com/d1/platform/pricing/ (`src/content/partials/workers/d1-pricing.mdx`, `src/content/partials/d1/faq-pricing.mdx`)
- C4 D1 limits: https://developers.cloudflare.com/d1/platform/limits/
- C5 KV pricing: https://developers.cloudflare.com/kv/platform/pricing/ (`src/content/partials/workers/kv_pricing.mdx`)
- C6 KV limits: https://developers.cloudflare.com/kv/platform/limits/
- C7 How KV works: https://developers.cloudflare.com/kv/concepts/how-kv-works/
- C8 Rate Limiting binding: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- C9 CORS header proxy example: https://developers.cloudflare.com/workers/examples/cors-header-proxy/
- C10 Turnstile server-side validation: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
- C11 Turnstile plans: https://developers.cloudflare.com/turnstile/plans/
- C12 Workers secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- C13 Workers Logs: https://developers.cloudflare.com/workers/observability/logs/workers-logs/ (`src/content/partials/workers/workers_logs_pricing.mdx`; the page notes a pricing change from 2026-12-01)
- C14 Workers Builds: https://developers.cloudflare.com/workers/ci-cd/builds/
- C15 D1 data location: https://developers.cloudflare.com/d1/configuration/data-location/
- C16 Durable Objects pricing: https://developers.cloudflare.com/durable-objects/platform/pricing/

**Supabase** [fetched from `supabase/supabase`, branch `master`]

- B1 Pricing plans: https://supabase.com/pricing (`packages/shared-data/plans.ts`)
- B2 Pricing table data: `packages/shared-data/pricing.ts` (Edge Function invocations; "Pausing: After 1 week of inactivity")
- B3 Edge Function invocations billing: https://supabase.com/docs/guides/platform/manage-your-usage/edge-function-invocations
- B4 Edge Functions CORS: https://supabase.com/docs/guides/functions/cors
- B5 Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- B6 Securing your API: https://supabase.com/docs/guides/api/securing-your-api
- B7 Gateway CORS, which the self-hosting doc says matches the platform: https://supabase.com/docs/guides/self-hosting/self-hosted-envoy
- B8 Regions: https://supabase.com/docs/guides/platform/regions
- B9 GDPR compliance and DPA: https://supabase.com/docs/guides/security/gdpr-compliance

**Firebase** [index: Context7 excerpts of firebase.google.com]

- F1 Firestore quotas: https://firebase.google.com/docs/firestore/quotas
- F2 Firestore pricing: https://firebase.google.com/docs/firestore/pricing
- F3 Cloud Functions FAQ (Blaze; 2 M free invocations): https://firebase.google.com/docs/functions/faq-and-troubleshooting and https://firebase.google.com/docs/functions/get-started
- F4 Firebase pricing plans: https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- F5 Rules `request.time` and data validation: https://firebase.google.com/docs/reference/rules/rules.firestore.Request and https://firebase.google.com/docs/rules/data-validation
- F6 App Check: https://firebase.google.com/docs/app-check
- F7 HTTP functions `cors` option: https://firebase.google.com/docs/functions/http-events
- F8 Functions quotas (budget alerts are not caps): https://firebase.google.com/docs/functions/quotas

**Vercel** [index: Context7 excerpts of vercel.com/docs]

- V1 https://vercel.com/docs/pricing
- V2 https://vercel.com/docs/plans/hobby
- V3 https://vercel.com/docs/limits/fair-use-guidelines
- V4 https://vercel.com/docs/redis and https://vercel.com/docs/storage

**Netlify** [index: Context7 excerpts of docs.netlify.com]

- N1 https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/
- N2 https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/
- N3 https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/
- N4 https://docs.netlify.com/build/data-and-storage/netlify-blobs/

**Web platform and GitHub** [fetched from source repositories]

- W1 Fetch Standard, CORS protocol: https://fetch.spec.whatwg.org/#http-cors-protocol (`whatwg/fetch`, `fetch.bs`)
- W2 Fetch Standard, CORS-safelisted request-header: https://fetch.spec.whatwg.org/#cors-safelisted-request-header
- W3 Fetch Standard, `Origin` header: https://fetch.spec.whatwg.org/#origin-header
- W4 MDN, CORS guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS (`mdn/content`)
- G1 GitHub Pages limits: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits (`github/docs`)
- G2 What is GitHub Pages, "Data collection": https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages (`github/docs`)

**Leaderboards and anti-cheat**

- A1 Apple, Manage scores and players [fetched]: https://developer.apple.com/help/app-store-connect/configure-game-center/manage-scores-and-players/
- A2 Steamworks, Steam Leaderboards ("Trusted" writes) [search]: https://partner.steamgames.com/doc/features/leaderboards
- A3 Lichess server clock with capped lag compensation [fetched]: https://github.com/lichess-org/scalachess/blob/master/core/src/main/scala/Clock.scala and https://github.com/lichess-org/scalachess/blob/master/core/src/main/scala/LagTracker.scala
- A4 Lichess cheat detection [fetched]: https://github.com/lichess-org/irwin and https://github.com/lichess-org/kaladin
- A5 Minesweeper replay tooling [fetched]: Metasweeper README https://github.com/eee555/Metasweeper (signing module, 3BV/s counters); EVF format spec https://github.com/eee555/ms_toollib/blob/main/evf%E6%A0%87%E5%87%86.md (Kerckhoffs's principle, checksum fields); ms_toollib https://github.com/eee555/ms_toollib (3BV)

**Name moderation** [fetched]

- M1 obscenity: https://github.com/jo3-l/obscenity
- M2 LDNOOBW lists: https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words
- M3 bad-words: https://github.com/web-mech/badwords

**EU law and guidance** [search only: every EU host was blocked]

- L1 GDPR, Regulation (EU) 2016/679: https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng (Art. 4: https://eur-lex.europa.eu/eli/reg/2016/679/art_4/oj)
- L2 EDPB Guidelines 1/2024 on legitimate interest: https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202401_legitimateinterest_en.pdf
- L3 EDPB Guidelines 2/2023 on the technical scope of ePrivacy Art. 5(3): https://www.edpb.europa.eu/system/files/documents/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf
- L4 CJEU, _Lindqvist_, C-101/01: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex:62001CJ0101
- L5 CJEU, _Breyer_, C-582/14: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A62014CJ0582
- L6 General Court, _Latombe_, T-553/23: https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A62023TJ0553; appeal C-703/25 P: https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=OJ%3AC_202506610
- L7 Digital Services Act, Regulation (EU) 2022/2065: https://eur-lex.europa.eu/eli/reg/2022/2065/oj/eng
- L8 Council working document on the Digital Omnibus, 2025/0360 (COD), 17 September 2026: https://data.consilium.europa.eu/doc/document/WK-14249-2026-INIT/en/pdf
