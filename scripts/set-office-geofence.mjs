import fs from "node:fs";
import mongoose from "mongoose";

const OFFICE_SETTINGS = {
  key: "company",
  officeName: "Vista Business Tower",
  officeAddress: "D270 Phase, 8B, Phase 8B, Industrial Area, Sector 74, Sahibzada Ajit Singh Nagar, Punjab 140307",
  officeLatitude: 30.71033,
  officeLongitude: 76.690894,
  geoFenceRadiusMeters: 600,
  geoFenceEnabled: true,
};

function readLocalEnv() {
  return Object.fromEntries(
    fs
      .readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

async function main() {
  const env = readLocalEnv();
  if (!env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in .env.local");
  }

  await mongoose.connect(env.MONGO_URI);
  const result = await mongoose.connection.db.collection("settings").updateOne(
    { key: "company" },
    { $set: OFFICE_SETTINGS },
    { upsert: true },
  );

  console.log(
    JSON.stringify({
      matched: result.matchedCount,
      modified: result.modifiedCount,
      upserted: Boolean(result.upsertedId),
    }),
  );
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => undefined);
  });
