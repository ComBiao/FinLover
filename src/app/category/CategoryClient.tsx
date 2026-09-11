"use client";
import { useState } from "react";
import { useCategories } from "@/hooks/useCategories";
import { z } from "zod";
import { Plus, Utensils, Car, Home, ShoppingCart, Zap, HeartPulse, Film, MoreHorizontal, Wallet, Banknote, Gift, Award, PieChart, Star, Smile, Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ICONS = [
  { name: 'Utensils', icon: Utensils },
  { name: 'Car', icon: Car },
  { name: 'Home', icon: Home },
  { name: 'ShoppingCart', icon: ShoppingCart },
  { name: 'Zap', icon: Zap },
  { name: 'HeartPulse', icon: HeartPulse },
  { name: 'Film', icon: Film },
  { name: 'Wallet', icon: Wallet },
  { name: 'Banknote', icon: Banknote },
  { name: 'Gift', icon: Gift },
  { name: 'Award', icon: Award },
  { name: 'PieChart', icon: PieChart },
  { name: 'MoreHorizontal', icon: MoreHorizontal },
  { name: 'Star', icon: Star },
  { name: 'Smile', icon: Smile },
];

const COLORS = [
  "bg-blue-100 text-blue-600",
  "bg-red-100 text-red-600",
  "bg-green-100 text-green-600",
  "bg-purple-100 text-purple-600",
  "bg-orange-100 text-orange-600",
  "bg-pink-100 text-pink-600",
  "bg-yellow-100 text-yellow-600",
  "bg-gray-100 text-gray-600",
];

const initialExpenses = [
  { id: 1, name: "Food & Drinks", iconName: "Utensils", color: "bg-orange-100 text-orange-600" },
  { id: 2, name: "Transportation", iconName: "Car", color: "bg-blue-100 text-blue-600" },
  { id: 3, name: "Essentials", iconName: "Home", color: "bg-green-100 text-green-600" },
  { id: 4, name: "Shopping", iconName: "ShoppingCart", color: "bg-pink-100 text-pink-600" },
  { id: 5, name: "Utilities", iconName: "Zap", color: "bg-yellow-100 text-yellow-600" },
  { id: 6, name: "Health", iconName: "HeartPulse", color: "bg-red-100 text-red-600" },
  { id: 7, name: "Entertainment", iconName: "Film", color: "bg-purple-100 text-purple-600" },
  { id: 8, name: "Others", iconName: "MoreHorizontal", color: "bg-gray-100 text-gray-600" },
];

const initialIncomes = [
  { id: 1, name: "Salary", iconName: "Wallet", color: "bg-green-100 text-green-600" },
  { id: 2, name: "Wages", iconName: "Banknote", color: "bg-emerald-100 text-emerald-600" },
  { id: 3, name: "Allowance/Gift", iconName: "Gift", color: "bg-pink-100 text-pink-600" },
  { id: 4, name: "Bonus", iconName: "Award", color: "bg-yellow-100 text-yellow-600" },
  { id: 5, name: "Investment", iconName: "PieChart", color: "bg-blue-100 text-blue-600" },
  { id: 6, name: "Others", iconName: "MoreHorizontal", color: "bg-gray-100 text-gray-600" },
];

const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name must not exceed 50 characters"),
});

