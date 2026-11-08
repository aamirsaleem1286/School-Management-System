import { Building2, Plus, Settings2, ShieldCheck, UserCog, Users } from "lucide-react";
import { Branch, Organization, User } from "@/models";
import { requirePage } from "@/lib/page";
import { ROLE_LABELS } from "@/lib/constants";
import { safeJson } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ResourceDialog, type FieldDef } from "@/components/shared/resource-dialog";
import { DeleteButton } from "@/components/shared/delete-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requirePage("settings.view");
  const [organization, branches, users] = await Promise.all([
    Organization.findById(user.organizationId).lean() as Promise<any>,
    Branch.find({ organizationId: user.organizationId }).sort({ name: 1 }).lean(),
    User.find({ organizationId: user.organizationId }).select("-passwordHash").populate("branchId", "name code").sort({ createdAt: -1 }).limit(100).lean(),
  ]);

  const branchOptions = branches.map((b: any) => ({ label: `${b.name} (${b.code})`, value: String(b._id) }));
  const roleOptions = Object.entries(ROLE_LABELS).map(([value, label]) => ({ label, value }));

  const orgFields: FieldDef[] = [
    { name: "name", label: "School name", required: true, colSpan: 2 },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Phone", type: "tel" },
    { name: "address", label: "Address", colSpan: 2 },
    { name: "city", label: "City" },
    { name: "country", label: "Country" },
    { name: "currency", label: "Currency" },
    { name: "locale", label: "Locale" },
    { name: "timezone", label: "Timezone" },
    { name: "settings.lateFeePerDay", label: "Late fee per day", type: "number", defaultValue: 0 },
    { name: "settings.modules.library", label: "Library module", type: "checkbox", defaultValue: true, placeholder: "Enabled" },
    { name: "settings.modules.transport", label: "Transport module", type: "checkbox", defaultValue: true, placeholder: "Enabled" },
    { name: "settings.modules.hostel", label: "Hostel module", type: "checkbox", defaultValue: false, placeholder: "Enabled" },
    { name: "settings.modules.inventory", label: "Inventory module", type: "checkbox", defaultValue: true, placeholder: "Enabled" },
    { name: "settings.modules.health", label: "Health module", type: "checkbox", defaultValue: true, placeholder: "Enabled" },
  ];

  const branchFields: FieldDef[] = [
    { name: "name", label: "Branch name", required: true },
    { name: "code", label: "Branch code", required: true },
    { name: "phone", label: "Phone", type: "tel" },
    { name: "email", label: "Email", type: "email" },
    { name: "address", label: "Address", colSpan: 2 },
    { name: "city", label: "City" },
    { name: "isActive", label: "Active", type: "checkbox", defaultValue: true, placeholder: "Active" },
  ];

  const userFields: FieldDef[] = [
    { name: "name", label: "Full name", required: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "password", label: "Password", type: "password", help: "Leave blank to keep the current password" },
    { name: "role", label: "Role", type: "select", required: true, options: roleOptions },
    { name: "branchId", label: "Branch", type: "select", options: branchOptions },
    { name: "phone", label: "Phone", type: "tel" },
    {
      name: "status",
      label: "Status",
      type: "select",
      defaultValue: "active",
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
        { label: "Suspended", value: "suspended" },
      ],
    },
  ];

  const branchRows = branches.map((b: any) => [
    <div key="n">
      <p className="font-medium">{b.name}</p>
      <p className="text-xs text-muted-foreground">{b.code}</p>
    </div>,
    <div key="c">
      <p>{b.phone || "-"}</p>
      <p className="text-xs text-muted-foreground">{b.email || ""}</p>
    </div>,
    [b.address, b.city].filter(Boolean).join(", ") || "-",
    <Badge key="s" variant={b.isActive ? "success" : "muted"}>{b.isActive ? "Active" : "Inactive"}</Badge>,
    <div key="a" className="flex justify-end gap-1">
      <ResourceDialog label="Edit" title="Edit branch" endpoint={`/api/branches/${b._id}`} method="PATCH" fields={branchFields} initial={safeJson(b)} triggerVariant="ghost" triggerSize="sm" icon={null} />
      <DeleteButton endpoint={`/api/branches/${b._id}`} name={b.name} />
    </div>,
  ]);

  const userRows = users.map((u: any) => [
    <div key="n">
      <p className="font-medium">{u.name}</p>
      <p className="text-xs text-muted-foreground">{u.email}</p>
    </div>,
    ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] || u.role,
    u.branchId?.name || "All branches",
    <StatusBadge key="s" status={u.status} />,
    <div key="a" className="flex justify-end gap-1">
      <ResourceDialog label="Edit" title="Edit user" endpoint={`/api/users/${u._id}`} method="PATCH" fields={userFields} initial={safeJson(u)} triggerVariant="ghost" triggerSize="sm" icon={null} />
      <DeleteButton endpoint={`/api/users/${u._id}`} name={u.name} />
    </div>,
  ]);

  const modules = organization?.settings?.modules || {};

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Manage your school profile, branches and user access.">
        <ResourceDialog label="Edit school" title="School profile" endpoint="/api/settings" method="PATCH" fields={orgFields} size="lg" icon={<Settings2 className="h-4 w-4" />} initial={safeJson(organization || {})} />
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4 text-muted-foreground" /> School profile</CardTitle>
            <CardDescription>Core identity used across invoices, reports and portals.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div><p className="text-muted-foreground">Name</p><p className="font-medium">{organization?.name || "-"}</p></div>
            <div><p className="text-muted-foreground">Email</p><p className="font-medium">{organization?.email || "-"}</p></div>
            <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{organization?.phone || "-"}</p></div>
            <div><p className="text-muted-foreground">City</p><p className="font-medium">{organization?.city || "-"}</p></div>
            <div><p className="text-muted-foreground">Currency</p><p className="font-medium">{organization?.currency || "-"}</p></div>
            <div><p className="text-muted-foreground">Timezone</p><p className="font-medium">{organization?.timezone || "-"}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-muted-foreground" /> Enabled modules</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(modules).length === 0 ? (
              <p className="text-sm text-muted-foreground">Using defaults</p>
            ) : (
              Object.entries(modules).map(([key, enabled]) => (
                <Badge key={key} variant={enabled ? "success" : "muted"} className="capitalize">{key}</Badge>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="branches">
        <TabsList>
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="branches" className="space-y-3">
          <div className="flex justify-end">
            <ResourceDialog label="Add branch" title="Add branch" endpoint="/api/branches" fields={branchFields} icon={<Plus className="h-4 w-4" />} />
          </div>
          <DataTable headers={["Branch", "Contact", "Location", "Status", ""]} rows={branchRows} empty="No branches yet" emptyHint="Add a branch to organise your campuses." />
        </TabsContent>

        <TabsContent value="users" className="space-y-3">
          <div className="flex justify-end">
            <ResourceDialog label="Add user" title="Add user" endpoint="/api/users" fields={userFields} icon={<UserCog className="h-4 w-4" />} />
          </div>
          <DataTable headers={["User", "Role", "Branch", "Status", ""]} rows={userRows} empty="No users yet" emptyHint="Invite staff and guardians to access the portal." />
        </TabsContent>
      </Tabs>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="h-3.5 w-3.5" /> {users.length} users · {branches.length} branches
      </p>
    </div>
  );
}
