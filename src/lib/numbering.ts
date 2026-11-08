import "server-only";
import { Counter } from "@/models";

type SeqKey = "invoice" | "receipt" | "admission" | "employee" | "voucher";

const DEFAULTS: Record<SeqKey, { key: string; prefix: string }> = {
  invoice: { key: "invoice", prefix: "INV" },
  receipt: { key: "receipt", prefix: "RCP" },
  admission: { key: "admission", prefix: "ADM" },
  employee: { key: "employee", prefix: "EMP" },
  voucher: { key: "voucher", prefix: "VCH" },
};

export async function nextSequence(
  organizationId: string,
  branchId: string,
  type: SeqKey,
  prefixOverride?: string
) {
  const conf = DEFAULTS[type];
  const counter = await Counter.findOneAndUpdate(
    { organizationId, branchId, key: conf.key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  const seq = Number(counter?.seq || 1);
  const year = new Date().getFullYear();
  const prefix = prefixOverride || conf.prefix;
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}
