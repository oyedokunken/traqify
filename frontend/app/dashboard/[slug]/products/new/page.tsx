"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ImagePlus, AlertCircle, Wand2, ArrowLeft, GripVertical, X, Plus, Upload, Link as LinkIcon, Tag } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Topbar } from "@/components/dashboard/topbar";
import api from "@/lib/api";

const productSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  sku: z.string().min(2, "SKU is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.string().min(1, "Price is required").refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Price must be a positive number"),
  comparePrice: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  status: z.enum(["published", "draft"]),
  productType: z.enum(["SIMPLE", "DOWNLOADABLE", "VARIABLE"]),
  downloadUrl: z.string().optional(),
  isActive: z.boolean(),
  initialStock: z.number().min(0),
  lowStockAlert: z.number().min(0),
});
type ProductFormData = z.infer<typeof productSchema>;

const MAX_FILE_SIZE_MB = 2;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGES = 4;
const selectCls = "mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function generateSKU(name: string): string {
  const prefix = name.trim().split(/\s+/).slice(0, 3).map((w) => w[0]?.toUpperCase() || "").join("");
  return `${prefix || "PRD"}-${Math.floor(Math.random() * 900 + 100)}`;
}

export default function NewProductPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageError, setImageError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [downloadMode, setDownloadMode] = useState<"url" | "upload">("url");
  const [downloadFile, setDownloadFile] = useState<File | null>(null);
  const [attributes, setAttributes] = useState<{ name: string; values: string; id: number }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const downloadFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get("/api/categories").then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "", sku: "", description: "", price: "", comparePrice: "",
      categoryId: "", status: "published", productType: "SIMPLE",
      downloadUrl: "", isActive: true, initialStock: 0, lowStockAlert: 10,
    },
  });

  const nameValue = watch("name");
  const productType = watch("productType");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImageError("");
    const remaining = MAX_IMAGES - imagePreviews.length;
    if (remaining <= 0) { setImageError(`Maximum ${MAX_IMAGES} images allowed.`); return; }
    const toAdd = files.slice(0, remaining);
    for (const f of toAdd) {
      if (!ALLOWED_TYPES.includes(f.type)) { setImageError("Only JPG, PNG, or WebP images are allowed."); return; }
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) { setImageError(`Image must be under ${MAX_FILE_SIZE_MB}MB.`); return; }
    }
    setImageFiles((prev) => [...prev, ...toAdd]);
    setImagePreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
    e.target.value = "";
  };

  const removeImage = (i: number) => {
    setImagePreviews((prev) => prev.filter((_, idx) => idx !== i));
    setImageFiles((prev) => prev.filter((_, idx) => idx !== i));
  };

  const moveImage = (from: number, to: number) => {
    if (to < 0 || to >= imagePreviews.length) return;
    setImagePreviews((prev) => { const a = [...prev]; [a[from], a[to]] = [a[to], a[from]]; return a; });
    setImageFiles((prev) => { const a = [...prev]; [a[from], a[to]] = [a[to], a[from]]; return a; });
  };

  const onDragStart = (i: number) => setDragIdx(i);
  const onDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== i) moveImage(dragIdx, i);
    setDragIdx(i);
  };
  const onDragEnd = () => setDragIdx(null);

  const onFormError = (errs: any) => {
    const msgs = Object.values(errs).map((e: any) => e?.message).filter(Boolean) as string[];
    setValidationErrors(msgs);
  };

  const onSubmit = async (data: any) => {
    setIsLoading(true); setError(""); setValidationErrors([]);
    try {
      const uploadedUrls: string[] = [];
      if (imageFiles.length > 0) {
        setUploadProgress(true);
        for (const file of imageFiles) {
          const fd = new FormData(); fd.append("image", file);
          try {
            const r = await api.post("/api/products/upload-image", fd, { headers: { "Content-Type": "multipart/form-data" } });
            uploadedUrls.push(r.data.url);
          } catch { setImageError("Some images failed to upload and were skipped."); }
        }
        setUploadProgress(false);
      }

      const existingUrls = imagePreviews.filter((p) => !p.startsWith("blob:"));
      const allUrls = [...existingUrls, ...uploadedUrls];

      let downloadUrl = data.downloadUrl || undefined;
      if (data.productType === "DOWNLOADABLE" && downloadMode === "upload" && downloadFile) {
        const fd = new FormData(); fd.append("image", downloadFile);
        try {
          const r = await api.post("/api/products/upload-image", fd, { headers: { "Content-Type": "multipart/form-data" } });
          downloadUrl = r.data.url;
        } catch { setError("Failed to upload downloadable file."); setIsLoading(false); return; }
      }

      const variants = data.productType === "VARIABLE"
        ? attributes.flatMap((attr) =>
            attr.values.split(",").map((v) => ({ name: attr.name.trim(), value: v.trim() })).filter((v) => v.name && v.value)
          )
        : undefined;

      await api.post("/api/products", {
        ...data,
        price: parseFloat(data.price),
        comparePrice: data.comparePrice ? parseFloat(data.comparePrice) : undefined,
        initialStock: parseInt(data.initialStock),
        lowStockAlert: parseInt(data.lowStockAlert),
        imageUrl: allUrls[0] || undefined,
        imageUrls: allUrls,
        categoryId: data.categoryId || undefined,
        productType: data.productType || "SIMPLE",
        downloadUrl: data.productType === "DOWNLOADABLE" ? downloadUrl : undefined,
        variants,
      });
      router.push(`/dashboard/${params.slug}/products`);
    } catch (err: any) { setError(err.response?.data?.error || "Failed to save product."); }
    finally { setIsLoading(false); }
  };

  return (
    <div>
      <Topbar title="Products" slug={params.slug} />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push(`/dashboard/${params.slug}/products`)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0a0a0a] transition-colors">
            <ArrowLeft size={15} /> Back to products
          </button>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm font-semibold text-[#0a0a0a]">Add new product</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit, onFormError)}>
          {error && (
            <div className="flex items-start gap-2 text-sm text-[#DE1010] bg-red-50 px-4 py-3 rounded-lg mb-6 border border-red-200">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />{error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left/main column */}
            <div className="lg:col-span-2 space-y-6">

              {/* Basic info */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <h2 className="font-semibold text-[#0a0a0a] text-sm">Product information</h2>

                <div>
                  <Label>Product name <span className="text-[#DE1010]">*</span></Label>
                  <Input className="mt-1.5" placeholder="e.g. Nike Air Max" {...register("name", { required: "Name is required." })} />
                  {errors.name && <p className="text-xs text-[#DE1010] mt-1">{errors.name.message as string}</p>}
                </div>

                <div>
                  <Label>Description <span className="text-[#DE1010]">*</span></Label>
                  <textarea className="mt-1.5 flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    placeholder="Describe the product in detail — materials, dimensions, usage, etc."
                    {...register("description", { required: "Description is required." })} />
                  {errors.description && <p className="text-xs text-[#DE1010] mt-1">{errors.description.message as string}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category <span className="text-[#DE1010]">*</span></Label>
                    <select className={selectCls} {...register("categoryId", { required: "Category is required." })}>
                      <option value="">Select a category…</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    {errors.categoryId && <p className="text-xs text-[#DE1010] mt-1">{errors.categoryId.message as string}</p>}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label>SKU <span className="text-[#DE1010]">*</span></Label>
                      <button type="button" onClick={() => setValue("sku", generateSKU(nameValue))}
                        className="text-[10px] text-[#DE1010] flex items-center gap-1 hover:underline">
                        <Wand2 size={11} /> Auto-generate
                      </button>
                    </div>
                    <Input placeholder="e.g. NAM-001" {...register("sku", { required: "SKU is required." })} />
                    {errors.sku && <p className="text-xs text-[#DE1010] mt-1">{errors.sku.message as string}</p>}
                  </div>
                </div>
              </div>

              {/* Images */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-semibold text-[#0a0a0a] text-sm">Product images</h2>
                  <span className="text-xs text-gray-400">{imagePreviews.length}/{MAX_IMAGES} · drag to reorder</span>
                </div>
                <p className="text-xs text-gray-400 mb-4">Max {MAX_FILE_SIZE_MB}MB each · JPG, PNG, WebP. First image is the cover.</p>

                <div className="grid grid-cols-4 gap-3">
                  {imagePreviews.map((src, i) => (
                    <div key={i} draggable onDragStart={() => onDragStart(i)} onDragOver={(e) => onDragOver(e, i)} onDragEnd={onDragEnd}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all ${dragIdx === i ? "opacity-60 border-[#DE1010]" : "border-gray-200"}`}>
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <div className="absolute top-1.5 left-1.5 bg-black/50 rounded p-0.5"><GripVertical size={10} className="text-white" /></div>
                      <button type="button" onClick={() => removeImage(i)} className="absolute top-1.5 right-1.5 bg-white/90 rounded-full p-0.5 hover:bg-white shadow">
                        <X size={10} />
                      </button>
                      {i === 0 && <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full">Cover</span>}
                    </div>
                  ))}
                  {imagePreviews.length < MAX_IMAGES && (
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-[#DE1010]/40 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-[#DE1010] transition-colors">
                      <ImagePlus size={20} />
                      <span className="text-[10px]">Add image</span>
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleImageChange} />
                {imageError && <div className="flex items-center gap-1.5 text-xs text-[#DE1010] mt-2"><AlertCircle size={11} />{imageError}</div>}
                {uploadProgress && <p className="text-xs text-gray-400 mt-2">Uploading images…</p>}
              </div>

              {/* Pricing */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <h2 className="font-semibold text-[#0a0a0a] text-sm">Pricing</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Price (NGN) <span className="text-[#DE1010]">*</span></Label>
                    <Input className="mt-1.5" type="number" step="0.01" placeholder="0.00" {...register("price", { required: "Price is required." })} />
                    {errors.price && <p className="text-xs text-[#DE1010] mt-1">{errors.price.message as string}</p>}
                  </div>
                  <div>
                    <Label>Sale / compare price (optional)</Label>
                    <Input className="mt-1.5" type="number" step="0.01" placeholder="0.00" {...register("comparePrice")} />
                  </div>
                </div>
              </div>

              {/* Inventory */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <h2 className="font-semibold text-[#0a0a0a] text-sm">Inventory</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Initial stock</Label>
                    <Input className="mt-1.5" type="number" min="0" placeholder="0" {...register("initialStock")} />
                  </div>
                  <div>
                    <Label>Low stock alert at</Label>
                    <Input className="mt-1.5" type="number" min="0" placeholder="10" {...register("lowStockAlert")} />
                  </div>
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <h2 className="font-semibold text-[#0a0a0a] text-sm">Visibility & type</h2>
                <div>
                  <Label>Status</Label>
                  <select className={selectCls} {...register("status")}>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div>
                  <Label>Product type</Label>
                  <select className={selectCls} {...register("productType")}>
                    <option value="SIMPLE">Simple product</option>
                    <option value="DOWNLOADABLE">Downloadable</option>
                    <option value="VARIABLE">Variable product</option>
                  </select>
                </div>
                {productType === "DOWNLOADABLE" && (
                  <div className="space-y-2">
                    <Label>Download file</Label>
                    <div className="flex gap-2 mt-1.5">
                      <button type="button" onClick={() => setDownloadMode("url")}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${downloadMode === "url" ? "border-[#DE1010] bg-red-50 text-[#DE1010]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                        <LinkIcon size={12} /> Enter URL
                      </button>
                      <button type="button" onClick={() => setDownloadMode("upload")}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${downloadMode === "upload" ? "border-[#DE1010] bg-red-50 text-[#DE1010]" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                        <Upload size={12} /> Upload file
                      </button>
                    </div>
                    {downloadMode === "url" ? (
                      <>
                        <Input className="mt-1.5" placeholder="https://…" {...register("downloadUrl")} />
                        <p className="text-xs text-gray-400">Customers receive this link after purchase.</p>
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => downloadFileRef.current?.click()}
                          className="w-full mt-1.5 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-[#DE1010]/40 rounded-lg py-3 text-sm text-gray-400 hover:text-[#DE1010] transition-colors">
                          <Upload size={14} />
                          {downloadFile ? downloadFile.name : "Choose file (PDF, ZIP, etc.)"}
                        </button>
                        <input ref={downloadFileRef} type="file" className="hidden"
                          onChange={(e) => setDownloadFile(e.target.files?.[0] || null)} />
                        <p className="text-xs text-gray-400">Max 2MB. Hosted on Supabase.</p>
                      </>
                    )}
                  </div>
                )}

                {productType === "VARIABLE" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Product attributes</Label>
                      <button type="button"
                        onClick={() => setAttributes((a) => [...a, { name: "", values: "", id: Date.now() }])}
                        className="text-[10px] text-[#DE1010] flex items-center gap-1 hover:underline">
                        <Plus size={11} /> Add attribute
                      </button>
                    </div>
                    {attributes.length === 0 && (
                      <p className="text-xs text-gray-400">e.g. Size: S, M, L, XL or Colour: Red, Blue</p>
                    )}
                    {attributes.map((attr, i) => (
                      <div key={attr.id} className="space-y-1.5 bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Tag size={11} className="text-gray-400 flex-shrink-0" />
                          <Input placeholder="Attribute (e.g. Size)"
                            className="h-8 text-xs"
                            value={attr.name}
                            onChange={(e) => setAttributes((a) => a.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                          <button type="button" onClick={() => setAttributes((a) => a.filter((_, j) => j !== i))}
                            className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0">
                            <X size={12} className="text-gray-500" />
                          </button>
                        </div>
                        <Input placeholder="Values, comma-separated (e.g. S, M, L, XL)"
                          className="h-8 text-xs"
                          value={attr.values}
                          onChange={(e) => setAttributes((a) => a.map((x, j) => j === i ? { ...x, values: e.target.value } : x))} />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" id="isActive" {...register("isActive")} className="w-4 h-4 accent-[#DE1010]" />
                  <Label htmlFor="isActive" className="cursor-pointer text-sm">Visible in store</Label>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                <Button type="submit" className="w-full bg-[#DE1010] hover:bg-red-700 text-white" disabled={isLoading}>
                  {isLoading ? "Saving…" : "Add product"}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => router.push(`/dashboard/${params.slug}/products`)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </form>
      </motion.div>

      {/* Validation error modal */}
      <AnimatePresence>
        {validationErrors.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
            onClick={() => setValidationErrors([])}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <AlertCircle size={18} className="text-[#DE1010]" />
                </div>
                <div>
                  <p className="font-semibold text-[#0a0a0a] text-sm">Fix the following errors</p>
                  <p className="text-xs text-gray-400">Please correct all fields before saving.</p>
                </div>
              </div>
              <ul className="space-y-1.5 mb-5">
                {validationErrors.map((msg, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#DE1010] mt-1.5 flex-shrink-0" />
                    {msg}
                  </li>
                ))}
              </ul>
              <button onClick={() => setValidationErrors([])}
                className="w-full py-2.5 bg-[#0a0a0a] text-white rounded-xl text-sm font-medium hover:bg-black/80 transition-colors">
                Got it, fix errors
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
