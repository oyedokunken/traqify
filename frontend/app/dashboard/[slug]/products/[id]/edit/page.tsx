"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ImagePlus, AlertCircle, Wand2, ArrowLeft, GripVertical, X, Plus, Upload, Link as LinkIcon, Tag, CheckCircle2, Lock } from "lucide-react";
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

export default function EditProductPage({ params }: { params: { slug: string; id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [categoryName, setCategoryName] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageError, setImageError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [downloadMode, setDownloadMode] = useState<"url" | "upload">("url");
  const [downloadFile, setDownloadFile] = useState<File | null>(null);
  const [attributes, setAttributes] = useState<{ name: string; values: string; id: number }[]>([]);
  const [resultModal, setResultModal] = useState<{ open: boolean; type: "success" | "error"; title: string; body: string }>({ open: false, type: "error", title: "", body: "" });
  const [saveConfirm, setSaveConfirm] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);
  const closeModal = () => setResultModal((m) => ({ ...m, open: false }));
  const showError = (title: string, body: string) => setResultModal({ open: true, type: "error", title, body });
  const showSuccess = (title: string, body: string) => setResultModal({ open: true, type: "success", title, body });
  const fileRef = useRef<HTMLInputElement>(null);
  const downloadFileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "", sku: "", description: "", price: "", comparePrice: "",
      status: "draft", productType: "SIMPLE",
      downloadUrl: "", isActive: true, initialStock: 0, lowStockAlert: 10,
    },
  });

  const nameValue = watch("name");
  const productType = watch("productType");
  const priceValue = watch("price");

  useEffect(() => {
    api.get(`/api/products/${params.id}`)
      .then((r) => {
        const p = r.data;
        reset({
          name: p.name || "",
          sku: p.sku || "",
          description: p.description || "",
          price: String(p.price || ""),
          comparePrice: p.comparePrice ? String(p.comparePrice) : "",
          status: p.status || "draft",
          productType: p.productType || "SIMPLE",
          downloadUrl: p.downloadUrl || "",
          isActive: p.isActive ?? true,
          initialStock: p.inventory?.quantity ?? 0,
          lowStockAlert: p.inventory?.lowStockAlert ?? 10,
        });
        setCategoryName(p.productCategory?.name || p.category || "");
        const imgs = p.imageUrls?.length ? p.imageUrls : p.imageUrl ? [p.imageUrl] : [];
        setImagePreviews(imgs);
        if (p.variants?.length) {
          const grouped: Record<string, string[]> = {};
          for (const v of p.variants) {
            if (!grouped[v.name]) grouped[v.name] = [];
            grouped[v.name].push(v.value);
          }
          setAttributes(Object.entries(grouped).map(([name, vals], i) => ({ name, values: vals.join(", "), id: i })));
        }
      })
      .catch(() => showError("Failed to load product", "Could not fetch product details."))
      .finally(() => setFetching(false));
  }, [params.id]);

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
    showError("Please fix the following", msgs.join("\n"));
  };

  const doSave = async (data: any) => {
    setIsLoading(true);
    setSaveConfirm(false);
    try {
      const price = parseFloat(data.price);
      const comparePrice = data.comparePrice ? parseFloat(data.comparePrice) : undefined;
      if (comparePrice !== undefined && comparePrice >= price) {
        showError("Invalid sale price", "Sale price must be less than the main price.");
        setIsLoading(false); return;
      }

      const uploadedUrls: string[] = [];
      if (imageFiles.length > 0) {
        setUploadProgress(true);
        for (const file of imageFiles) {
          if (file.size > 2 * 1024 * 1024) { setImageError(`"${file.name}" exceeds 2 MB.`); continue; }
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
        if (downloadFile.size > 4 * 1024 * 1024) {
          showError("File too large", "Downloadable files must be under 4 MB.");
          setIsLoading(false); return;
        }
        const fd = new FormData(); fd.append("file", downloadFile);
        try {
          const r = await api.post("/api/products/upload-file", fd, { headers: { "Content-Type": "multipart/form-data" } });
          downloadUrl = r.data.url;
        } catch (err: any) {
          showError("Upload failed", err.response?.data?.error || "Failed to upload the downloadable file.");
          setIsLoading(false); return;
        }
      }

      const variants = data.productType === "VARIABLE"
        ? attributes.flatMap((attr) =>
            attr.values.split(",").map((v) => ({ name: attr.name.trim(), value: v.trim() })).filter((v) => v.name && v.value)
          )
        : undefined;

      await api.patch(`/api/products/${params.id}`, {
        name: data.name,
        sku: data.sku,
        description: data.description,
        price,
        comparePrice,
        status: data.status,
        productType: data.productType,
        isActive: data.isActive,
        initialStock: parseInt(data.initialStock),
        lowStockAlert: parseInt(data.lowStockAlert),
        imageUrl: allUrls[0] || undefined,
        imageUrls: allUrls,
        downloadUrl: data.productType === "DOWNLOADABLE" ? downloadUrl : undefined,
        variants,
      });
      showSuccess("Product updated", "Your changes have been saved successfully.");
      setImageFiles([]);
    } catch (err: any) { showError("Failed to update product", err.response?.data?.error || "Something went wrong. Please try again."); }
    finally { setIsLoading(false); }
  };

  const onSubmit = async (data: any) => {
    const price = parseFloat(data.price);
    const comparePrice = data.comparePrice ? parseFloat(data.comparePrice) : undefined;
    if (comparePrice !== undefined && comparePrice >= price) {
      showError("Invalid sale price", "Sale price must be less than the main price.");
      return;
    }
    setPendingSubmitData(data);
    setSaveConfirm(true);
  };

  if (fetching) {
    return (
      <div>
        <Topbar title="Products" slug={params.slug} />
        <div className="flex justify-center py-32">
          <div className="w-7 h-7 border-2 border-[#DE1010] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Products" slug={params.slug} />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-4 sm:p-6 max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push(`/dashboard/${params.slug}/products`)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0a0a0a] transition-colors">
            <ArrowLeft size={15} /> Back to products
          </button>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm font-semibold text-[#0a0a0a]">Edit product</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit, onFormError)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left/main column */}
            <div className="lg:col-span-2 space-y-6">

              {/* Basic info */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 space-y-4">
                <h2 className="font-semibold text-[#0a0a0a] text-sm">Product information</h2>

                <div>
                  <Label>Product name <span className="text-[#DE1010]">*</span></Label>
                  <Input className="mt-1.5" placeholder="e.g. Nike Air Max" {...register("name")} />
                  {errors.name && <p className="text-xs text-[#DE1010] mt-1">{errors.name.message as string}</p>}
                </div>

                <div>
                  <Label>Description <span className="text-[#DE1010]">*</span></Label>
                  <textarea className="mt-1.5 flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    placeholder="Describe the product in detail..."
                    {...register("description")} />
                  {errors.description && <p className="text-xs text-[#DE1010] mt-1">{errors.description.message as string}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <div className="mt-1.5 flex h-10 w-full items-center rounded-md border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 gap-2">
                      <Lock size={12} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">{categoryName || "No category"}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Category cannot be changed after creation.</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label>SKU <span className="text-[#DE1010]">*</span></Label>
                      <button type="button" onClick={() => setValue("sku", generateSKU(nameValue))}
                        className="text-[10px] text-[#DE1010] flex items-center gap-1 hover:underline">
                        <Wand2 size={11} /> Auto-generate
                      </button>
                    </div>
                    <Input placeholder="e.g. NAM-001" {...register("sku")} />
                    {errors.sku && <p className="text-xs text-[#DE1010] mt-1">{errors.sku.message as string}</p>}
                  </div>
                </div>
              </div>

              {/* Images */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
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
              <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 space-y-4">
                <h2 className="font-semibold text-[#0a0a0a] text-sm">Pricing</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Price (NGN) <span className="text-[#DE1010]">*</span></Label>
                    <Input className="mt-1.5" type="number" step="0.01" placeholder="0.00" {...register("price")} />
                    {errors.price && <p className="text-xs text-[#DE1010] mt-1">{errors.price.message as string}</p>}
                  </div>
                  <div>
                    <Label>Sale price (optional)</Label>
                    <Input className="mt-1.5" type="number" step="0.01" placeholder="0.00" {...register("comparePrice")} />
                    {priceValue && watch("comparePrice") && parseFloat(watch("comparePrice") || "0") >= parseFloat(priceValue) && (
                      <p className="text-xs text-[#DE1010] mt-1">Sale price must be less than the main price.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Inventory */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 space-y-4">
                <h2 className="font-semibold text-[#0a0a0a] text-sm">Inventory</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Stock quantity</Label>
                    <Input className="mt-1.5" type="number" min="0" placeholder="0" {...register("initialStock", { valueAsNumber: true })} />
                  </div>
                  <div>
                    <Label>Low stock alert at</Label>
                    <Input className="mt-1.5" type="number" min="0" placeholder="10" {...register("lowStockAlert", { valueAsNumber: true })} />
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
                        <p className="text-xs text-gray-400">Max file size is 4MB.</p>
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
                          <Input placeholder="Attribute (e.g. Size)" className="h-8 text-xs"
                            value={attr.name}
                            onChange={(e) => setAttributes((a) => a.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                          <button type="button" onClick={() => setAttributes((a) => a.filter((_, j) => j !== i))}
                            className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0">
                            <X size={12} className="text-gray-500" />
                          </button>
                        </div>
                        <Input placeholder="Values, comma-separated (e.g. S, M, L, XL)" className="h-8 text-xs"
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
                  {isLoading ? "Saving…" : "Save changes"}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => router.push(`/dashboard/${params.slug}/products`)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </form>
      </motion.div>

      {/* Save confirmation modal */}
      <AnimatePresence>
        {saveConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
            onClick={() => setSaveConfirm(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              onClick={(e) => e.stopPropagation()}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${pendingSubmitData?.status === "published" ? "bg-green-100" : "bg-blue-50"}`}>
                <CheckCircle2 size={20} className={pendingSubmitData?.status === "published" ? "text-green-600" : "text-blue-600"} />
              </div>
              <h3 className="font-bold text-[#0a0a0a] text-base mb-1">
                {pendingSubmitData?.status === "published" ? "Publish product?" : "Save changes?"}
              </h3>
              <p className="text-sm text-gray-500 mb-5">
                {pendingSubmitData?.status === "published"
                  ? "This product will be visible in your store and available for purchase. Make sure all details are correct."
                  : "Your changes will be saved immediately. This does not change the product's publish status."}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setSaveConfirm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={() => doSave(pendingSubmitData)}
                  className="flex-1 px-4 py-2.5 bg-[#0a0a0a] text-white rounded-xl text-sm font-medium hover:bg-black/80 transition-colors">
                  {pendingSubmitData?.status === "published" ? "Yes, publish" : "Yes, save"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result modal (success / error) */}
      <AnimatePresence>
        {resultModal.open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
            onClick={closeModal}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${resultModal.type === "success" ? "bg-green-100" : "bg-red-50"}`}>
                  {resultModal.type === "success"
                    ? <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    : <AlertCircle size={20} className="text-[#DE1010]" />}
                </div>
                <button onClick={closeModal} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"><X size={16} /></button>
              </div>
              <h3 className="font-bold text-[#0a0a0a] text-base mb-1">{resultModal.title}</h3>
              <p className="text-sm text-gray-500 whitespace-pre-line mb-5">{resultModal.body}</p>
              <button onClick={closeModal}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${resultModal.type === "success" ? "bg-[#0a0a0a] text-white hover:bg-black/80" : "bg-[#DE1010] text-white hover:bg-red-700"}`}>
                {resultModal.type === "success" ? "Done" : "Got it, fix errors"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
