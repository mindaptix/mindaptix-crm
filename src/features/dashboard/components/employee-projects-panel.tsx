"use client";

import { useActionState } from "react";
import { addProjectRepository } from "@/features/dashboard/actions/project-repositories";

type Project = { id: string; name: string; summary: string; status: string; repositoryUrls: string[] };

export function EmployeeProjectsPanel({ projects }: { projects: Project[] }) {
  return <div className="space-y-5 px-3 py-5 sm:px-7"><header><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">My work</p><h1 className="mt-1 text-2xl font-semibold text-slate-900">My projects</h1><p className="mt-2 text-sm text-slate-500">Add the GitHub repositories used for each project, including mobile apps, web apps and backends.</p></header>{projects.length ? <div className="grid gap-4 xl:grid-cols-2">{projects.map((project) => <ProjectCard key={project.id} project={project} />)}</div> : <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No active projects are assigned to you yet.</p>}</div>;
}

function ProjectCard({ project }: { project: Project }) {
  const [state, action, pending] = useActionState(addProjectRepository, {});
  return <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold text-slate-900">{project.name}</h2><p className="mt-1 text-sm text-slate-500">{project.summary}</p></div><span className="shrink-0 rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">{project.status.replaceAll("_", " ")}</span></div><div className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-sm font-semibold text-slate-700">Repositories</h3>{project.repositoryUrls.length ? <ul className="mt-2 space-y-2">{project.repositoryUrls.map((url) => <li key={url}><a className="break-all text-sm text-indigo-700 hover:underline" href={url} rel="noopener noreferrer" target="_blank">{url.replace("https://github.com/", "")}</a></li>)}</ul> : <p className="mt-2 text-sm text-slate-400">No repositories added yet.</p>}<form action={action} className="mt-4 flex flex-wrap gap-2"><input name="projectId" type="hidden" value={project.id} /><input aria-label={`GitHub repository URL for ${project.name}`} className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" name="repositoryUrl" placeholder="https://github.com/team/repository" required type="url" /><button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={pending} type="submit">{pending ? "Adding…" : "Add repository"}</button></form>{state.error ? <p className="mt-2 text-sm text-rose-700" role="alert">{state.error}</p> : null}{state.success ? <p className="mt-2 text-sm text-emerald-700" role="status">{state.success}</p> : null}</div></article>;
}
