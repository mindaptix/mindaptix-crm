type Project = { id: string; name: string; clientName?: string };
export function resolveLegacyProject(payment: { projectName?: string; clientName?: string }, projects: Project[]) {
  const normalize = (value?: string) => (value ?? "").trim().toLowerCase();
  if (!normalize(payment.projectName)) return "";
  const candidates = projects.filter((project) => normalize(project.name) === normalize(payment.projectName)
    && (!project.clientName || !payment.clientName || normalize(project.clientName) === normalize(payment.clientName)));
  return candidates.length === 1 ? candidates[0].id : "";
}
