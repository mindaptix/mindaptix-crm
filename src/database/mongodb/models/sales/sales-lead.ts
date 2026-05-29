import mongoose, { type InferSchemaType, type Model } from "mongoose";
import { baseSchemaOptions } from "@/database/mongodb/models/shared/schema-options";

export const SALES_TECH_OPTIONS = [
  // ── Digital Marketing ──────────────────────────────────────────────────
  "SEO",
  "Google Ads",
  "Meta Ads",
  "Email Marketing",
  "Content Marketing",
  "Social Media Marketing",
  "Influencer Marketing",
  "SMS Marketing",
  "WhatsApp Marketing",
  "YouTube Ads",
  "LinkedIn Ads",
  "Twitter / X Ads",
  "Affiliate Marketing",
  "Performance Marketing",
  "CRO",
  "Google Analytics",
  "Content",
  "Automation",

  // ── Website & CMS ──────────────────────────────────────────────────────
  "WordPress",
  "Shopify",
  "Wix",
  "Webflow",
  "Elementor",
  "WooCommerce",
  "Magento",
  "BigCommerce",
  "Squarespace",
  "Drupal",
  "Joomla",
  "Custom Website",

  // ── AI & Automation ───────────────────────────────────────────────────
  "Claude AI",
  "ChatGPT",
  "OpenAI API",
  "Gemini AI",
  "LangChain",
  "AI Integration",
  "Hugging Face",
  "Stable Diffusion",
  "Midjourney",
  "AI Chatbot",
  "Machine Learning",
  "Zapier",
  "Make",
  "n8n",
  "Custom CRM",

  // ── Frontend ──────────────────────────────────────────────────────────
  "React",
  "Next.js",
  "Vue.js",
  "Angular",
  "TypeScript",
  "JavaScript",
  "HTML / CSS",
  "Tailwind CSS",
  "Redux",
  "GraphQL",

  // ── Backend & Database ────────────────────────────────────────────────
  "Node.js",
  "Python",
  "Django",
  "FastAPI",
  "PHP",
  "Laravel",
  "Java",
  "Spring Boot",
  "Go",
  "Rust",
  "MongoDB",
  "PostgreSQL",
  "MySQL",
  "Redis",
  "MERN",

  // ── Mobile ────────────────────────────────────────────────────────────
  "Flutter",
  "React Native",
  "Swift",
  "Kotlin",
  "iOS",
  "Android",

  // ── Design ───────────────────────────────────────────────────────────
  "UI/UX Design",
  "Figma",
  "Adobe XD",
  "Photoshop",
  "Illustrator",

  // ── Cloud & DevOps ────────────────────────────────────────────────────
  "AWS",
  "Azure",
  "Google Cloud",
  "Docker",
  "Kubernetes",
  "DevOps",
  "CI/CD",
] as const;

export type SalesTechOption = (typeof SALES_TECH_OPTIONS)[number];

export const SALES_LEAD_SOURCES = [
  "Website",
  "Referral",
  "Facebook",
  "Instagram",
  "LinkedIn",
  "WhatsApp",
  "Call",
  "Walk-in",
  "Campaign",
  "Other",
] as const;

export type SalesLeadSource = (typeof SALES_LEAD_SOURCES)[number];

export const SALES_LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const;

export type SalesLeadStatus = (typeof SALES_LEAD_STATUSES)[number];

export const SALES_CALL_STATUSES = [
  "NO_ANSWER",
  "CALLBACK",
  "LOST",
  "MAYBE_FUTURE",
  "NOT_INTERESTED",
] as const;

export type SalesCallStatus = (typeof SALES_CALL_STATUSES)[number];

export const SALES_LEAD_PRIORITIES = ["HOT", "WARM", "COLD"] as const;

export type SalesLeadPriority = (typeof SALES_LEAD_PRIORITIES)[number];

const salesLeadSchema = new mongoose.Schema(
  {
    salesUserId: {
      type: String,
      required: true,
      index: true,
    },
    companyName: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
    },
    clientName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    clientPhone: {
      type: String,
      trim: true,
      maxlength: 32,
      default: "",
    },
    clientEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 160,
      default: "",
    },
    source: {
      type: String,
      enum: SALES_LEAD_SOURCES,
      default: "Website",
      required: true,
    },
    status: {
      type: String,
      enum: SALES_LEAD_STATUSES,
      default: "NEW",
      required: true,
    },
    priority: {
      type: String,
      enum: SALES_LEAD_PRIORITIES,
      default: "WARM",
      required: true,
    },
    technologies: {
      type: [String],
      default: [],
      validate: {
        validator: (value: string[]) => value.every((item) => SALES_TECH_OPTIONS.includes(item as SalesTechOption)),
        message: "Invalid sales technology option.",
      },
    },
    meetingLink: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    meetingDate: {
      type: String,
      trim: true,
      default: "",
    },
    meetingTime: {
      type: String,
      trim: true,
      default: "",
    },
    nextFollowUpDate: {
      type: String,
      trim: true,
      default: "",
    },
    expectedCloseDate: {
      type: String,
      trim: true,
      default: "",
    },
    budget: {
      type: Number,
      default: 0,
      min: 0,
    },
    pitchedPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    deliveryDate: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    callStatus: {
      type: String,
      enum: [...SALES_CALL_STATUSES, ""],
      default: "",
    },
    dateOfFirstCall: {
      type: String,
      trim: true,
      default: "",
    },
    dateOfLastCall: {
      type: String,
      trim: true,
      default: "",
    },
    callbackReminderDate: {
      type: String,
      trim: true,
      default: "",
    },
    callNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
  },
  baseSchemaOptions,
);

salesLeadSchema.index({ salesUserId: 1, createdAt: -1 });
salesLeadSchema.index({ salesUserId: 1, status: 1, priority: 1 });
salesLeadSchema.index({ salesUserId: 1, nextFollowUpDate: 1 });
salesLeadSchema.index({ meetingDate: 1, meetingTime: 1 });
salesLeadSchema.index({ clientEmail: 1, clientPhone: 1 });

export type SalesLeadRecord = InferSchemaType<typeof salesLeadSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SalesLeadModel =
  ((mongoose.models.SalesLead as Model<SalesLeadRecord> | undefined) ??
    mongoose.model<SalesLeadRecord>("SalesLead", salesLeadSchema));
