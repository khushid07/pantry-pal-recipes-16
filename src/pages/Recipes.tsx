import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ChefHat, Clock, Heart, Loader2, Sparkles } from "lucide-react";

interface Recipe {
  title: string;
  cooking_time: string;
  ingredients_used: string[];
  steps: string[];
}

export default function Recipes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const { data: items = [] } = useQuery({
    queryKey: ["pantry_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pantry_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const ingredients = items.map((i) => i.name);
      const { data, error } = await supabase.functions.invoke("generate-recipes", {
        body: { ingredients },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.recipes as Recipe[];
    },
    onSuccess: (data) => {
      setRecipes(data);
      toast({ title: "Recipes generated!", description: `Found ${data.length} recipes for you.` });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: async (recipe: Recipe) => {
      const { error } = await supabase.from("saved_recipes").insert({
        user_id: user!.id,
        title: recipe.title,
        cooking_time: recipe.cooking_time,
        ingredients_used: recipe.ingredients_used,
        steps: recipe.steps,
      });
      if (error) throw error;
    },
    onSuccess: () => toast({ title: "Recipe saved!" }),
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Recipe Generator</h1>
          <p className="mt-1 text-muted-foreground">
            AI-powered recipes from your {items.length} pantry ingredient{items.length !== 1 ? "s" : ""}.
          </p>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending || items.length === 0}
          size="lg"
          className="gap-2"
        >
          {generateMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
          {generateMutation.isPending ? "Generating..." : "Generate Recipes"}
        </Button>
      </div>

      {items.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <ChefHat className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">
              Add some ingredients to your pantry first, then come back to generate recipes!
            </p>
          </CardContent>
        </Card>
      )}

      {recipes.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe, i) => (
            <Card key={i} className="shadow-card hover:shadow-elevated transition-all animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="font-display text-xl leading-tight">{recipe.title}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => saveMutation.mutate(recipe)}
                    disabled={saveMutation.isPending}
                    className="shrink-0"
                  >
                    <Heart className="h-5 w-5 text-accent" />
                  </Button>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {recipe.cooking_time}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Ingredients</p>
                  <div className="flex flex-wrap gap-1.5">
                    {recipe.ingredients_used.map((ing, j) => (
                      <span key={j} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Steps</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-sm text-muted-foreground">
                    {recipe.steps.map((step, j) => (
                      <li key={j}>{step}</li>
                    ))}
                  </ol>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
