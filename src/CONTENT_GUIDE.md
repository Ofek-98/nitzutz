# Nitzutz (ניצוץ) — content writing guide

Nitzutz is a Duolingo-style learning app (Hebrew, RTL) that teaches one learner how to get the most out of Claude and AI-assisted building.
The learner: a Hebrew-speaking professional who works a lot with financial documents, Excel and Word reports. Knows the basics of chatting with Claude, wants to really master it: prompting, Claude's features, agents, Claude Code, building small apps, automation.
The learner refers to himself in masculine form, so address him in **masculine singular** Hebrew ("אתה", "כתוב", "בחר").

Each unit lives in its own file `content/unitN.js`. The engine loads every file and renders the path, lessons, review, glossary, missions and tips from them.

---

## 1. File format (exact)

The file is plain JavaScript (not JSON, not a module). It must be valid ES2017 syntax.

```js
window.CURRICULUM = window.CURRICULUM || [];
window.CURRICULUM.push({
  id: "u1",
  order: 1,
  title: "איך קלוד חושב",
  subtitle: "מה באמת קורה כשאתה שולח הודעה",
  color: "amber",
  icon: "brain",
  guide: [
    { h: "כותרת קצרה", p: "פסקה של 2-4 משפטים שמסכמת רעיון מרכזי ביחידה." }
  ],
  lessons: [
    {
      id: "u1l1",
      title: "מה זה מודל שפה",
      goal: "משפט אחד: מה תדע לעשות בסוף השיעור.",
      items: [ /* exercises, see section 2 */ ]
    }
  ],
  missions: [ /* see section 3 */ ],
  glossary: [ /* see section 4 */ ],
  tips: [ /* see section 5 */ ]
});
```

Syntax rules (a single syntax error hides the whole unit, so be careful):
- Strings use **double quotes** `"..."`. Never use template literals (backticks delimit strings) — backticks appear *inside* strings as inline-code markup.
- Inside a string, never use a raw ASCII double quote `"`. For quotations use Hebrew-style curly quotes `“ ”` (U+201C/U+201D). For Hebrew abbreviations use the real gershayim `״` and geresh `׳` (e.g. `בע״מ`, `ח׳`).
- Line breaks inside a string: write `\n`. No literal newlines inside a string.
- A backslash only ever appears as part of `\n`.
- Commas between array elements and object properties; trailing commas are allowed.
- Never insert invisible bidi control characters (RLM, LRM, RLE, PDF, isolates, etc.). The engine handles direction with CSS.
- No HTML in strings. Allowed markup inside any text field:
  - `**bold**`
  - `` `inline code or English term` `` (rendered left-to-right in a code chip; use it for English terms, file names, commands, model names: `` `Opus 5.5` ``, `` `CLAUDE.md` ``)
  - `\n` for a new line; `\n\n` for a new paragraph.

## 2. Exercise types

Every lesson has an `items` array of **11–14 items**, in this rhythm:
`learn` → 2–3 exercises → `learn` → 2–3 exercises → `learn` (optional) → 2–4 exercises → (optional) `write` last.
- 2–3 `learn` cards per lesson, each teaching ONE idea that the following exercises practice.
- 8–11 exercises per lesson, using **at least 5 different types**.
- Include a `write` exercise in **at least 3 of the 5 lessons** of the unit (always as the last item).
- Difficulty ramps up inside a lesson and across the unit's lessons.

Fields per type (all text fields support the markup above):

