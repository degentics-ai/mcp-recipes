import { Index } from "@upstash/vector";
import { SearchOptions } from "./index";

interface Recipe {
  id: string;
  name: string;
  description: string;
  nutrition: {
    calories: number;
    totalFat: number;
    sugar: number;
    sodium: number;
    protein: number;
    saturatedFat: number;
    carbohydrates: number;
  };
  steps: string[];
  ingredients: string[];
  minutes: number;
}

class RecipeVectorStore {
  private index: Index;

  constructor() {
    this.index = new Index({
      url: process.env.UPSTASH_VECTOR_URL,
      token: process.env.UPSTASH_VECTOR_TOKEN,
    });
  }

  async initialize(recipes: Recipe[]) {
    // Convert recipes to vector documents
    const vectorDocs = recipes.map((recipe) => ({
      id: recipe.id,
      data: `${recipe.name} ${recipe.description}`,
      metadata: {
        name: recipe.name,
        description: recipe.description,
        steps: recipe.steps,
        minutes: recipe.minutes,
        nutrition: recipe.nutrition,
        ingredients: recipe.ingredients,
      },
    }));

    // Index
    await this.index.upsert(vectorDocs, { namespace: "recipes-namespace" });
  }

  async searchRecipes(params: SearchOptions) {
    // Build query filter based on search options
    const getMetadataFilter = () => {
      const filter = [];

      if (params.maxMinutes) {
        filter.push(`nutrition.minutes < ${params.maxMinutes}`);
      }

      if (params.maxCalories) {
        filter.push(`nutrition.calories < ${params.maxCalories}`);
      }

      if (params.maxProtein) {
        filter.push(`nutrition.protein < ${params.maxProtein}`);
      }

      if (params.maxTotalFat) {
        filter.push(`nutrition.totalFat < ${params.maxTotalFat}`);
      }

      if (params.maxCarbohydrates) {
        filter.push(`nutrition.carbohydrates < ${params.maxCarbohydrates}`);
      }

      if (params.ingredients) {
        const ingredients = params.ingredients.map(
          (ingredient) => `ingredients CONTAINS '${ingredient}'`
        );
        filter.push(ingredients.join(" OR "));
      }

      return filter.join(" AND ");
    };

    // Perform similarity search with filters
    return this.index.query(
      {
        data: params.query,
        topK: params.maxResults,
        includeMetadata: true,
        filter: getMetadataFilter(),
      },
      { namespace: "recipes-namespace" }
    );
  }
}

export { RecipeVectorStore, type Recipe };
