import { z } from "zod";

import { createReadStream } from "fs";
import { parse } from "csv-parse";

import { RecipeVectorStore, Recipe } from "../src/db";

const BATCH_SIZE = 100; // Process 100 recipes at a time

const parseJsonArray = (val: string) => {
  return val.slice(2, -2).split("', '");
};

const RecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  nutrition: z.string().transform((val) => {
    const nums = JSON.parse(val);
    return {
      calories: nums[0],
      totalFat: nums[1],
      sugar: nums[2],
      sodium: nums[3],
      protein: nums[4],
      saturatedFat: nums[5],
      carbohydrates: nums[6],
    };
  }),
  minutes: z.string().transform((val) => parseInt(val)),
  ingredients: z.string().transform(parseJsonArray),
  steps: z.string().transform(parseJsonArray),
});

const processRecipeBatch = (records: any[]): Recipe[] => {
  return records.map((record) => {
    const parsed = RecordSchema.parse(record);
    return {
      id: parsed.id,
      name: parsed.name,
      description: parsed.description,
      nutrition: parsed.nutrition,
      minutes: parsed.minutes,
      ingredients: parsed.ingredients,
      steps: parsed.steps,
    };
  });
};

async function main() {
  const force = process.argv.includes("--force");
  console.log(`Initializing database${force ? " (force mode)" : ""}...`);

  try {
    const recipeStore = new RecipeVectorStore();
    let processedCount = 0;
    let currentBatch: any[] = [];

    // Create a readable stream for the CSV file
    const parser = createReadStream("data/recipes.csv").pipe(
      parse({ columns: true })
    );

    for await (const record of parser) {
      currentBatch.push(record);

      if (currentBatch.length >= BATCH_SIZE) {
        const recipes = processRecipeBatch(currentBatch);
        await recipeStore.initialize(recipes);
        processedCount += currentBatch.length;
        console.log(`Processed ${processedCount} recipes...`);
        currentBatch = [];
      }
    }

    // Process any remaining records
    if (currentBatch.length > 0) {
      const recipes = processRecipeBatch(currentBatch);
      await recipeStore.initialize(recipes);
      processedCount += currentBatch.length;
    }

    console.log(
      `Successfully initialized vector store with ${processedCount} recipes`
    );
  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
  }
}

main();
