import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "@/components/link";
import { Input, Select } from "@/components/ui/field";
import { getAdminUsers } from "@/lib/api-user";
import { AdminHeader, AdminTabs, requireRole } from "../admin-frame";
import { UserForm } from "../forms";

export const metadata: Metadata = { title: "Users & roles · Admin" };

/** USERS & ROLES (admins only): search, change role, block or unblock. Every change is audited. */
export default function AdminUsersPage({ searchParams }: PageProps<"/[lang]/admin/users">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <AdminHeader
        title="Users & roles"
        lead="Give helpers a role (Verifier: news and promises; Moderator: reports and causes; Admin: everything), or block an account that breaks the rules. Blocking signs them out at once. You can't change your own account, and the last admin can't be removed."
      />
      <Suspense fallback={<div className="mt-8 h-96 animate-pulse rounded-md bg-surface-muted" />}>
        {searchParams.then((sp) => (
          <Users q={typeof sp.q === "string" ? sp.q : ""} role={typeof sp.role === "string" ? sp.role : ""} blocked={sp.blocked === "1"} offset={Number(sp.offset) || 0} />
        ))}
      </Suspense>
    </div>
  );
}

async function Users({ q, role, blocked, offset }: { q: string; role: string; blocked: boolean; offset: number }) {
  const me = await requireRole("/admin/users", ["ADMIN"]);
  const { users, total } = await getAdminUsers({ q, role, blocked: blocked ? "1" : undefined, offset });
  const page = (o: number) => `/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), ...(role ? { role } : {}), ...(blocked ? { blocked: "1" } : {}), offset: String(o) })}`;
  return (
    <>
      <AdminTabs me={me} active="/admin/users" />
      <form className="mt-6 flex flex-wrap items-end gap-2" action="/admin/users">
        <Input name="q" defaultValue={q} placeholder="Search name or email" className="mt-0 max-w-xs" />
        <Select name="role" defaultValue={role} className="mt-0 w-40">
          <option value="">All roles</option>
          <option value="CITIZEN">Citizens</option>
          <option value="VERIFIER">Verifiers</option>
          <option value="MODERATOR">Moderators</option>
          <option value="ADMIN">Admins</option>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="blocked" value="1" defaultChecked={blocked} className="size-4" /> Blocked only
        </label>
        <button className="brutal-sm press rounded-md bg-surface px-3 py-2 text-sm font-semibold">Search</button>
      </form>
      <p className="mt-4 font-mono text-xs text-muted">
        {total.toLocaleString("en-IN")} {total === 1 ? "account" : "accounts"}
      </p>
      <ul className="mt-3 space-y-4">
        {users.map((u) => (
          <li key={u.id} className={`brutal rounded-md bg-surface p-4 ${u.isBlocked ? "opacity-75" : ""}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-bold">
                {u.name} <span className="font-mono text-xs font-normal text-muted">{u.email}</span>
              </p>
              <p className="flex flex-wrap gap-1.5 font-mono text-[11px] uppercase">
                <span className="rounded-sm border-2 border-ink px-1.5">{u.role}</span>
                {u.isBlocked && <span className="rounded-sm bg-danger px-1.5 text-white">blocked</span>}
                {u.googleLinked && <span className="rounded-sm border border-current px-1.5">google</span>}
                <span className="rounded-sm border border-current px-1.5">{u.emailVerified ? "verified" : "unverified"}</span>
              </p>
            </div>
            <p className="mt-1 text-xs text-muted">
              Joined {new Date(u.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })} · {u.issues} reports · {u.votes} votes
            </p>
            {u.id === me.id ? <p className="mt-3 text-sm text-muted">This is you.</p> : <UserForm id={u.id} role={u.role} isBlocked={u.isBlocked} />}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex gap-3">
        {offset > 0 && (
          <Link href={page(Math.max(offset - 30, 0))} className="underline">
            ← Newer
          </Link>
        )}
        {offset + users.length < total && (
          <Link href={page(offset + 30)} className="underline">
            Older →
          </Link>
        )}
      </div>
    </>
  );
}
