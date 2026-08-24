import { useMutation } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Edit3, ExternalLink, Package, Plus } from "lucide-react";
import type { Product, SellerVerificationCapability } from "@shared/schema";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { resolveProductImageForProduct } from "@/lib/product-images";
import { SafeProductImage } from "@/components/safe-product-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function SellerListingsWorkspace({ products, capabilities }: { products: Product[]; capabilities?: SellerVerificationCapability }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const submit = useMutation({
    mutationFn: async (product: Product) => (await apiRequest("POST", `/api/products/${product.id}/submit`, { expectedUpdatedAt: product.updatedAt })).json(),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/seller"] }); toast({ title: "Listing submitted for review" }); },
    onError: (error: Error) => toast({ title: "Listing could not be submitted", description: error.message, variant: "destructive" }),
  });
  return <section className="space-y-4" data-testid="seller-listings-workspace">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Listings and inventory</h2><p className="text-sm text-muted-foreground">Manage product visibility and current stock.</p></div><Button onClick={() => navigate("/dashboard/list-product")}><Plus className="mr-2 h-4 w-4" />Create listing</Button></div>
    {!capabilities?.canPublishListings && <div className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900"><AlertCircle className="h-5 w-5 shrink-0" />New products are private drafts. Seller verification and an approved region are required before an admin can approve them.</div>}
    {!products.length ? <Card><CardContent className="py-14 text-center"><Package className="mx-auto h-10 w-10 text-muted-foreground" /><h3 className="mt-3 font-black">No listings yet</h3><p className="mt-1 text-sm text-muted-foreground">Create your first draft and submit it for marketplace review.</p></CardContent></Card> : <div className="grid gap-3 sm:grid-cols-2">{products.map((product) => { const image = resolveProductImageForProduct(product, { imageOwnership: "seller" }); const status = product.moderationStatus ?? (product.publicationStatus === "published" ? "approved" : "draft"); const canSubmit = status === "draft" || status === "changes_requested"; return <Card key={product.id}><CardContent className="flex gap-3 p-3"><SafeProductImage src={image.src} fallbackSrc={image.fallbackSrc} alt={product.name} className="h-24 w-24 rounded-xl object-cover" /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div><h3 className="truncate font-black">{product.name}</h3><p className="text-xs text-muted-foreground">{product.stock} {product.unit} available</p></div><Badge variant={status === "approved" ? "default" : "secondary"}>{status.replaceAll("_", " ")}</Badge></div>{(product.moderationReason || product.publicationReason) && <p className="mt-2 text-xs font-semibold text-amber-700">{product.moderationReason || product.publicationReason}</p>}<div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => navigate(`/products/${product.id}`)}><ExternalLink className="mr-1 h-3.5 w-3.5" />View</Button>{canSubmit && <Button size="sm" disabled={!capabilities?.canPublishListings || submit.isPending || !product.updatedAt} onClick={() => submit.mutate(product)}><CheckCircle2 className="mr-1 h-3.5 w-3.5" />Submit</Button>}<Button size="sm" variant="ghost" disabled title="Editing will be added to this workspace next"><Edit3 className="h-3.5 w-3.5" /></Button></div></div></CardContent></Card>; })}</div>}
  </section>;
}
