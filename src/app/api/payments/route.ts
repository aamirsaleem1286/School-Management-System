import { NextResponse } from "next/server";
import { Invoice, Payment, Student } from "@/models";
import { branchScope, buildPaginationMeta, fail, handleError, pagination, requireApi } from "@/lib/api";
import { paymentSchema } from "@/lib/validators";
import { nextSequence } from "@/lib/numbering";
import { recordAudit } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const auth = await requireApi("fees.view");
    if (auth.error) return auth.error;
    const params = new URL(req.url).searchParams;
    const { page, limit, skip } = pagination(params);
    const filter: Record<string, unknown> = branchScope(auth.user);
    const method = params.get("method");
    if (method) filter.method = method;
    const invoiceId = params.get("invoiceId");
    if (invoiceId) filter.invoiceId = invoiceId;
    const [data, total] = await Promise.all([
      Payment.find(filter)
        .populate("studentId", "firstName lastName admissionNo")
        .populate("invoiceId", "invoiceNo total balance")
        .sort({ paidAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments(filter),
    ]);
    return NextResponse.json({ data, meta: buildPaginationMeta(total, page, limit) });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireApi("fees.collect");
    if (auth.error) return auth.error;
    const input = paymentSchema.parse(await req.json());
    const invoice = await Invoice.findOne({ _id: input.invoiceId, organizationId: auth.user.organizationId });
    if (!invoice) return fail("Invoice not found", 404);
    if (invoice.status === "cancelled") return fail("Cannot collect against a cancelled invoice", 409);
    const balance = Number(invoice.balance || 0);
    if (input.amount > balance + 0.01) {
      return fail(`Amount exceeds the outstanding balance of ${balance.toFixed(2)}`, 422);
    }
    const branchId = invoice.branchId || auth.user.activeBranchId || auth.user.branchId;
    const receiptNo = await nextSequence(auth.user.organizationId, String(branchId), "receipt");
    const payment = await Payment.create({
      ...input,
      organizationId: auth.user.organizationId,
      branchId,
      studentId: invoice.studentId,
      receiptNo,
      recordedBy: auth.user.id,
    });
    const paidAmount = Number(invoice.paidAmount || 0) + input.amount;
    const newBalance = Math.max(0, Number(invoice.total || 0) - paidAmount);
    invoice.paidAmount = paidAmount;
    invoice.balance = newBalance;
    invoice.status = newBalance <= 0.01 ? "paid" : "partial";
    await invoice.save();
    await recordAudit({
      organizationId: auth.user.organizationId,
      branchId: String(branchId),
      userId: auth.user.id,
      userName: auth.user.name,
      action: "payment",
      entity: "Payment",
      entityId: String(payment._id),
      description: `Collected ${input.amount} against invoice ${invoice.invoiceNo}`,
    });
    return NextResponse.json({ ok: true, data: payment, message: "Payment recorded" }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
