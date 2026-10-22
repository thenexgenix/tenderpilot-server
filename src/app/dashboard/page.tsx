import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { recentActivity, tenders } from "@/components/mock-data";
import { Badge, Table } from "@/components/ui";

function StatusBadge({ status }: { status: string }) {
  if (status === "ANALYZED") {
    return <Badge variant="green">ANALYZED</Badge>;
  }

  if (status === "PROCESSING") {
    return <Badge variant="blue">PROCESSING</Badge>;
  }

  return <Badge variant="amber">ATTENTION REQUIRED</Badge>;
}

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-7">
        <section>
          <div>
            <p className="text-sm font-medium text-blue-600">
              Tender workspace
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#0f2a47] lg:text-4xl">
              Good morning, review with confidence
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              AI suggestions highlight key insights. Always verify details
              against the original tender document.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon="▰"
            title="Active tenders"
            value="12"
            caption="Across all projects"
            tone="blue"
          />
          <StatCard
            icon="!"
            title="Needs review"
            value="4"
            caption="Attention required"
            tone="amber"
          />
          <StatCard
            icon="▤"
            title="Drafts in progress"
            value="6"
            caption="Keep drafting"
            tone="green"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
              <h2 className="text-lg font-bold text-[#0f2a47]">Your tenders</h2>
              <div className="flex gap-2">
                <button className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50">
                  ⚱ Filter
                </button>
                <select className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-600">
                  <option>All tenders</option>
                  <option>Analyzed</option>
                  <option>Processing</option>
                </select>
              </div>
            </div>

            <div className="hidden md:block">
              <Table>
                <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Tender title</th>
                    <th className="px-4 py-3 font-semibold">Issuer</th>
                    <th className="px-4 py-3 font-semibold">Deadline</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {tenders.map((tender) => (
                    <tr
                      key={tender.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <Link
                          href={`/tenders/${tender.id}`}
                          className="flex items-center gap-3"
                        >
                          <span className="text-xl">📄</span>
                          <span>
                            <span className="block font-semibold text-slate-800">
                              {tender.title}
                            </span>
                            <span className="text-xs text-slate-500">
                              {tender.reference}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {tender.issuer}
                        <span className="block text-xs text-slate-400">
                          {tender.location}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {tender.deadline}
                        <span className="block text-xs text-slate-400">
                          {tender.time}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={tender.status} />
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-500">
                        {tender.updated}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            <div className="space-y-3 p-4 md:hidden">
              {tenders.map((tender) => (
                <Link
                  key={tender.id}
                  href={`/tenders/${tender.id}`}
                  className="block rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {tender.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {tender.reference} · {tender.issuer}
                      </p>
                    </div>
                    <StatusBadge status={tender.status} />
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    Deadline: {tender.deadline}, {tender.time}
                  </p>
                </Link>
              ))}
            </div>

            <div className="border-t border-slate-100 p-4 text-sm text-slate-500">
              Showing 1 to 5 of 12 tenders
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 p-5">
              <h2 className="font-bold text-[#0f2a47]">Recent activity</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {recentActivity.map(([icon, title, subtitle, time]) => (
                <div key={`${title}-${time}`} className="flex gap-3 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    {icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-700">
                      {title}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {subtitle}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">{time}</span>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}

function StatCard({
  icon,
  title,
  value,
  caption,
  tone,
}: {
  icon: string;
  title: string;
  value: string;
  caption: string;
  tone: "blue" | "amber" | "green";
}) {
  const styles = {
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-green-50 text-green-600",
  };

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl ${styles[tone]}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-3xl font-bold text-[#0f2a47]">{value}</p>
        <p className="text-xs text-slate-400">{caption}</p>
      </div>
    </div>
  );
}
