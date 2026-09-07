"use client";

import { useState } from "react";
import { Plus, Utensils, Car, Home, ShoppingCart, Zap, HeartPulse, Film, MoreHorizontal, Wallet, Banknote, Gift, Award, PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const expenseCategories = [
  { id: 1, name: "Food & Drinks", icon: Utensils, color: "bg-orange-100 text-orange-600" },
  { id: 2, name: "Transportation", icon: Car, color: "bg-blue-100 text-blue-600" },
  { id: 3, name: "Essentials", icon: Home, color: "bg-green-100 text-green-600" },
  { id: 4, name: "Shopping", icon: ShoppingCart, color: "bg-pink-100 text-pink-600" },
  { id: 5, name: "Utilities", icon: Zap, color: "bg-yellow-100 text-yellow-600" },
  { id: 6, name: "Health", icon: HeartPulse, color: "bg-red-100 text-red-600" },
  { id: 7, name: "Entertainment", icon: Film, color: "bg-purple-100 text-purple-600" },
  { id: 8, name: "Others", icon: MoreHorizontal, color: "bg-gray-100 text-gray-600" },
];

const incomeCategories = [
  { id: 1, name: "Salary", icon: Wallet, color: "bg-green-100 text-green-600" },
  { id: 2, name: "Wages", icon: Banknote, color: "bg-emerald-100 text-emerald-600" },
  { id: 3, name: "Allowance/Gift", icon: Gift, color: "bg-pink-100 text-pink-600" },
  { id: 4, name: "Bonus", icon: Award, color: "bg-yellow-100 text-yellow-600" },
  { id: 5, name: "Investment", icon: PieChart, color: "bg-blue-100 text-blue-600" },
  { id: 6, name: "Others", icon: MoreHorizontal, color: "bg-gray-100 text-gray-600" },
];

export default function CategoriesPage() {
  const [type, setType] = useState<"expense" | "income">("expense");
  const currentCategories = type === "expense" ? expenseCategories : incomeCategories;

  return (
    <main className="p-6 sm:p-8 max-w-5xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your income and expense categories</p>
        </div>
        <Button className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-xl">
          <Plus className="size-4" />
          Add new category
        </Button>
      </div>

      <div className="mb-8 flex p-1.5 bg-muted rounded-xl w-full max-w-sm">
        <button
          onClick={() => setType("expense")}
          className={cn(
            "flex-1 py-2 px-4 text-sm font-semibold rounded-lg transition-all",
            type === "expense" 
              ? "bg-card text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Expense
        </button>
        <button
          onClick={() => setType("income")}
          className={cn(
            "flex-1 py-2 px-4 text-sm font-semibold rounded-lg transition-all",
            type === "income" 
              ? "bg-card text-foreground shadow-sm" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Income
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {currentCategories.map((cat) => (
          <Card 
            key={cat.id} 
            className="flex flex-col items-center justify-center p-6 gap-4 border-border/50 hover:border-primary/50 cursor-pointer transition-all hover:shadow-sm group bg-card"
          >
            <div className={cn("size-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110", cat.color)}>
              <cat.icon className="size-7" />
            </div>
            <span className="text-sm font-medium text-foreground text-center">
              {cat.name}
            </span>
          </Card>
        ))}
      </div>
    </main>
  );
}