```js
// Teaching card. Short! 40–90 words in body. One idea.
{ type: "learn", title: "...", body: "...", example: { label: "דוגמה", text: "..." }, note: "..." }
//   example and note are optional. example.text is often a prompt, shown in a "prompt card".

// Multiple choice, exactly one correct. 3–4 options. answer = index of the correct option (0-based).
{ type: "mcq", q: "...", options: ["...", "...", "..."], answer: 1, explain: "..." }

// True / false statement.
{ type: "tf", q: "statement to judge", answer: true, explain: "..." }

// Select all that apply. 4–5 options, 2–3 correct. answers = indices.
{ type: "multi", q: "...", options: ["...", "...", "...", "..."], answers: [0, 2], explain: "..." }

// Put in the right order. 4–5 items, listed IN THE CORRECT ORDER (the engine shuffles).
{ type: "order", q: "...", items: ["שלב ראשון", "שלב שני", "שלב שלישי", "שלב רביעי"], explain: "..." }

// Match pairs. 3–5 pairs [left, right]. Left = term, right = meaning/use. Keep each side short (max ~8 words).
{ type: "match", q: "...", pairs: [["...", "..."], ["...", "..."], ["...", "..."]], explain: "..." }

// Fill in the blanks. text contains one or two "___" markers (three underscores).
// blanks = the correct words in order. bank = 2–3 plausible WRONG distractors (the engine mixes them with blanks).
// Each blank/bank chip: 1–3 words.
{ type: "cloze", q: "השלם את המשפט", text: "כדי לקבל תשובה טובה יותר, תן לקלוד ___ ותסביר את ה___.", blanks: ["הקשר", "מטרה"], bank: ["סיסמה", "מחמאה"], explain: "..." }

// Which is better, A or B. Usually two prompts (or two answers, or two approaches). answer = "a" or "b".
// Make both realistic; the difference should teach the lesson's idea. Vary which one is correct.
{ type: "compare", q: "איזה פרומפט יביא תוצאה טובה יותר?", a: "...", b: "...", answer: "b", explain: "..." }

// Spot the problem: a prompt or an AI answer split into 3–5 parts (sentences). The learner taps the problematic part.
// answer = index of the problematic part.
{ type: "spot", q: "איזה חלק בפרומפט יפגע בתוצאה?", parts: ["...", "...", "...", "..."], answer: 2, explain: "..." }

// Free writing, graded by Claude against the rubric (or self-checked when Claude is unavailable).
// task: a concrete realistic scenario + what to write (usually: write a prompt). 2–4 sentences.
// rubric: 3–5 short, checkable criteria. sample: an excellent answer (a full prompt in Hebrew, use \n for lines).
{ type: "write", task: "...", rubric: ["...", "...", "..."], sample: "..." }
```

`explain` is mandatory on every non-learn, non-write item: 1–3 sentences that teach *why*, not just restate the answer. It is shown after the learner answers (correct or not).

Quality bar for exercises:
- Every exercise tests understanding or judgement, not trivia or wording memory. Prefer realistic situations ("you're preparing a memo for the credit committee and...").
- Distractors are plausible and similar in length to the correct option. No “all of the above”, no joke options, no option that is obviously wrong.
- Vary the position of correct answers (the engine shuffles mcq/multi options anyway, but `compare` answers should alternate between "a" and "b").
- Don't repeat the exact same question within the unit.
- `tf` statements must be clearly true or clearly false — no nitpicks.
- `spot` parts must each be a full, natural sentence; exactly one is clearly the problem.
- Mix work scenarios (financial reports, Excel tables, credit memos, emails, presentations, meeting summaries) with everyday-life ones (trip planning, a gift, learning a topic, a home budget), roughly 60/40. Don't name real companies or real people.

## 3. Missions (field missions — "משימות שטח")

2–3 per unit. A real task the learner does in Claude (claude.ai, the desktop app or Claude Code), outside the app, then comes back and writes a short reflection.

```js
{ id: "u1m1", title: "...", why: "one sentence: what this teaches", steps: ["...", "...", "..."], reflect: "a question to answer after doing it", xp: 30 }
```
- 3–5 concrete steps. Doable in 5–15 minutes. Safe (no sensitive data, no destructive actions).
- xp: 20–50 by effort.

## 4. Glossary

8–12 terms per unit, each tied to the lesson that teaches it (unlocked when that lesson is completed).
```js
{ term: "חלון הקשר", en: "Context window", def: "1–2 sentences, plain Hebrew.", lesson: "u1l2" }
```
`en` is the English term (plain text, no markup). Avoid terms already owned by another unit (see the unit map below).

## 5. Tips

6–8 short tips per unit (one sentence each, 10–25 words). Practical and specific, shown as “tip of the day”.

## 6. Hebrew writing style