export function CategoryClient() {
  const [type, setType] = useState<"expense" | "income">("expense");
  const { expenses, incomes, deleteCategory, editCategory, addCategory } = useCategories(initialExpenses, initialIncomes);

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState(ICONS[0].name);
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);

  const [categoryToEdit, setCategoryToEdit] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState(ICONS[0].name);
  const [editColor, setEditColor] = useState(COLORS[0]);
  const [editErrors, setEditErrors] = useState<Record<string, string[] | undefined>>({});

  const currentCategory = type === "expense" ? expenses : incomes;

  const confirmDelete = () => {
    if (categoryToDelete === null) return;
    deleteCategory(type, categoryToDelete);
    setCategoryToDelete(null);
    setCategoryToEdit(null);
  };

  const openEditModal = (cat: { id: number; name: string; iconName: string; color: string }) => {
    setCategoryToEdit(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.iconName);
    setEditColor(cat.color);
    setEditErrors({});
  };

  const handleEdit = () => {
    const trimmedName = editName.trim();
    const result = categorySchema.safeParse({ name: trimmedName });
    if (!result.success) {
      setEditErrors(result.error.flatten().fieldErrors);
      return;
    }

    if (categoryToEdit !== null) {
      editCategory(type, categoryToEdit, { name: trimmedName, iconName: editIcon, color: editColor });
    }

    setCategoryToEdit(null);
  };

  const handleCreate = () => {
    const trimmedName = newName.trim();
    const result = categorySchema.safeParse({ name: trimmedName });
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }

    setErrors({});

    const newCat = {
      id: Date.now(),
      name: trimmedName,
      iconName: newIcon,
      color: newColor,
    };

    addCategory(type, newCat);

    setIsOpen(false);
    setNewName("");
    setNewIcon(ICONS[0].name);
    setNewColor(COLORS[0]);
  };

  const getIconComponent = (iconName: string) => {
    const found = ICONS.find(i => i.name === iconName);
    return found ? found.icon : MoreHorizontal;
  };

  return (
    <main className="p-6 sm:p-8 max-w-5xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Category</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your income and expense category</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={<Button className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-xl" />}>
            <Plus className="size-4" />
            Add new category
          </DialogTrigger>

          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
              <DialogDescription>
                Add a new category for your {type === "expense" ? "expenses" : "incomes"}.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (errors.name) setErrors({});
                  }}
                  placeholder="e.g. Subscriptions"
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name && (
                  <p className="text-[13px] font-medium text-destructive">{errors.name[0]}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label>Icon</Label>
                <div className="grid grid-cols-5 gap-2 max-h-[140px] overflow-y-auto p-1">
                  {ICONS.map((iconObj) => {
                    const IconComp = iconObj.icon;
                    const isSelected = newIcon === iconObj.name;
                    return (
                      <button
                        key={iconObj.name}
                        onClick={() => setNewIcon(iconObj.name)}
                        aria-label={iconObj.name}
                        aria-pressed={isSelected}
                        className={cn(
                          "flex items-center justify-center p-2 rounded-lg border transition-all",
                          isSelected ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-border hover:bg-muted text-muted-foreground"
                        )}
                      >
                        <IconComp className="size-5" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Color Background</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {COLORS.map((color) => {
                    const isSelected = newColor === color;
                    return (
                      <button
                        key={color}
                        onClick={() => setNewColor(color)}
                        aria-label={color}
                        aria-pressed={isSelected}
                        className={cn(
                          "size-8 rounded-full flex items-center justify-center transition-transform hover:scale-110",
                          color,
                          isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "opacity-80 hover:opacity-100"
                        )}
                      >
                        {isSelected && <Check className="size-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button onClick={handleCreate}>Create Category</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Category Dialog */}
      <Dialog open={categoryToEdit !== null} onOpenChange={(open) => !open && setCategoryToEdit(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the details of your category.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value);
                  if (editErrors.name) setEditErrors({});
                }}
                placeholder="e.g. Subscriptions"
                aria-invalid={Boolean(editErrors.name)}
              />
              {editErrors.name && (
                <p className="text-[13px] font-medium text-destructive">{editErrors.name[0]}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Icon</Label>
              <div className="grid grid-cols-5 gap-2 max-h-[140px] overflow-y-auto p-1">
                {ICONS.map((iconObj) => {
                  const IconComp = iconObj.icon;
                  const isSelected = editIcon === iconObj.name;
                  return (
                    <button
                      key={`edit-${iconObj.name}`}
                      onClick={() => setEditIcon(iconObj.name)}
                      aria-label={iconObj.name}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex items-center justify-center p-2 rounded-lg border transition-all",
                        isSelected ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-border hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <IconComp className="size-5" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Color Background</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {COLORS.map((color) => {
                  const isSelected = editColor === color;
                  return (
                    <button
                      key={`edit-${color}`}
                      onClick={() => setEditColor(color)}
                      aria-label={color}
                      aria-pressed={isSelected}
                      className={cn(
                        "size-8 rounded-full flex items-center justify-center transition-transform hover:scale-110",
                        color,
                        isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "opacity-80 hover:opacity-100"
                      )}
                    >
                      {isSelected && <Check className="size-4" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button
              variant="destructive"
              onClick={() => setCategoryToDelete(categoryToEdit)}
              type="button"
            >
              Delete
            </Button>
            <div className="flex flex-col-reverse sm:flex-row gap-2 mt-4 sm:mt-0">
              <Button variant="outline" onClick={() => setCategoryToEdit(null)}>Cancel</Button>
              <Button onClick={handleEdit}>Save Changes</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={categoryToDelete !== null} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this category? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        {currentCategory.map((cat) => {
          const IconComponent = getIconComponent(cat.iconName);
          return (
            <Card
              key={cat.id}
              role="button"
              tabIndex={0}
              onClick={() => openEditModal(cat)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openEditModal(cat);
                }
              }}
              className="relative flex flex-col items-center justify-center p-6 gap-4 border-border/50 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer transition-all hover:shadow-sm group bg-card"
            >
              <div
                className="absolute top-2 right-2 p-1.5 rounded-full text-muted-foreground group-hover:bg-muted group-hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
                title="Edit Category"
              >
                <Pencil className="size-4" />
              </div>

              <div className={cn("size-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110", cat.color)}>
                <IconComponent className="size-7" />
              </div>
              <span className="text-sm font-medium text-foreground text-center">
                {cat.name}
              </span>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
