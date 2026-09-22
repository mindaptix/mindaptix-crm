import "server-only";
import { ProjectModel } from "@/database/mongodb/models/project";
import { SalesPaymentModel } from "@/database/mongodb/models/sales-payment";
import { resolveLegacyProject } from "../project-mapping";

export async function linkLegacyPayments() {
  const [projects, payments] = await Promise.all([
    ProjectModel.find({}, { name: 1, clientName: 1 }).lean(),
    SalesPaymentModel.find({ projectId: { $in: [null, ""] } }, { projectName: 1, clientName: 1 }).lean(),
  ]);
  const choices = projects.map((project) => ({ id: String(project._id), name: project.name, clientName: project.clientName }));
  const updates = payments.flatMap((payment) => {
    const projectId = resolveLegacyProject(payment, choices);
    return projectId ? [{ updateOne: { filter: { _id: payment._id, projectId: { $in: [null, ""] } }, update: { $set: { projectId } } } }] : [];
  });
  if (updates.length) await SalesPaymentModel.bulkWrite(updates);
}
