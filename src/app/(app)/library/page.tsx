import { BookOpen, BookUp, Library, Plus } from "lucide-react";
import { LibraryBook, LibraryTransaction } from "@/models";
import { branchScope } from "@/lib/api";
import { listParams, pageCount, readParam, requirePage, type SearchParams } from "@/lib/page";
import { getStudentOptions } from "@/lib/options";
import { formatCurrency, formatDate, safeJson } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchFilterBar } from "@/components/shared/search-filter-bar";
import { StatusBadge } from "@/components/shared/status-badge";
import { ResourceDialog, type FieldDef } from "@/components/shared/resource-dialog";
import { DeleteButton } from "@/components/shared/delete-button";
import { ActionButton } from "@/components/shared/action-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

export default async function LibraryPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePage("library.view");
  const params = await searchParams;
  const { page, limit, skip, q } = listParams(params, 10);
  const scope = branchScope(user);

  const filter: Record<string, unknown> = { ...scope };
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: rx }, { author: rx }, { isbn: rx }];
  }

  const [books, total, transactions, issued, studentOptions, copies] = await Promise.all([
    LibraryBook.find(filter).sort({ title: 1 }).skip(skip).limit(limit).lean(),
    LibraryBook.countDocuments(filter),
    LibraryTransaction.find(scope).populate("bookId", "title").populate("studentId", "firstName lastName admissionNo").sort({ issueDate: -1 }).limit(20).lean(),
    LibraryTransaction.countDocuments({ ...scope, status: "issued" }),
    getStudentOptions(user),
    LibraryBook.aggregate([{ $match: scope }, { $group: { _id: null, available: { $sum: "$copiesAvailable" }, total: { $sum: "$copiesTotal" } } }]),
  ]);

  const bookFields: FieldDef[] = [
    { name: "title", label: "Title", required: true, colSpan: 2 },
    { name: "author", label: "Author" },
    { name: "isbn", label: "ISBN" },
    { name: "category", label: "Category", defaultValue: "General" },
    { name: "copiesTotal", label: "Total copies", type: "number", defaultValue: 1, min: 0 },
    { name: "shelf", label: "Shelf" },
    { name: "price", label: "Price", type: "number", defaultValue: 0 },
    { name: "publishedYear", label: "Published year", type: "number" },
  ];

  const issueFields: FieldDef[] = [
    { name: "bookId", label: "Book", type: "select", required: true, options: books.map((b: any) => ({ label: `${b.title} (${b.copiesAvailable} available)`, value: String(b._id) })), colSpan: 2 },
    { name: "studentId", label: "Student", type: "select", required: true, options: studentOptions, colSpan: 2 },
    { name: "dueDate", label: "Due date", type: "date", required: true },
    { name: "borrowerType", label: "Borrower type", type: "hidden", defaultValue: "student" },
  ];

  const bookRows = books.map((b: any) => [
    <div key="t">
      <p className="font-medium">{b.title}</p>
      <p className="text-xs text-muted-foreground">{b.author || "Unknown author"}{b.isbn ? ` · ${b.isbn}` : ""}</p>
    </div>,
    b.category,
    `${b.copiesAvailable} / ${b.copiesTotal}`,
    b.shelf || "-",
    formatCurrency(b.price),
    <div key="a" className="flex justify-end gap-1">
      <ResourceDialog label="Edit" title="Edit book" endpoint={`/api/library/books/${b._id}`} method="PATCH" fields={bookFields} initial={safeJson(b)} triggerVariant="ghost" triggerSize="sm" icon={null} />
      <DeleteButton endpoint={`/api/library/books/${b._id}`} name={b.title} />
    </div>,
  ]);

  const txRows = transactions.map((t: any) => [
    t.bookId?.title || "-",
    t.studentId ? `${t.studentId.firstName} ${t.studentId.lastName}` : "-",
    formatDate(t.issueDate),
    formatDate(t.dueDate),
    t.returnDate ? formatDate(t.returnDate) : "-",
    <StatusBadge key="s" status={t.status} />,
    t.status === "issued" ? (
      <div key="a" className="flex justify-end">
        <ActionButton endpoint={`/api/library/transactions/${t._id}`} method="PATCH" label="Return" body={{ status: "returned", returnDate: new Date().toISOString() }} variant="soft" icon={<BookUp className="h-3.5 w-3.5" />} confirm="Mark this book as returned?" />
      </div>
    ) : (
      <span key="a" className="block text-right text-xs text-muted-foreground">Closed</span>
    ),
  ]);

  const availableCopies = copies[0]?.available || 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Library" description="Catalogue books and manage issues and returns.">
        <ResourceDialog label="Issue book" title="Issue book" endpoint="/api/library/transactions" fields={issueFields} icon={<BookUp className="h-4 w-4" />} />
        <ResourceDialog label="Add book" title="Add book" endpoint="/api/library/books" fields={bookFields} size="lg" icon={<Plus className="h-4 w-4" />} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Titles" value={total} icon={BookOpen} tone="secondary" />
        <StatCard label="Copies available" value={availableCopies} icon={Library} tone="success" />
        <StatCard label="Currently issued" value={issued} icon={BookUp} tone="warning" />
      </div>

      <Tabs defaultValue="books">
        <TabsList>
          <TabsTrigger value="books">Books</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>
        <TabsContent value="books" className="space-y-3">
          <SearchFilterBar placeholder="Search title, author or ISBN" />
          <DataTable headers={["Book", "Category", "Available", "Shelf", "Price", ""]} rows={bookRows} empty="No books in the catalogue" emptyHint="Add books to start lending." />
          <Pagination page={page} pages={pageCount(total, limit)} total={total} limit={limit} basePath="/library" params={{ q }} />
        </TabsContent>
        <TabsContent value="transactions" className="space-y-3">
          <DataTable headers={["Book", "Student", "Issued", "Due", "Returned", "Status", ""]} rows={txRows} empty="No library transactions yet" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
