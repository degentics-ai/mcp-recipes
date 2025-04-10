import { z } from "zod";

import { type Tool } from "./types";
import { createApp } from "./server";

import { RecipeVectorStore } from "./db";

// Get all recipes schema
const getAllRecipesInputSchema = z.object({
  query: z.string().describe("A detailed description of what you want to cook"),
  ingredients: z
    .array(z.string())
    .describe("A list of ingredients to filter by")
    .optional(),
  maxCalories: z.number().describe("Maximum calories per serving").optional(),
  maxTotalFat: z.number().describe("Maximum total fat per serving").optional(),
  maxCarbohydrates: z
    .number()
    .describe("Maximum carbohydrates per serving")
    .optional(),
  maxProtein: z.number().describe("Maximum protein per serving").optional(),
  maxMinutes: z
    .number()
    .describe("Maximum preparation time in minutes")
    .optional(),
  maxResults: z
    .number()
    .describe("Maximum number of results")
    .optional()
    .default(10),
});

const getRecipeByIdsInputSchema = z.object({
  ids: z.array(z.string()),
});

export type SearchOptions = z.infer<typeof getAllRecipesInputSchema>;

const recipeStore = new RecipeVectorStore();

const toolsArray: Tool[] = [
  {
    name: "search_recipes",
    description: "Search for recipes by name, ingredients, or description",
    inputSchema: getAllRecipesInputSchema,
    execute: async (params: z.infer<typeof getAllRecipesInputSchema>) => {
      return recipeStore.searchRecipes(params);
    },
  },
  {
    name: "get_recipe_by_id",
    description: "Get a recipe by its ID",
    inputSchema: getRecipeByIdsInputSchema,
    execute: async (params: z.infer<typeof getRecipeByIdsInputSchema>) => {
      return recipeStore.getRecipeByIds(params.ids);
    },
  },
];

// create a server

const SERVER_PORT = process.env.SERVER_PORT || 3000;
const app = createApp(toolsArray);

// Start the server
app.listen(SERVER_PORT, () => {
  console.log(`MCP server running on port ${SERVER_PORT}`);
});

module.exports = app;
