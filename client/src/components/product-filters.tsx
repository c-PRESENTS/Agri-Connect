import { useState } from "react";
import { Filter, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import type { ProductFilters as Filters } from "@shared/schema";

interface ProductFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  totalProducts: number;
}

export function ProductFilters({ filters, onFiltersChange, totalProducts }: ProductFiltersProps) {
  const [localFilters, setLocalFilters] = useState<Filters>(filters);
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters: Filters = {};
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== null && v !== "").length;

  const DesktopFilters = () => (
    <div className="hidden lg:flex items-center gap-4 p-4 border-b bg-muted/30 backdrop-blur-sm dark:bg-muted/20 dark:border-white/[0.06]">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium">Filters</span>
      </div>

      <Select value={filters.sortBy || ""} onValueChange={(value) => updateFilter("sortBy", value as Filters["sortBy"])}>
        <SelectTrigger className="w-40" data-testid="select-sort">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="price_asc">Price: Low to High</SelectItem>
          <SelectItem value="price_desc">Price: High to Low</SelectItem>
          <SelectItem value="rating">Top Rated</SelectItem>
          <SelectItem value="distance">Nearest</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.distance?.toString() || ""} onValueChange={(value) => updateFilter("distance", value ? parseInt(value) : undefined)}>
        <SelectTrigger className="w-36" data-testid="select-distance">
          <SelectValue placeholder="Distance" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="5">Within 5 km</SelectItem>
          <SelectItem value="10">Within 10 km</SelectItem>
          <SelectItem value="25">Within 25 km</SelectItem>
          <SelectItem value="50">Within 50 km</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.rating?.toString() || ""} onValueChange={(value) => updateFilter("rating", value ? parseFloat(value) : undefined)}>
        <SelectTrigger className="w-32" data-testid="select-rating">
          <SelectValue placeholder="Rating" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="4.5">4.5+ Stars</SelectItem>
          <SelectItem value="4">4+ Stars</SelectItem>
          <SelectItem value="3.5">3.5+ Stars</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Switch
          id="organic-desktop"
          checked={filters.isOrganic || false}
          onCheckedChange={(checked) => updateFilter("isOrganic", checked || undefined)}
          data-testid="switch-organic"
        />
        <Label htmlFor="organic-desktop" className="text-sm cursor-pointer">
          Organic Only
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="instock-desktop"
          checked={filters.inStock || false}
          onCheckedChange={(checked) => updateFilter("inStock", checked || undefined)}
          data-testid="switch-instock"
        />
        <Label htmlFor="instock-desktop" className="text-sm cursor-pointer">
          In Stock
        </Label>
      </div>

      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1" data-testid="button-clear-filters">
          <X className="h-4 w-4" />
          Clear ({activeFilterCount})
        </Button>
      )}

      <span className="ml-auto text-sm text-muted-foreground">
        {totalProducts} products
      </span>
    </div>
  );

  const MobileFilters = () => (
    <div className="lg:hidden flex items-center justify-between p-4 border-b bg-muted/30 backdrop-blur-sm dark:bg-muted/20 dark:border-white/[0.06]">
      <span className="text-sm text-muted-foreground">{totalProducts} products</span>
      
      <div className="flex items-center gap-2">
        <Select value={filters.sortBy || ""} onValueChange={(value) => updateFilter("sortBy", value as Filters["sortBy"])}>
          <SelectTrigger className="w-36" data-testid="select-sort-mobile">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price_asc">Price: Low</SelectItem>
            <SelectItem value="price_desc">Price: High</SelectItem>
            <SelectItem value="rating">Top Rated</SelectItem>
            <SelectItem value="distance">Nearest</SelectItem>
          </SelectContent>
        </Select>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-filters-mobile">
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh] backdrop-blur-2xl bg-background/95 dark:bg-background/90">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            
            <div className="py-6 space-y-6 overflow-y-auto">
              <div className="space-y-4">
                <Label>Distance</Label>
                <Select value={localFilters.distance?.toString() || ""} onValueChange={(value) => setLocalFilters({ ...localFilters, distance: value ? parseInt(value) : undefined })}>
                  <SelectTrigger data-testid="select-distance-sheet">
                    <SelectValue placeholder="Select distance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">Within 5 km</SelectItem>
                    <SelectItem value="10">Within 10 km</SelectItem>
                    <SelectItem value="25">Within 25 km</SelectItem>
                    <SelectItem value="50">Within 50 km</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Price Range</Label>
                <div className="px-2">
                  <Slider
                    value={[localFilters.minPrice || 0, localFilters.maxPrice || 1000]}
                    min={0}
                    max={1000}
                    step={10}
                    onValueChange={([min, max]) => setLocalFilters({ ...localFilters, minPrice: min, maxPrice: max })}
                    data-testid="slider-price"
                  />
                  <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                    <span>₹{localFilters.minPrice || 0}</span>
                    <span>₹{localFilters.maxPrice || 1000}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Rating</Label>
                <Select value={localFilters.rating?.toString() || ""} onValueChange={(value) => setLocalFilters({ ...localFilters, rating: value ? parseFloat(value) : undefined })}>
                  <SelectTrigger data-testid="select-rating-sheet">
                    <SelectValue placeholder="Select rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4.5">4.5+ Stars</SelectItem>
                    <SelectItem value="4">4+ Stars</SelectItem>
                    <SelectItem value="3.5">3.5+ Stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="organic-mobile" className="cursor-pointer">Organic Products Only</Label>
                  <Switch
                    id="organic-mobile"
                    checked={localFilters.isOrganic || false}
                    onCheckedChange={(checked) => setLocalFilters({ ...localFilters, isOrganic: checked || undefined })}
                    data-testid="switch-organic-sheet"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="instock-mobile" className="cursor-pointer">In Stock Only</Label>
                  <Switch
                    id="instock-mobile"
                    checked={localFilters.inStock || false}
                    onCheckedChange={(checked) => setLocalFilters({ ...localFilters, inStock: checked || undefined })}
                    data-testid="switch-instock-sheet"
                  />
                </div>
              </div>
            </div>

            <SheetFooter className="flex gap-2">
              <Button variant="outline" onClick={clearFilters} className="flex-1" data-testid="button-clear-filters-sheet">
                Clear All
              </Button>
              <Button 
                onClick={() => {
                  onFiltersChange(localFilters);
                  setIsOpen(false);
                }} 
                className="flex-1"
                data-testid="button-apply-filters"
              >
                Apply Filters
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );

  return (
    <>
      <DesktopFilters />
      <MobileFilters />
    </>
  );
}
