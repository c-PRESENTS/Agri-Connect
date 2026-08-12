import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { TopNavigation } from "@/components/top-navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { hasSellerTaxonomyAccess, getSellerTaxonomy } from "@/lib/categories";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LISTING_POLICY } from "@/lib/listing-policy";
import type { Product } from "@shared/schema";

function listingErrorMessage(reason: unknown): string {
  if (!(reason instanceof Error)) return "Unable to create listing.";
  const responseText = reason.message.replace(/^\d+:\s*/, "");
  try {
    const parsed = JSON.parse(responseText) as { error?: unknown };
    if (typeof parsed.error === "string") {
      return parsed.error
        .replace(/^Validation error:\s*/, "")
        .replace(/\s+at\s+"images\[\d+\]"$/, "");
    }
  } catch {
    // Non-JSON errors are already suitable for display.
  }
  return responseText;
}

export default function ProductListingPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const taxonomy = getSellerTaxonomy();
  const opportunityParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [form, setForm] = useState({ name: opportunityParams.get("productName") || "", description: "", price: "", unit: "kg", stock: "", categoryId: opportunityParams.get("categoryId") || "", subcategoryId: opportunityParams.get("subcategoryId") || "", imageUrl: "", regionId: opportunityParams.get("regionId") || "" });
  const [error, setError] = useState<string | null>(null);
  const selectedCategory = useMemo(() => taxonomy.find((item) => item.id === form.categoryId), [form.categoryId, taxonomy]);
  const { data: regionalAssignments = [] } = useQuery<Array<{ id: string; regionId: string; regionName: string; countryCode: string; canPublish: boolean }>>({ queryKey: ["/api/seller/regions"], enabled: user?.role === "farmer" });
  const activeRegions = regionalAssignments.filter((assignment) => assignment.canPublish);

  const createListing = useMutation({
    mutationFn: async () => {
      const price = Number(form.price);
      const stock = Number(form.stock);
      const image = form.imageUrl.trim();
      if (!form.name.trim()) throw new Error("Enter a product name.");
      if (!form.categoryId) throw new Error("Please select a category.");
      if (!form.subcategoryId) throw new Error("Please select a subcategory.");
      if (!Number.isFinite(price) || price < 0) throw new Error("Enter a valid price.");
      if (!Number.isInteger(stock) || stock < 0) throw new Error("Enter a valid quantity.");
      if (!form.unit.trim()) throw new Error("Enter a unit.");
      if (!image) throw new Error("Add a genuine product image URL.");
      try { new URL(image); } catch { throw new Error("Enter a valid image URL."); }
      const response = await apiRequest("POST", "/api/products", {
        name: form.name.trim(),
        description: form.description.trim() || `Direct listing for ${form.name.trim()}.`,
        price,
        unit: form.unit.trim(),
        stock,
        categoryId: form.categoryId,
        subcategoryId: form.subcategoryId,
        images: [image],
        ...(form.regionId ? { regionId: form.regionId } : {}),
        ...(opportunityParams.get("opportunityId") ? { opportunityId: opportunityParams.get("opportunityId") } : {}),
      });
      return response.json() as Promise<Product>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => String(query.queryKey[0] ?? "").startsWith("/api/products"),
      });
      setLocation("/dashboard");
    },
    onError: (reason) => setError(listingErrorMessage(reason)),
  });

  if (!isLoading && !hasSellerTaxonomyAccess(user?.role)) {
    return <div className="min-h-screen bg-background"><TopNavigation /><main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center"><h1 className="text-xl font-bold">Seller access required</h1><p className="mt-2 text-sm text-muted-foreground">Complete your seller profile before creating listings.</p><Button className="mt-5" onClick={() => setLocation("/settings")}>Complete seller profile</Button></main></div>;
  }

  return <div className="min-h-screen bg-background"><TopNavigation /><main className="mx-auto max-w-2xl px-4 py-8"><Button variant="ghost" className="mb-4 gap-2" onClick={() => setLocation("/dashboard")}><ArrowLeft className="h-4 w-4" />Back to dashboard</Button><Card><CardHeader><CardTitle>Create product listing</CardTitle><p className="text-sm text-muted-foreground">Seller location: {user?.location || "Location not specified"}</p>{activeRegions.length > 0 ? <p className="text-xs font-semibold text-emerald-700">Approved marketplace: {activeRegions.map((assignment) => `${assignment.regionName}, ${assignment.countryCode}`).join(" · ")}</p> : <p className="text-xs font-semibold text-amber-700">This listing will remain a draft until a selling region is approved in Seller Hub.</p>}</CardHeader><CardContent><div className="mb-5 rounded-md border bg-muted/40 p-3 text-sm" data-testid="listing-policy"><div className="flex flex-wrap items-center gap-2 font-medium"><span>{LISTING_POLICY.title}</span><Badge variant="secondary">${LISTING_POLICY.feeUsd} policy</Badge></div><p className="mt-1 text-muted-foreground">{LISTING_POLICY.zeroEntryMessage}</p><p className="mt-1 text-xs text-muted-foreground">{LISTING_POLICY.enforcementMessage}</p></div><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); setError(null); createListing.mutate(); }}><div><Label htmlFor="listing-name">Product name</Label><Input id="listing-name" data-testid="input-listing-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div><div><Label htmlFor="listing-description">Description (optional)</Label><Textarea id="listing-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div><div className="grid gap-4 sm:grid-cols-2"><div><Label>Category</Label><Select value={form.categoryId} onValueChange={(categoryId) => setForm({ ...form, categoryId, subcategoryId: "" })}><SelectTrigger data-testid="select-listing-category"><SelectValue placeholder="Select a category" /></SelectTrigger><SelectContent>{taxonomy.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Subcategory</Label><Select value={form.subcategoryId} onValueChange={(subcategoryId) => setForm({ ...form, subcategoryId })} disabled={!selectedCategory}><SelectTrigger data-testid="select-listing-subcategory"><SelectValue placeholder="Select a subcategory" /></SelectTrigger><SelectContent>{selectedCategory?.subcategories.map((subcategory) => <SelectItem key={subcategory.id} value={subcategory.id}>{subcategory.name}</SelectItem>)}</SelectContent></Select></div></div>{activeRegions.length > 1 && <div><Label>Approved selling region</Label><Select value={form.regionId} onValueChange={(regionId) => setForm({ ...form, regionId })}><SelectTrigger><SelectValue placeholder="Select the fulfilment region" /></SelectTrigger><SelectContent>{activeRegions.map((assignment) => <SelectItem key={assignment.id} value={assignment.id}>{assignment.regionName}, {assignment.countryCode}</SelectItem>)}</SelectContent></Select></div>}<div className="grid gap-4 sm:grid-cols-3"><div><Label htmlFor="listing-price">Price</Label><Input id="listing-price" data-testid="input-listing-price" type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></div><div><Label htmlFor="listing-stock">Quantity</Label><Input id="listing-stock" data-testid="input-listing-stock" type="number" min="0" step="1" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} /></div><div><Label htmlFor="listing-unit">Unit</Label><Input id="listing-unit" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} /></div></div><div><Label htmlFor="listing-image">Product image URL</Label><Input id="listing-image" type="url" required value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://example.com/your-product-image.jpg" /><p className="mt-1 text-xs text-muted-foreground">Add a clear image of the actual product. Generic placeholder images are not accepted.</p></div>{error && <p className="text-sm text-destructive" data-testid="listing-error">{error}</p>}<Button className="w-full" type="submit" disabled={createListing.isPending || (activeRegions.length > 1 && !form.regionId)} data-testid="button-create-listing">{createListing.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create listing</Button></form></CardContent></Card></main></div>;
}
