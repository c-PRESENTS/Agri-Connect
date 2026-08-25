import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Archive, ArrowDown, ArrowUp, Eye, FolderTree, Plus, Send, UploadCloud } from "lucide-react";
import type { AdminCatalogCategory } from "@shared/schema";
import { AdminLayout } from "@/components/admin-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAdminAccess } from "@/hooks/use-admin-access";
import { useToast } from "@/hooks/use-toast";
import { handleCategoryImageError, resolveCategoryImage } from "@/lib/categories";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Response = { categories: AdminCatalogCategory[]; generatedAt: string };
type Editor = {
  id?: string;
  parentId: string;
  name: string;
  slug: string;
  icon: string;
  imageUrl: string;
  buyerVisible: boolean;
  sellerOnly: boolean;
  description: string;
  expectedVersion?: number;
};

const emptyEditor: Editor = { parentId: "", name: "", slug: "", icon: "Leaf", imageUrl: "", buyerVisible: true, sellerOnly: false, description: "" };

function statusVariant(status: AdminCatalogCategory["status"]): "default" | "secondary" | "destructive" | "outline" {
  return status === "published" ? "default" : status === "archived" ? "destructive" : status === "pending_review" ? "secondary" : "outline";
}

function CategoryPreviewImage({ category }: { category: AdminCatalogCategory }) {
  const image = resolveCategoryImage(category.canonicalId, category.imageUrl, category.parentId ?? undefined);
  return image
    ? <img src={image} alt="" className="h-10 w-10 rounded-lg border object-cover" onError={(event) => handleCategoryImageError(event.currentTarget, category.canonicalId, category.parentId ?? undefined)} />
    : <FolderTree className="h-8 w-8 text-muted-foreground" />;
}

