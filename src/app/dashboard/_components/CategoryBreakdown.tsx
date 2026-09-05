import { Card, CardContent } from "@/components/ui/card";

import { categories } from "./mock-data";

/**
 * Displays a breakdown of spending by category with color-coded dots and amounts.
 */
export function CategoryBreakdown() {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="py-1">
        <div className="mb-3.5 text-sm font-bold text-foreground">
          Category breakdown
        </div>
        <ul className="flex flex-col gap-3">
          {categories.map((category) => (
            <li key={category.name} className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={`size-2.5 shrink-0 rounded-full ${category.dotClassName}`}
              />
              <span className="flex-1 text-sm text-foreground/85">
                {category.name}
              </span>
              <span className="text-sm font-semibold text-foreground">
                ฿{category.amount}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
