export type ModuleCoverage = {
  code: string;
  title: string;
  count: number;
};

/**
 * Counts how many members of a cohort are on each module.
 *
 * Every caller must pass only the enrolments that belong to the batch being
 * viewed — a student can hold enrolments at several levels at once, and the
 * rest of them belong to other batches. On the student page that filtering
 * happens inside the get_batch_students RPC; on the admin page it is done
 * before the rows reach here.
 */
export function buildModuleCoverage(
  enrolments: Array<{ modules: { code: string; title: string } | null }>
): ModuleCoverage[] {
  const modules = new Map<string, ModuleCoverage>();

  for (const enrolment of enrolments) {
    const code = enrolment.modules?.code;
    if (!code) continue;

    const existing = modules.get(code);
    if (existing) existing.count += 1;
    else modules.set(code, { code, title: enrolment.modules?.title ?? "", count: 1 });
  }

  return [...modules.values()].sort((a, b) => a.code.localeCompare(b.code));
}