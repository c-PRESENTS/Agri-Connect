import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, ImagePlus, Loader2, Trash2 } from "lucide-react";
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
import { prepareListingImage } from "@/lib/listing-image-upload";
import type { Product } from "@shared/schema";

function listingErrorMessage(reason: unknown): string {
  if (!(reason instanceof Error)) return "Unable to create listing.";
  const responseText = reason.message.replace(/^\d+:\s*/, "");
  try {
    const parsed = JSON.parse(responseText) as { error?: unknown };
    if (typeof parsed.error === "string") return parsed.error.replace(/^Validation error:\s*/, "").replace(/\s+at\s+"images\[\d+\]"$/, "");
  } catch { /* The response is already readable. */ }
  return responseText;
}

export default function ProductListingPage() {
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();
  const taxonomy = getSellerTaxonomy();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: params.get("productName") || "", description: "", price: "", unit: "kg", stock: "",
    categoryId: params.get("categoryId") || "", subcategoryId: params.get("subcategoryId") || "",
    imageUrl: "", regionId: params.get("regionId") || "",
  });
  const [uploadedImage, setUploadedImage] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedCategory = useMemo(() => taxonomy.find((item) => item.id === form.categoryId), [form.categoryId, taxonomy]);
  const { data: regionalAssignments = [] } = useQuery<Array<{ id: string; regionId: string; regionName: string; countryCode: string; canPublish: boolean }>>({ queryKey: ["/api/seller/regions"], enabled: user?.role === "farmer" });
  const activeRegions = regionalAssignments.filter((assignment) => assignment.canPublish);

  const selectGalleryImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setIsPreparingImage(true);
    try {
      setUploadedImage(await prepareListingImage(file));
      setUploadedFileName(file.name);
      setForm((current) => ({ ...current, imageUrl: "" }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to process this image.");
    } finally { setIsPreparingImage(false); }
  };

  const createListing = useMutation({
    mutationFn: async () => {
      const price = Number(form.price);
      const stock = Number(form.stock);
      const image = uploadedImage || form.imageUrl.trim();
      if (!form.name.trim()) throw new Error("Enter a product name.");
      if (!form.categoryId) throw new Error("Please select a category.");
      if (!form.subcategoryId) throw new Error("Please select a subcategory.");
      if (!Number.isFinite(price) || price < 0) throw new Error("Enter a valid price.");
      if (!Number.isInteger(stock) || stock < 0) throw new Error("Enter a valid quantity.");
      if (!form.unit.trim()) throw new Error("Enter a unit.");
      if (!image) throw new Error("Upload a product image or enter an image URL.");
      if (!uploadedImage) { try { new URL(image); } catch { throw new Error("Enter a valid image URL."); } }
      const response = await apiRequest("POST", "/api/products", {
        name: form.name.trim(), description: form.description.trim() || `Direct listing for ${form.name.trim()}.`,
        price, unit: form.unit.trim(), stock, categoryId: form.categoryId, subcategoryId: form.subcategoryId,
        images: [image], ...(form.regionId ? { regionId: form.regionId } : {}),
        ...(params.get("opportunityId") ? { opportunityId: params.get("opportunityId") } : {}),
      });
      return response.json() as Promise<Product>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0] ?? "").startsWith("/api/products") });
      navigate("/dashboard");
    },
    onError: (reason) => setError(listingErrorMessage(reason)),
  });

  if (!isLoading && !hasSellerTaxonomyAccess(user?.role)) return <div className="min-h-screen bg-background"><TopNavigation /><main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center"><h1 className="text-xl font-bold">Seller access required</h1><p className="mt-2 text-sm text-muted-foreground">Complete your seller profile before creating listings.</p><Button className="mt-5" onClick={() => navigate("/settings")}>Complete seller profile</Button></main></div>;

  return <div className="min-h-screen bg-background"><TopNavigation /><main className="mx-auto max-w-2xl px-4 py-8">
    <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate("/dashboard")}><ArrowLeft className="h-4 w-4" />Back to dashboard</Button>
    <Card><CardHeader><CardTitle>Create product listing</CardTitle><p className="text-sm text-muted-foreground">Seller location: {user?.location || "Location not specified"}</p>{activeRegions.length ? <p className="text-xs font-semibold text-emerald-700">Approved marketplace: {activeRegions.map((item) => `${item.regionName}, ${item.countryCode}`).join(" · ")}</p> : <p className="text-xs font-semibold text-amber-700">This listing will remain a draft until a selling region is approved in Seller Hub.</p>}</CardHeader>
    <CardContent><div className="mb-5 rounded-md border bg-muted/40 p-3 text-sm" data-testid="listing-policy"><div className="flex flex-wrap items-center gap-2 font-medium"><span>{LISTING_POLICY.title}</span><Badge variant="secondary">${LISTING_POLICY.feeUsd} policy</Badge></div><p className="mt-1 text-muted-foreground">{LISTING_POLICY.zeroEntryMessage}</p><p className="mt-1 text-xs text-muted-foreground">{LISTING_POLICY.enforcementMessage}</p></div>
    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); setError(null); createListing.mutate(); }}>
      <div><Label htmlFor="listing-name">Product name</Label><Input id="listing-name" data-testid="input-listing-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></div>
      <div><Label htmlFor="listing-description">Description (optional)</Label><Textarea id="listing-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><Label>Category</Label><Select value={form.categoryId} onValueChange={(categoryId) => setForm({ ...form, categoryId, subcategoryId: "" })}><SelectTrigger data-testid="select-listing-category"><SelectValue placeholder="Select a category" /></SelectTrigger><SelectContent>{taxonomy.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Subcategory</Label><Select value={form.subcategoryId} onValueChange={(subcategoryId) => setForm({ ...form, subcategoryId })} disabled={!selectedCategory}><SelectTrigger data-testid="select-listing-subcategory"><SelectValue placeholder="Select a subcategory" /></SelectTrigger><SelectContent>{selectedCategory?.subcategories.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div></div>
      {activeRegions.length > 1 && <div><Label>Approved selling region</Label><Select value={form.regionId} onValueChange={(regionId) => setForm({ ...form, regionId })}><SelectTrigger><SelectValue placeholder="Select the fulfilment region" /></SelectTrigger><SelectContent>{activeRegions.map((item) => <SelectItem key={item.id} value={item.id}>{item.regionName}, {item.countryCode}</SelectItem>)}</SelectContent></Select></div>}
      <div className="grid gap-4 sm:grid-cols-3"><div><Label htmlFor="listing-price">Price</Label><Input id="listing-price" data-testid="input-listing-price" type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></div><div><Label htmlFor="listing-stock">Quantity</Label><Input id="listing-stock" data-testid="input-listing-stock" type="number" min="0" step="1" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} /></div><div><Label htmlFor="listing-unit">Unit</Label><Input id="listing-unit" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} /></div></div>
      <div className="space-y-2"><Label>Product image</Label><input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={selectGalleryImage} data-testid="input-listing-gallery" />
        {uploadedImage ? <div className="flex items-center gap-3 rounded-lg border p-3"><img src={uploadedImage} alt="Selected product preview" className="h-20 w-20 rounded-md object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{uploadedFileName}</p><p className="text-xs text-emerald-700">Ready to upload with this listing</p></div><Button type="button" variant="ghost" size="icon" aria-label="Remove selected image" onClick={() => { setUploadedImage(""); setUploadedFileName(""); }}><Trash2 className="h-4 w-4" /></Button></div> : <Button type="button" variant="outline" className="w-full gap-2" disabled={isPreparingImage} onClick={() => galleryRef.current?.click()} data-testid="button-upload-listing-gallery">{isPreparingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}{isPreparingImage ? "Preparing image…" : "Upload from gallery"}</Button>}
        {!uploadedImage && <><div className="flex items-center gap-3 py-1 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">or use an image URL</div><Input id="listing-image" type="url" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://example.com/your-product-image.jpg" /></>}
        <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP up to 10 MB. Add a clear image of the actual product.</p></div>
      {error && <p className="text-sm text-destructive" data-testid="listing-error">{error}</p>}
      <Button className="w-full" type="submit" disabled={createListing.isPending || isPreparingImage || (activeRegions.length > 1 && !form.regionId)} data-testid="button-create-listing">{createListing.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create listing</Button>
    </form></CardContent></Card>
  </main></div>;
}
