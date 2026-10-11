"use client";
import { useState } from "react";
import { toast } from "sonner";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "@/features/categories/hooks/useCategories";
import { FALLBACK_CATEGORY_NAME } from "@/features/categories/categoriesService";
import { ApiClientError } from "@/lib/api/client";
import { hexToRgba } from "@/components/chipColor";
import { Skeleton } from "@/components/ui/skeleton";
import type { CategoryIcon } from "@/shared/contracts";
import type { Category } from "@/types/category";
import { z } from "zod";
import type { LucideIcon } from "lucide-react";
import { Plus, Utensils, Car, Home, ShoppingCart, Zap, HeartPulse, Film, MoreHorizontal, Wallet, Banknote, Gift, Award, PieChart, Star, Smile, Check, Pencil, GraduationCap, Briefcase, CreditCard } from "lucide-react";
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

const ICONS: { name: CategoryIcon; icon: LucideIcon }[] = [
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
  { name: 'GraduationCap', icon: GraduationCap },
  { name: 'Briefcase', icon: Briefcase },
  { name: 'CreditCard', icon: CreditCard },
];

/** Same hues as the server's seeded defaults; the API stores colors as `#RRGGBB`. */
const COLORS = [
  "#2563EB",
  "#DC2626",
  "#16A34A",
  "#9333EA",
  "#EA580C",
  "#DB2777",
  "#CA8A04",
  "#4B5563",
];

/** Soft tinted background with a solid foreground, matching the previous bg-*-100 / text-*-600 look. */
const swatchStyle = (hex: string | undefined) =>
  hex ? { backgroundColor: hexToRgba(hex, 0.15), color: hex } : undefined;

/** Keeps the seeded per-type "Others" catch-all last, like the old fallback ordering. */
const otherLast = (categories: Category[]) =>
  [...categories].sort((a, b) => Number(isFallback(a)) - Number(isFallback(b)));
const isFallback = (category: Category) =>
  Boolean(category.isSystem) && category.name === FALLBACK_CATEGORY_NAME;

const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name must not exceed 50 characters"),
});

export function CategoryClient() {
  const [type, setType] = useState<"expense" | "income">("expense");
  const { data: categories = [], isLoading, isError, refetch } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState<CategoryIcon>(ICONS[0].name);
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});

  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  const [categoryToEdit, setCategoryToEdit] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState<CategoryIcon>(ICONS[0].name);
  const [editColor, setEditColor] = useState(COLORS[0]);
  const [editErrors, setEditErrors] = useState<Record<string, string[] | undefined>>({});

  const currentCategory = otherLast(categories.filter((category) => category.type === type));

  /** Shows the server's field/conflict message under the name input, else a toast. */
  const reportFailure = (error: unknown, setFieldErrors: (errors: Record<string, string[] | undefined>) => void) => {
    if (error instanceof ApiClientError && (error.fields?.name || error.status === 409)) {
      setFieldErrors({ name: [error.fields?.name ?? error.message] });
      return;
    }
    toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
  };

  const confirmDelete = async () => {
    if (categoryToDelete === null) return;
    try {
      await deleteMutation.mutateAsync(categoryToDelete);
      toast.success("Category deleted");
      setCategoryToDelete(null);
      setCategoryToEdit(null);
    } catch {
      // useDeleteCategory already toasts the failure; keep the dialog open to retry.
    }
  };

  const openEditModal = (cat: Category) => {
    if (cat.isSystem) return;
    setCategoryToEdit(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.iconName ?? ICONS[0].name);
    setEditColor(cat.color ?? COLORS[0]);
    setEditErrors({});
  };

  const handleEdit = async () => {
    const trimmedName = editName.trim();
    const result = categorySchema.safeParse({ name: trimmedName });
    if (!result.success) {
      setEditErrors(result.error.flatten().fieldErrors);
      return;
    }

    if (categoryToEdit === null) return;
    try {
      await updateMutation.mutateAsync({
        id: categoryToEdit,
        input: { name: trimmedName, icon: editIcon, color: editColor },
      });
      toast.success("Category updated");
      setCategoryToEdit(null);
    } catch (error) {
      reportFailure(error, setEditErrors);
    }
  };

  const handleCreate = async () => {
    const trimmedName = newName.trim();
    const result = categorySchema.safeParse({ name: trimmedName });
    if (!result.success) {
      setErrors(result.error.flatten().fieldErrors);
      return;
    }

    setErrors({});

    try {
      await createMutation.mutateAsync({ name: trimmedName, type, icon: newIcon, color: newColor });
    } catch (error) {
      reportFailure(error, setErrors);
      return;
    }
    toast.success("Category created");
    setIsOpen(false);
    setNewName("");
    setNewIcon(ICONS[0].name);
    setNewColor(COLORS[0]);
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
                        style={swatchStyle(color)}
                        className={cn(
                          "size-8 rounded-full flex items-center justify-center transition-transform hover:scale-110",
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
              <Button onClick={handleCreate} disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Category"}</Button>
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
                      style={swatchStyle(color)}
                      className={cn(
                        "size-8 rounded-full flex items-center justify-center transition-transform hover:scale-110",
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
              <Button onClick={handleEdit} disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save Changes"}</Button>
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
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteMutation.isPending}>{deleteMutation.isPending ? "Deleting..." : "Delete"}</Button>
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

      {isLoading ? (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          aria-busy="true"
          aria-label="Loading categories"
        >
          {Array.from({ length: 10 }, (_, index) => (
            <Skeleton key={index} className="h-[150px] rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div role="alert" className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-muted-foreground">Couldn&apos;t load your categories.</p>
          <Button variant="outline" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : currentCategory.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No {type === "expense" ? "expense" : "income"} categories yet. Add one to get started.
        </p>
      ) : (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {currentCategory.map((cat) => {
          const IconComponent = cat.icon;
          const readOnly = Boolean(cat.isSystem);
          return (
            <Card
              key={cat.id}
              role={readOnly ? undefined : "button"}
              tabIndex={readOnly ? undefined : 0}
              onClick={readOnly ? undefined : () => openEditModal(cat)}
              onKeyDown={readOnly ? undefined : (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openEditModal(cat);
                }
              }}
              className={cn(
                "relative flex flex-col items-center justify-center p-6 gap-4 border-border/50 bg-card",
                !readOnly && "hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer transition-all hover:shadow-sm group"
              )}
            >
              {!readOnly && <div
                className="absolute top-2 right-2 p-1.5 rounded-full text-muted-foreground group-hover:bg-muted group-hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
                title="Edit Category"
              >
                <Pencil className="size-4" />
              </div>}

              <div
                className="size-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                style={swatchStyle(cat.color)}
              >
                <IconComponent className="size-7" />
              </div>
              <span className="text-sm font-medium text-foreground text-center">
                {cat.name}
              </span>
            </Card>
          );
        })}
      </div>
      )}
    </main>
  );
}