- Natural, warm, clear Hebrew — like a smart friend who knows the field. Short sentences. No translationese.
- Light humor is welcome in learn cards and explanations, sparingly. Never childish.
- Use Hebrew terms where natural; put English product/technical names in inline code: `` `Claude Code` ``, `` `MCP` ``, `` `API` ``.
- Example prompts inside exercises are in Hebrew (that's how the learner works), unless the point is something English-specific.
- Titles: 2–5 words. Lesson `goal`: one sentence starting with a verb or "תדע".

## 7. Facts you may rely on (as of October 2026)

Stay within these facts. If a detail is not here and you are not sure of it (exact menu names, button locations, limits, prices, release dates), keep the statement conceptual instead of inventing specifics. Accuracy matters more than detail: this app teaches real skills.

How models work
- A large language model generates text token by token, predicting what comes next, based on patterns learned in training. It does not look answers up in a database (unless given a search tool). The same prompt can give different answers on different runs.
- Tokens are pieces of words. In English a token is roughly three-quarters of a word; Hebrew usually needs more tokens per word than English.
- The context window is everything the model "sees" in one conversation: the instructions, all messages, uploaded files and its own previous answers. Current Claude models have very large context windows (up to about a million tokens), but very long conversations still cost more, run slower, and the model can lose focus on details — start a fresh chat for a new topic.
- Models have a training cutoff: they don't know events after it unless they use web search or you provide the information.
- By default Claude does not remember previous conversations. Within a conversation it sees the whole history. In claude.ai, Projects (shared files + instructions for all chats in the project) and the Memory feature (which the user can view and control) provide continuity across chats.
- Hallucination: a fluent, confident answer that is wrong or invented — common with specific numbers, quotes, citations, URLs, niche facts. Mitigations: provide source documents, ask it to quote the source, explicitly allow “I don't know”, ask for sources and check them, use web search, verify what matters.
- Sycophancy: models can lean toward agreeing with the user. Mitigations: ask for critique and counter-arguments, don't reveal your preferred answer, ask what a skeptical reviewer would say.
- Claude can reason before answering ("thinking"); this helps most on complex, multi-step problems. On current models the amount of thinking is controlled by an effort level.

Model family (Claude 5 generation): `Haiku` — fastest and cheapest; `Sonnet` — balanced, strong everyday workhorse; `Opus` — very strong for complex work; `Fable` — the most capable, newest top tier. Current versions: `Haiku 5.5`, `Sonnet 5.5`, `Opus 5.5`, `Fable 5.1`.
API prices per million tokens (input / output): Haiku 5.5 $0.10 / $0.50; Sonnet 5.5 $2 / $10; Opus 5.5 $4 / $20; Fable 5.1 $10 / $50. Output tokens cost 5× input tokens. Prompt caching makes repeated identical prefixes much cheaper; the Batch API is 50% cheaper for non-urgent jobs. API usage is billed separately from a claude.ai subscription.

Prompting practices (from Anthropic's guidance)
- Be clear, direct and specific. Test: would a smart new colleague with zero context understand exactly what you want?
- Give context and the reason behind a request (who it's for, what it will be used for); Claude generalizes from the reason.
- Specify the output: format, length, structure, audience, tone. Say what to do rather than only what not to do. The style of the prompt influences the style of the answer.
- Examples (few-shot) strongly steer results: make them relevant and varied, and wrap them clearly.
- Use XML-style tags (e.g. `<document>`, `<instructions>`, `<example>`) to separate instructions, data and examples; refer to them by name.
- A role (e.g. “אתה אנליסט אשראי בכיר”) frames tone and focus; a specific role beats a generic one; it doesn't add knowledge.
- Let it think: for complex tasks ask it to reason step by step, or use thinking.
- Prompt chaining: split a big task into steps (research → outline → draft → review), each prompt focused.
- Long documents: put the documents first and the question at the end; ask it to first extract relevant quotes; label multiple documents.
- Iterate: the first answer is a draft. Give specific feedback. Ask Claude to ask you clarifying questions, or to improve your prompt.
- Modern Claude models follow instructions precisely — if you want it to go above and beyond, say so explicitly.

claude.ai and apps
- Projects: a workspace with knowledge files and custom instructions shared by all chats in it.
- Styles: control writing style. Memory: Claude can remember useful context across chats; the user can see and edit it.
- File upload: PDFs, images, documents, spreadsheets (Excel/CSV). Claude can analyze data by running code, and can create files: Excel, Word, PowerPoint, PDF.
- Web search for up-to-date information; Research: a deeper mode that searches many sources and writes a cited report.
- Artifacts: Claude can build standalone interactive pages and small apps (calculators, dashboards, trackers, games — like this app). They can be published and shared, can save data, and can even call Claude (using the viewer's own usage).
- Connectors: link Claude to services such as Google Drive, Gmail, Calendar, Slack and many others, built on `MCP`. Claude acts with the access you grant — review what it does.
- Claude in Chrome: a browser extension that lets Claude read and act on web pages in your browser.
- Apps: web, desktop (Windows/Mac) and mobile, with voice conversation on mobile.

Agents and Claude Code
- An agent is a model working in a loop: gather context → take an action with a tool → check the result → repeat until the goal is reached. Tools are functions it can call (search, read a file, run code, send a message).
- `MCP` (Model Context Protocol): an open standard for connecting AI applications to tools and data sources.
- `Claude Code`: Anthropic's agentic tool. Runs in the terminal, in IDEs (VS Code, JetBrains), in the desktop app and on the web. It works inside a folder, reads and edits files, runs commands, and asks permission before actions. Useful not only for code: documents, Excel files, data cleanup, research.
- Permission modes: by default it asks before edits and commands; you can accept edits automatically; plan mode lets it explore and propose a plan before changing anything; an auto mode lets it proceed with fewer prompts. Review changes; never approve destructive commands blindly; version control (git) is a safety net.
- `CLAUDE.md`: a file of project instructions and context that Claude Code reads at the start of every session.
- Skills: folders with instructions (`SKILL.md`) plus optional scripts and resources; Claude loads a skill when its description matches the task. Available in claude.ai, Claude Code and the API. Great for repeated workflows with a house format.
- Subagents: Claude can delegate parts of a task to helper agents, each with its own context, sometimes in parallel.
- Hooks: automatic actions triggered by events in Claude Code (e.g. run a check after every edit). Slash commands: shortcuts for saved workflows.
- Scheduled tasks: tasks that run automatically on a schedule (e.g. a morning summary every weekday).

Building
- Good flow: idea → short spec (who, problem, core features, out of scope) → build in small steps → test after each step → iterate. Ask Claude to interview you to sharpen the spec.
- Debugging: give the exact error message, what you did, what you expected vs what happened; ask for the root cause.
- Git: a repository tracks versions; a commit is a saved snapshot; branches allow safe experiments; you can always go back. GitHub hosts repositories online.
- An `API` lets your own code call Claude; it needs a secret API key (never share it or put it in public code).
- Evals: a set of test cases with expected results, used to measure and compare prompt or workflow versions (by exact checks, a rubric, or a model acting as judge).

Safety and privacy
- Verify in proportion to the stakes. Numbers and calculations: ask Claude to compute with code / the analysis tool and spot-check results; check units, currencies and periods.
- Don't paste passwords, API keys, ID numbers or confidential data you aren't allowed to share; follow your organization's policy; anonymize when possible. Work and personal accounts may have different data settings.
- Prompt injection: text inside documents, web pages or emails that tries to give the AI instructions. Treat external content as data, not commands — especially when an agent has tools or access to sensitive data. Review actions before approving.

## 8. Unit map (to avoid overlap)

| Unit | id | Title | color | icon |
|---|---|---|---|---|
| 1 | u1 | איך קלוד חושב | amber | brain |
| 2 | u2 | יסודות הפרומפט | coral | pen |
| 3 | u3 | טכניקות מתקדמות | violet | layers |
| 4 | u4 | קלוד בעבודה היומיומית | teal | briefcase |
| 5 | u5 | חשיבה ביקורתית ובטיחות | rose | shield |
| 6 | u6 | סוכנים וקלוד קוד | sky | robot |
| 7 | u7 | לבנות עם AI | lime | hammer |
| 8 | u8 | אוטומציה ותהליכים | indigo | cog |

Lesson outlines:

**u1 איך קלוד חושב**
- u1l1 מה זה מודל שפה — predicts next tokens from patterns; not a database or search engine; answers vary between runs; great at language and reasoning, can still be wrong.
- u1l2 טוקנים וחלון הקשר — tokens; Hebrew needs more tokens; the context window = everything it sees; long chats: cost, slowness, loss of focus; start a new chat for a new topic.
- u1l3 זיכרון ומה קלוד יודע — no memory across chats by default; full history within a chat; Projects and Memory for continuity; training cutoff and web search; it only knows your files if you give them.
- u1l4 הזיות — what they are, when they're likely (numbers, quotes, citations, URLs, niche facts); how to reduce and catch them.
- u1l5 לבחור מודל וחשיבה — Haiku / Sonnet / Opus / Fable trade-offs; thinking and effort; matching the model to the task.

**u2 יסודות הפרומפט**
- u2l1 להיות ברור וספציפי — vague vs specific; the new-colleague test; length, audience, tone.
- u2l2 הקשר ומטרה — explain why; audience; what the output is for; background and constraints.
- u2l3 פורמט הפלט — tables, bullets, email, JSON; structure; say what to do instead of what not to do; prompt style shapes output style.
- u2l4 דוגמאות — few-shot; varied relevant examples; examples steer strongly (beware copying); format examples.
- u2l5 איטרציה — the first answer is a draft; specific feedback; fix the prompt vs continue the chat; ask Claude to ask clarifying questions or to improve the prompt.

**u3 טכניקות מתקדמות**
- u3l1 מבנה עם תגיות — XML tags to separate parts; consistent names; referring to tags.
- u3l2 תפקיד ופרסונה — role prompting; specific roles; role + context; what a role does and doesn't do.
- u3l3 לחשוב לפני שעונים — step-by-step reasoning; thinking; reasoning before the conclusion; when it's worth it.
- u3l4 לפרק משימות — prompt chaining; focused steps; passing outputs along; a self-review step.
- u3l5 מסמכים ארוכים — documents first, question last; extract quotes first; labeling multiple documents; asking for references to sections/pages.

**u4 קלוד בעבודה היומיומית**
- u4l1 פרויקטים, הנחיות וזיכרון — Projects (knowledge + custom instructions); Styles; Memory and controlling it.
- u4l2 קבצים ונתונים — uploading PDFs/Excel/images; analysis with code; creating Excel/Word/PowerPoint files; describing the data; verifying.
- u4l3 חיפוש ומחקר — web search for current info; Research for deep cited reports; checking sources; when search isn't needed.
- u4l4 ארטיפקטים — interactive pages and tools from a chat; iterating; publishing and sharing; saving data and calling Claude.
- u4l5 מחברים ואינטגרציות — connectors via MCP; Claude in Chrome; desktop and mobile apps, voice; acting with your access, reviewing actions.

**u5 חשיבה ביקורתית ובטיחות**
- u5l1 לאמת תוצאות — verify in proportion to the stakes; cross-check against the source; ask for sources.
- u5l2 מספרים וחישובים — arithmetic errors; compute with code; check totals, units, currencies, periods; Excel formulas: spot-check rows.
- u5l3 לבקש ביקורת אמיתית — sycophancy; asking for weaknesses and counter-arguments; neutral framing; confidence levels.
- u5l4 פרטיות ומידע רגיש — what not to paste; organizational policy; anonymizing; work vs personal accounts.
- u5l5 תוכן לא אמין והזרקת פרומפט — prompt injection in documents, web pages and emails; agents with tools raise the stakes; content is data, not commands; reviewing actions.

**u6 סוכנים וקלוד קוד**
- u6l1 מה זה סוכן — the agent loop; tools; levels of autonomy; agent vs chat.
- u6l2 כלים ו־MCP — tools as functions; MCP as an open standard; connectors; tool permissions.
- u6l3 היכרות עם קלוד קוד — where it runs; works in a folder; reads/edits files, runs commands; not only for code.
- u6l4 מצבי עבודה והרשאות — permission prompts; plan mode; auto-accepting edits; auto mode; reviewing changes; git as a safety net.
- u6l5 זיכרון, סקילים ותת־סוכנים — CLAUDE.md; skills; subagents; hooks; slash commands.

**u7 לבנות עם AI**
- u7l1 מרעיון לאפיון — user, problem, core features, out of scope; short spec; let Claude interview you; acceptance criteria.
- u7l2 לבנות בצעדים קטנים — one feature at a time; test after each step; keep a working version; screenshots and visual descriptions.
- u7l3 דיבאג עם קלוד — exact error, steps, expected vs actual; screenshots; root cause, not a patch; logging.
- u7l4 גיט וגרסאות — repository, commit, branch, revert; GitHub; commit often; letting Claude commit; rolling back.
- u7l5 API ועלויות — what an API is; API key secrecy; token pricing (input vs output); model choice and cost; caching and batch; estimating a cost.

**u8 אוטומציה ותהליכים**
- u8l1 תבניות ופרומפטים חוזרים — reusable templates with placeholders; project instructions; a personal prompt library.
- u8l2 סקילים — what a skill is; when to create one; the description decides when it loads; example: a monthly report in house format.
- u8l3 משימות מתוזמנות ותהליכים — scheduled tasks; multi-step workflows; human checkpoints.
- u8l4 לבדוק איכות — evals; test cases; comparing versions; rubric grading; model as judge; regressions.
- u8l5 פרויקט גמר — design an end-to-end workflow for a real recurring task: choose → spec → prompt/skill → test → automate → measure.

## 9. Self-check before finishing

After writing the file, read it back fully and check:
1. Syntax: every string closed, no raw `"` inside strings, no literal line breaks inside strings, commas between elements, braces/brackets balanced, file ends with `});`.
2. Every `mcq.answer` / `spot.answer` index is in range; every `multi.answers` index is in range; `compare.answer` is "a" or "b"; `cloze` has as many `___` as `blanks`.
3. Item counts per lesson (11–14), type variety (≥5 exercise types per lesson), `write` in ≥3 lessons.
4. Every lesson id matches the outline; glossary `lesson` ids exist.
5. Facts are consistent with section 7.
