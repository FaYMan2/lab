import { TASK_KINDS, defaultModelRouting } from "@genie/config";
import { prisma } from "@genie/db";
import { setGlobalRouting } from "./actions.js";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const defaults = defaultModelRouting();
  const rules = await prisma.routingRule
    .findMany({ where: { installationId: null, repoId: null } })
    .catch(() => []);
  const current = new Map(rules.map((r) => [r.task, r.modelRef]));

  const runs = await prisma.run
    .findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { repo: true } })
    .catch(() => []);

  return (
    <main>
      <section>
        <h2>Model routing</h2>
        <p style={{ color: "#555" }}>
          Which provider + model handles each task. Format <code>provider:model</code> —
          provider is <code>anthropic</code> or <code>gemini</code>. Empty falls back to the
          env default.
        </p>
        {TASK_KINDS.map((task) => (
          <form
            key={task}
            action={setGlobalRouting}
            style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0" }}
          >
            <input type="hidden" name="task" value={task} />
            <strong style={{ width: 110 }}>{task}</strong>
            <input
              name="modelRef"
              defaultValue={current.get(task) ?? defaults[task]}
              placeholder="anthropic:claude-haiku-4-5"
              style={{ flex: 1, padding: 6, border: "1px solid #ccc", borderRadius: 6 }}
            />
            <button type="submit" style={{ padding: "6px 12px" }}>
              Save
            </button>
          </form>
        ))}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Recent runs</h2>
        {runs.length === 0 && <p style={{ color: "#777" }}>No runs yet.</p>}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "6px 4px" }}>
                  {r.repo.owner}/{r.repo.name} #{r.prNumber}
                </td>
                <td>
                  <code>{r.headSha.slice(0, 7)}</code>
                </td>
                <td>{badge(r.status)}</td>
                <td>
                  {r.gifUrl ? (
                    <a href={r.gifUrl} target="_blank" rel="noreferrer">
                      demo
                    </a>
                  ) : (
                    <span style={{ color: "#999" }}>{r.detail?.slice(0, 60) ?? "—"}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function badge(status: string) {
  const color =
    status === "posted" ? "#137333" : status === "skipped" ? "#777" : status === "failed" ? "#b00020" : "#946200";
  return <span style={{ color }}>{status}</span>;
}