export default function AdminCategoriesPage() {
  const access = useAdminAccess();
  const { toast } = useToast();
  const [previewDrafts, setPreviewDrafts] = useState(true);
  const [editor, setEditor] = useState<Editor>(emptyEditor);
  const [open, setOpen] = useState(false);
  const query = useQuery<Response>({ queryKey: ["/api/admin/categories?includeDrafts=true"], staleTime: 5_000 });
  const categories = query.data?.categories ?? [];
  const roots = useMemo(() => categories.filter((category) => !category.parentId), [categories]);
  const children = (parentId: string) => categories.filter((category) => category.parentId === parentId);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/admin/categories?includeDrafts=true"] }),
      queryClient.invalidateQueries({ predicate: (item) => String(item.queryKey[0]).startsWith("/api/catalog/categories") }),
    ]);
  };

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        parentId: editor.parentId || null,
        name: editor.name,
        slug: editor.slug,
        icon: editor.icon,
        imageUrl: editor.imageUrl || null,
        buyerVisible: editor.buyerVisible,
        sellerOnly: editor.sellerOnly,
        translations: {},
        content: { description: editor.description },
        ...(editor.id ? { expectedVersion: editor.expectedVersion } : {}),
      };
      const response = await apiRequest(editor.id ? "PATCH" : "POST", editor.id ? `/api/admin/categories/${encodeURIComponent(editor.id)}` : "/api/admin/categories", body);
      return response.json();
    },
    onSuccess: async () => { setOpen(false); setEditor(emptyEditor); await refresh(); toast({ title: "Category saved" }); },
    onError: (error) => toast({ title: "Category was not saved", description: error.message, variant: "destructive" }),
  });

  const transition = useMutation({
    mutationFn: async ({ category, action }: { category: AdminCatalogCategory; action: string }) => {
      const reason = action === "archive" || action === "request-changes" ? window.prompt("Reason (required)")?.trim() : undefined;
      if ((action === "archive" || action === "request-changes") && !reason) throw new Error("A reason is required.");
      const response = await apiRequest("POST", `/api/admin/categories/${encodeURIComponent(category.id)}/${action}`, { expectedVersion: category.version, reason });
      return response.json();
    },
    onSuccess: async () => { await refresh(); toast({ title: "Category lifecycle updated" }); },
    onError: (error) => toast({ title: "Category transition failed", description: error.message, variant: "destructive" }),
  });

  const reorder = useMutation({
    mutationFn: async ({ category, direction }: { category: AdminCatalogCategory; direction: -1 | 1 }) => {
      const siblings = category.parentId ? children(category.parentId) : roots;
      const index = siblings.findIndex((candidate) => candidate.id === category.id);
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= siblings.length) return;
      const ordered = [...siblings];
      [ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]];
      await apiRequest("POST", "/api/admin/categories/reorder", {
        parentId: category.parentId,
        orderedIds: ordered.map((item) => item.id),
        expectedVersions: Object.fromEntries(ordered.map((item) => [item.id, item.version])),
      });
    },
    onSuccess: refresh,
    onError: (error) => toast({ title: "Category order was not changed", description: error.message, variant: "destructive" }),
  });

  const startEdit = (category?: AdminCatalogCategory, parentId = "") => {
    setEditor(category ? {
      id: category.id,
      parentId: category.parentId ?? "",
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      imageUrl: category.imageUrl ?? "",
      buyerVisible: category.buyerVisible,
      sellerOnly: category.sellerOnly,
      description: String(category.content.description ?? ""),
      expectedVersion: category.version,
    } : { ...emptyEditor, parentId });
    setOpen(true);
  };

  const visible = (items: AdminCatalogCategory[]) => previewDrafts ? items : items.filter((item) => item.status === "published");
  const row = (category: AdminCatalogCategory, depth = 0) => (
    <div key={category.id} className="rounded-xl border bg-background p-3" style={{ marginLeft: depth * 20 }} data-testid={`category-row-${category.id}`}>
      <div className="flex flex-wrap items-center gap-3">
        <CategoryPreviewImage category={category} />
        <div className="min-w-44 flex-1">
          <div className="flex flex-wrap items-center gap-2"><p className="font-bold">{category.name}</p><Badge variant={statusVariant(category.status)}>{category.status.replace("_", " ")}</Badge></div>
          <p className="text-xs text-muted-foreground">/{category.slug} · {category.referenceCount} product references · v{category.version}</p>
        </div>
        <Button size="icon" variant="ghost" aria-label="Move up" disabled={!access.hasPermission("categories.reorder")} onClick={() => reorder.mutate({ category, direction: -1 })}><ArrowUp className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" aria-label="Move down" disabled={!access.hasPermission("categories.reorder")} onClick={() => reorder.mutate({ category, direction: 1 })}><ArrowDown className="h-4 w-4" /></Button>
        {access.hasPermission("categories.edit") && category.status !== "archived" && <Button size="sm" variant="outline" onClick={() => startEdit(category)}>Edit</Button>}
        {!category.parentId && access.hasPermission("categories.create") && <Button size="sm" variant="outline" onClick={() => startEdit(undefined, category.id)}><Plus className="mr-1 h-4 w-4" />Child</Button>}
        {category.status === "draft" && access.hasPermission("categories.edit") && <Button size="sm" onClick={() => transition.mutate({ category, action: "submit" })}><Send className="mr-1 h-4 w-4" />Submit</Button>}
        {category.status === "pending_review" && access.hasPermission("categories.publish") && <Button size="sm" onClick={() => transition.mutate({ category, action: "publish" })}><UploadCloud className="mr-1 h-4 w-4" />Publish</Button>}
        {category.status === "pending_review" && access.hasPermission("categories.edit") && <Button size="sm" variant="outline" onClick={() => transition.mutate({ category, action: "request-changes" })}>Changes</Button>}
        {category.status === "published" && access.hasPermission("categories.archive") && <Button size="sm" variant="destructive" disabled={category.referenceCount > 0 || category.childCount > 0} onClick={() => transition.mutate({ category, action: "archive" })}><Archive className="mr-1 h-4 w-4" />Archive</Button>}
      </div>
    </div>
  );

  return <AdminLayout><div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-black">Category management</h1><p className="text-sm text-muted-foreground">Draft, review, publish and order the taxonomy used by the AgriConnect marketplace.</p></div>
      <div className="flex items-center gap-3"><Label htmlFor="draft-preview" className="flex items-center gap-2"><Eye className="h-4 w-4" />Draft preview</Label><Switch id="draft-preview" checked={previewDrafts} onCheckedChange={setPreviewDrafts} />
      {access.hasPermission("categories.create") && <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button onClick={() => setEditor(emptyEditor)}><Plus className="mr-2 h-4 w-4" />New category</Button></DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editor.id ? "Edit category" : "Create category"}</DialogTitle></DialogHeader>
        <div className="grid gap-4"><div><Label>Name</Label><Input value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })} /></div><div><Label>Slug</Label><Input value={editor.slug} onChange={(event) => setEditor({ ...editor, slug: event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") })} /></div><div><Label>Parent</Label><select className="h-10 w-full rounded-md border bg-background px-3" value={editor.parentId} onChange={(event) => setEditor({ ...editor, parentId: event.target.value })}><option value="">Top level</option>{roots.filter((root) => root.id !== editor.id).map((root) => <option key={root.id} value={root.id}>{root.name}</option>)}</select></div><div><Label>Icon name</Label><Input value={editor.icon} onChange={(event) => setEditor({ ...editor, icon: event.target.value })} /></div><div className="space-y-2"><Label>Image path, HTTPS URL, or upload</Label><Input value={editor.imageUrl.startsWith("data:") ? "Uploaded image" : editor.imageUrl} onChange={(event) => setEditor({ ...editor, imageUrl: event.target.value })} /><Input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file=event.target.files?.[0]; event.target.value=""; if(!file)return; if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>2*1024*1024){ toast({ title:"Unsupported category image",description:"Use PNG, JPEG or WebP up to 2 MB.",variant:"destructive" }); return; } const reader=new FileReader(); reader.onload=()=>setEditor((current)=>({ ...current,imageUrl:String(reader.result??"") })); reader.readAsDataURL(file); }} /></div><div><Label>Description</Label><Textarea value={editor.description} onChange={(event) => setEditor({ ...editor, description: event.target.value })} /></div><Label className="flex items-center justify-between">Buyer visible<Switch checked={editor.buyerVisible} onCheckedChange={(value) => setEditor({ ...editor, buyerVisible: value })} /></Label><Label className="flex items-center justify-between">Seller only<Switch checked={editor.sellerOnly} onCheckedChange={(value) => setEditor({ ...editor, sellerOnly: value })} /></Label><Button disabled={save.isPending || !editor.name || !editor.slug} onClick={() => save.mutate()}>Save draft</Button></div>
      </DialogContent></Dialog>}</div></div>
    {query.isLoading ? <Card><CardContent className="p-10 text-center">Loading category hierarchy…</CardContent></Card> : query.isError ? <Card><CardContent className="space-y-3 p-10 text-center"><p className="font-bold">Category management could not be loaded.</p><Button variant="outline" onClick={() => query.refetch()}>Retry</Button></CardContent></Card> : <Card><CardHeader><CardTitle>{visible(roots).length} top-level categories</CardTitle></CardHeader><CardContent className="space-y-3">{visible(roots).map((root) => <div className="space-y-2" key={root.id}>{row(root)}{visible(children(root.id)).map((child) => row(child, 1))}</div>)}</CardContent></Card>}
  </div></AdminLayout>;
}
