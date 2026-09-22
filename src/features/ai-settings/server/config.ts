import "server-only";
import connectDb from "@/database/mongodb/connect";
import { SettingModel } from "@/database/mongodb/models/setting";
import { decryptApiKey } from "./credentials";

export type AiProvider = "groq" | "openai";

const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

function readKey(value: string | undefined, encrypted: string | undefined) {
  if (encrypted) return decryptApiKey(encrypted);
  return value ?? "";
}

export async function getAiRuntimeConfig() {
  await connectDb();
  // Read the raw settings document so a long-running development server cannot
  // hide newly added encrypted-key fields behind an older cached Mongoose schema.
  const settings = await SettingModel.collection.findOne({ key: "company" }) as {
    aiChatProvider?: string;
    groqChatModel?: string;
    openAiChatModel?: string;
    groqApiKeyEncrypted?: string;
    openAiApiKeyEncrypted?: string;
  } | null;
  const provider: AiProvider = settings?.aiChatProvider === "OPENAI" ? "openai" : "groq";
  const groqModel = settings?.groqChatModel || process.env.GROQ_DSR_MODEL || DEFAULT_GROQ_MODEL;
  const openAiModel = settings?.openAiChatModel || process.env.OPENAI_DSR_MODEL || DEFAULT_OPENAI_MODEL;
  const groqKey = readKey(process.env.GROQ_API_KEY, settings?.groqApiKeyEncrypted);
  const openAiKey = readKey(process.env.OPENAI_API_KEY, settings?.openAiApiKeyEncrypted);

  return {
    provider,
    groq: { key: groqKey, model: groqModel },
    openai: { key: openAiKey, model: openAiModel },
  };
}
