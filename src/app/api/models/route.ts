import { getEngine, listCrops, FEATURES } from "@/server/ml";

export const dynamic = "force-dynamic";

export async function GET() {
  const eng = getEngine();
  return Response.json({
    report: eng.report,
    crops: listCrops(),
    features: FEATURES,
    versions: [
      {
        name: "crop_knn",
        version: "v1.0",
        algorithm: "k-Nearest Neighbours (k=9, distance-weighted)",
        training_date: eng.report.evaluatedAt,
        dataset_version: "Crop_recommendation.csv (repo datasets/)",
        metrics: { holdout_accuracy: eng.primaryAccuracy },
      },
      {
        name: "yield_reference",
        version: "v1.0",
        algorithm: "Reference-yield agro-climatic adjustment (rule + profile)",
        training_date: eng.report.evaluatedAt,
        dataset_version: "public agricultural statistics (approximate)",
        metrics: { note: "factor-adjusted reference model — estimate only" },
      },
      {
        name: "price_linear",
        version: "v1.0",
        algorithm: "OLS trend on monthly agmarknet averages",
        training_date: eng.report.evaluatedAt,
        dataset_version: "agmarknet 2024–25 (bundled)",
        metrics: { note: "short-horizon planning estimate" },
      },
      {
        name: "disease_screen",
        version: "v0.9",
        algorithm: "Colour-signature heuristic screening",
        training_date: eng.report.evaluatedAt,
        dataset_version: "curated class signatures",
        metrics: { note: "screening aid — not a CNN; label clearly in UI" },
      },
    ],
  });
}
