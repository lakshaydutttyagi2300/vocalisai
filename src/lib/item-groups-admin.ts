// P1-G: admin create / update / delete for ItemGroup (shared stimulus),
// plus attaching and detaching questions. Routes stay thin; rules live
// here. Assets themselves are uploaded through the P1-D routes - this only
// stores the resulting key, and only if it's one those routes produce.

import { db } from "@/lib/db";
import { isItemGroupAssetKeyShape, validateItemGroupFields } from "@/lib/item-groups";

export type ItemGroupAdminResult =
  | { ok: true; record: Record<string, unknown>; before?: Record<string, unknown> }
  | { ok: false; status: number; error: string };

type Body = Record<string, unknown>;

function fail(status: number, error: string): ItemGroupAdminResult {
  return { ok: false, status, error };
}

const optStr = (v: unknown): string | null | undefined => (v === null ? null : typeof v === "string" ? (v.trim() || null) : undefined);

function readPlayLimit(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return n; // validated by validateItemGroupFields
}

function checkMetadata(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? null : "Metadata must be a JSON object, e.g. {\"accent\":\"British\"}.";
  } catch {
    return "Metadata isn't valid JSON.";
  }
}

export async function listItemGroups() {
  const groups = await db.itemGroup.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });
  return groups.map((g) => ({
    id: g.id,
    type: g.type,
    title: g.title,
    hasText: !!g.text,
    assetKey: g.assetKey,
    playLimit: g.playLimit,
    questionCount: g._count.questions,
    createdAt: g.createdAt.toISOString(),
  }));
}

export async function getItemGroup(id: string) {
  return db.itemGroup.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: [{ orderInGroup: "asc" }, { createdAt: "asc" }],
        select: { id: true, prompt: true, type: true, category: true, difficulty: true, orderInGroup: true, isActive: true },
      },
    },
  });
}

export async function createItemGroup(body: Body): Promise<ItemGroupAdminResult> {
  const data = {
    type: typeof body.type === "string" ? body.type : "",
    title: optStr(body.title) ?? null,
    text: optStr(body.text) ?? null,
    assetKey: optStr(body.assetKey) ?? null,
    transcript: optStr(body.transcript) ?? null,
    metadataJson: optStr(body.metadataJson) ?? null,
    playLimit: readPlayLimit(body.playLimit) ?? null,
  };
  const error =
    validateItemGroupFields(data) ??
    (data.assetKey && !isItemGroupAssetKeyShape(data.assetKey) ? "That file reference isn't a valid uploaded asset." : null) ??
    checkMetadata(data.metadataJson);
  if (error) return fail(400, error);

  const record = await db.itemGroup.create({ data });
  return { ok: true, record };
}

export async function updateItemGroup(id: string, body: Body): Promise<ItemGroupAdminResult> {
  const before = await db.itemGroup.findUnique({ where: { id } });
  if (!before) return fail(404, "Not found");

  const pick = <T>(incoming: T | undefined, current: T) => (incoming === undefined ? current : incoming);
  const data = {
    // type is fixed after creation: a group's questions were written
    // against a passage vs. an audio clip, and switching would silently
    // change what candidates see.
    type: before.type,
    title: pick(optStr(body.title), before.title),
    text: pick(optStr(body.text), before.text),
    assetKey: pick(optStr(body.assetKey), before.assetKey),
    transcript: pick(optStr(body.transcript), before.transcript),
    metadataJson: pick(optStr(body.metadataJson), before.metadataJson),
    playLimit: pick(readPlayLimit(body.playLimit), before.playLimit),
  };
  const error =
    validateItemGroupFields(data) ??
    (data.assetKey && data.assetKey !== before.assetKey && !isItemGroupAssetKeyShape(data.assetKey)
      ? "That file reference isn't a valid uploaded asset."
      : null) ??
    checkMetadata(data.metadataJson);
  if (error) return fail(400, error);

  const { type: _type, ...updatable } = data;
  void _type;
  const record = await db.itemGroup.update({ where: { id }, data: updatable });
  return { ok: true, record, before };
}

// Attach: sets itemGroupId + orderInGroup on each question. A question
// already in ANOTHER group is refused rather than silently moved.
export async function attachQuestions(id: string, items: unknown): Promise<ItemGroupAdminResult> {
  const group = await db.itemGroup.findUnique({ where: { id } });
  if (!group) return fail(404, "Not found");
  if (!Array.isArray(items) || items.length === 0) return fail(400, "Give at least one question to attach.");

  const parsed: { questionId: string; orderInGroup: number }[] = [];
  for (const [i, raw] of items.entries()) {
    const r = raw as { questionId?: unknown; orderInGroup?: unknown };
    const order = Number(r.orderInGroup);
    if (typeof r.questionId !== "string" || !r.questionId) return fail(400, `Item ${i + 1}: questionId is required.`);
    if (!Number.isInteger(order) || order < 1) return fail(400, `Item ${i + 1}: order must be a whole number of 1 or more.`);
    parsed.push({ questionId: r.questionId, orderInGroup: order });
  }

  const questions = await db.practiceQuestion.findMany({
    where: { id: { in: parsed.map((p) => p.questionId) } },
    select: { id: true, itemGroupId: true },
  });
  const byId = new Map(questions.map((q) => [q.id, q]));
  for (const p of parsed) {
    const q = byId.get(p.questionId);
    if (!q) return fail(400, `Question "${p.questionId}" doesn't exist.`);
    if (q.itemGroupId && q.itemGroupId !== id) return fail(409, `Question "${p.questionId}" already belongs to another group - detach it there first.`);
  }

  await db.$transaction(
    parsed.map((p) => db.practiceQuestion.update({ where: { id: p.questionId }, data: { itemGroupId: id, orderInGroup: p.orderInGroup } }))
  );
  return { ok: true, record: { id, attached: parsed } };
}

export async function detachQuestions(id: string, questionIds: unknown): Promise<ItemGroupAdminResult> {
  if (!Array.isArray(questionIds) || questionIds.length === 0 || !questionIds.every((q) => typeof q === "string")) {
    return fail(400, "Give at least one question id to detach.");
  }
  const result = await db.practiceQuestion.updateMany({
    where: { id: { in: questionIds as string[] }, itemGroupId: id },
    data: { itemGroupId: null, orderInGroup: null },
  });
  return { ok: true, record: { id, detached: result.count } };
}

// Refused while questions are attached - the database would otherwise
// quietly null their itemGroupId, leaving questions that referred to "the
// passage above" with no passage.
export async function deleteItemGroup(id: string): Promise<ItemGroupAdminResult> {
  const before = await db.itemGroup.findUnique({ where: { id }, include: { _count: { select: { questions: true } } } });
  if (!before) return fail(404, "Not found");
  if (before._count.questions > 0) {
    return fail(409, `Can't delete: ${before._count.questions} question${before._count.questions === 1 ? " is" : "s are"} still attached. Detach them first.`);
  }
  await db.itemGroup.delete({ where: { id } });
  const { _count: _c, ...snapshot } = before;
  void _c;
  return { ok: true, record: { id, deleted: true }, before: snapshot };
}
