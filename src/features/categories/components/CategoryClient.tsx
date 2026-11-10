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
import { useSessionPageState } from "@/hooks/useSessionPageState";
import type { CategoryIcon } from "@/shared/contracts";
import type { Category } from "@/types/category";
import { z } from "zod";
import type { LucideIcon } from "lucide-react";
import { Plus, Utensils, Car, Home, ShoppingCart, Zap, HeartPulse, Film, MoreHorizontal, Wallet, Banknote, Gift, Award, PieChart, Star, Smile, Check, Pencil, GraduationCap, Briefcase, CreditCard, ArrowDownRight, ArrowUpRight } from "lucide-react";
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
const isCategoryType = (value: string): value is "expense" | "income" => value === "expense" || value === "income";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name must not exceed 50 characters"),
});

export function CategoryClient() {
  const [type, setType, typeRestored] = useSessionPageState(
    "categoryType", "expense" as "expense" | "income",
    isCategoryType
  );
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

  if (!typeRestored) {
    return <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8"><Skeleton className="h-8 w-44" /><Skeleton className="h-11 w-60" /><div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-36 rounded-2xl" /><Skeleton className="h-36 rounded-2xl" /><Skeleton className="h-36 rounded-2xl" /></div></main>;
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex items-center justify-between gap-3 sm:flex-wrap">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold text-foreground sm:text-2xl">Category</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Manage your income and expense category</p>
          </div>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger
              render={
                <Button className="gap-2 max-sm:size-11 max-sm:shrink-0 max-sm:px-0">
                  <Plus className="size-4" />
                  <span className="max-sm:sr-only">Add new category</span>
                </Button>
              }
            />

            <DialogContent className="rounded-2xl sm:max-w-[425px] max-h-[calc(100vh-2rem)] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
                <DialogDescription>
                  Add a new category for your {type === "expense" ? "expenses" : "incomes"}.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4 py-2">
                <div className="flex flex-col gap-2">
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

                <div className="flex flex-col gap-2">
                  <Label>Icon</Label>
                  <div className="grid grid-cols-6 gap-2 pt-1">
                    {ICONS.map((iconObj) => {
                      const IconComp = iconObj.icon;
                      const isSelected = newIcon === iconObj.name;
                      return (
                        <button
                          key={iconObj.name}
                          type="button"
                          onClick={() => setNewIcon(iconObj.name)}
                          aria-label={iconObj.name}
                          aria-pressed={isSelected}
                          className={cn(
                            "flex w-full aspect-square items-center justify-center rounded-xl border transition-all hover:scale-105",
                            isSelected
                              ? "border-primary bg-primary/10 text-primary shadow-sm"
                              : "border-border hover:bg-muted text-muted-foreground"
                          )}
                        >
                          <IconComp className="size-5" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Color Background</Label>
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {COLORS.map((color) => {
                      const isSelected = newColor === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewColor(color)}
                          aria-label={color}
                          aria-pressed={isSelected}
                          style={swatchStyle(color)}
                          className={cn(
                            "flex size-8 items-center justify-center rounded-full transition-transform hover:scale-110",
                            isSelected
                              ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                              : "opacity-80 hover:opacity-100"
                          )}
                        >
                          {isSelected && <Check className="size-4" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2 sm:gap-0">
                <DialogClose render={<Button variant="outline" type="button" />}>
                  Cancel
                </DialogClose>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Category"}</Button>
              </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>

      {/* Edit Category Dialog */}
      <Dialog open={categoryToEdit !== null} onOpenChange={(open) => !open && setCategoryToEdit(null)}>
        <DialogContent className="rounded-2xl sm:max-w-[425px] max-h-[calc(100vh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the details of your category.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
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

            <div className="flex flex-col gap-2">
              <Label>Icon</Label>
              <div className="grid grid-cols-6 gap-2 pt-1">
                {ICONS.map((iconObj) => {
                  const IconComp = iconObj.icon;
                  const isSelected = editIcon === iconObj.name;
                  return (
                    <button
                      key={`edit-${iconObj.name}`}
                      type="button"
                      onClick={() => setEditIcon(iconObj.name)}
                      aria-label={iconObj.name}
                      aria-pressed={isSelected}
                      className={cn(
                        "flex w-full aspect-square items-center justify-center rounded-xl border transition-all hover:scale-105",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <IconComp className="size-5" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Color Background</Label>
              <div className="flex flex-wrap gap-2.5 pt-1">
                {COLORS.map((color) => {
                  const isSelected = editColor === color;
                  return (
                    <button
                      key={`edit-${color}`}
                      type="button"
                      onClick={() => setEditColor(color)}
                      aria-label={color}
                      aria-pressed={isSelected}
                      style={swatchStyle(color)}
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full transition-transform hover:scale-110",
                        isSelected
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                          : "opacity-80 hover:opacity-100"
                      )}
                    >
                      {isSelected && <Check className="size-4" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between sm:gap-0">
            <Button
              variant="destructive"
              onClick={() => setCategoryToDelete(categoryToEdit)}
              type="button"
            >
              Delete
            </Button>
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" type="button" onClick={() => setCategoryToEdit(null)}>Cancel</Button>
              <Button onClick={handleEdit} disabled={updateMutation.isPending}>{updateMutation.isPending ? "Saving..." : "Save Changes"}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={categoryToDelete !== null} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <DialogContent className="rounded-2xl sm:max-w-[425px]">
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

      <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-muted rounded-xl w-full max-w-xs sm:max-w-sm">
        <button
          type="button"
          onClick={() => setType("expense")}
          className={cn(
            "flex h-11 items-center justify-center gap-2 rounded-lg text-base font-bold transition-all shadow-none",
            type === "expense"
              ? "bg-destructive text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ArrowDownRight className="size-5" aria-hidden="true" />
          Expense
        </button>
        <button
          type="button"
          onClick={() => setType("income")}
          className={cn(
            "flex h-11 items-center justify-center gap-2 rounded-lg text-base font-bold transition-all shadow-none",
            type === "income"
              ? "bg-success text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ArrowUpRight className="size-5" aria-hidden="true" />
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
            <Skeleton key={index} className="h-[150px] rounded-2xl" />
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
                "relative flex flex-col items-center justify-center p-4 sm:p-6 gap-4 rounded-2xl border-border/60 bg-card shadow-sm transition-all",
                !readOnly && "hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer hover:shadow-md group"
              )}
            >
              {!readOnly && <div
                className="absolute top-2.5 right-2.5 p-1.5 rounded-full text-muted-foreground group-hover:bg-muted group-hover:text-foreground max-md:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all"
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
              <span className="text-sm font-semibold text-foreground text-center truncate max-w-full">
                {cat.name}
              </span>
            </Card>
          );
        })}
      </div>
      )}
      </div>
    </main>
  );
}
