"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Loader2,
  CheckCircle2,
  ShoppingCart,
  Phone,
  User,
  MapPin,
  Home,
  Building2,
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  Gift,
  Star,
  Eye,
  Truck,
  Clock,
  Award,
} from "lucide-react";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type DeliveryOption = "desk" | "home";

interface FormData {
  fullName: string;
  phone: string;
  wilaya: string;
  baladiya: string;
  notes?: string;
}

interface WatchItem {
  id: string;
  name: string;
  image: string;
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const BOX_PRICE = 2000;

const WATCHES: WatchItem[] = [
  { id: "model-1", name: "موديل 1", image: "/images/watches/1.webp" },
  { id: "model-2", name: "موديل 2", image: "/images/watches/2.webp" },
  { id: "model-3", name: "موديل 3", image: "/images/watches/3.webp" },
  { id: "model-4", name: "موديل 4", image: "/images/watches/4.webp" },
  { id: "model-5", name: "موديل 5", image: "/images/watches/5.webp" },
  { id: "model-6", name: "موديل 6", image: "/images/watches/6.webp" },
  { id: "model-7", name: "موديل 7", image: "/images/watches/7.webp" },
  { id: "model-8", name: "موديل 8", image: "/images/watches/8.webp" },
  { id: "model-9", name: "موديل 9", image: "/images/watches/9.webp" },
  { id: "model-10", name: "موديل 10", image: "/images/watches/10.webp" },
  { id: "model-11", name: "موديل 11", image: "/images/watches/11.webp" },
];

const DELIVERY_COST: Record<DeliveryOption, number> = {
  desk: 500,
  home: 800,
};

const API_URL = "/api/submit-order";

// ─────────────────────────────────────────────
// META PIXEL
// ─────────────────────────────────────────────
function initMetaPixel(): void {
  try {
    if (typeof window !== "undefined") {
      const win = window as unknown as {
        fbq?: (
          action: string,
          eventName: string,
          params?: Record<string, unknown>,
        ) => void;
        _fbq?: unknown;
      };
      if (!win.fbq) {
        const script = document.createElement("script");
        script.innerHTML = `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
        `;
        document.head.appendChild(script);
        setTimeout(() => {
          if (win.fbq) {
            win.fbq("init", "1301109644932375");
            win.fbq("track", "PageView");
          }
        }, 100);
      }
    }
  } catch {
    /* silent */
  }
}

function trackFb(event: string, params?: Record<string, unknown>): void {
  try {
    if (typeof window !== "undefined") {
      const win = window as unknown as {
        fbq?: (
          action: string,
          eventName: string,
          params?: Record<string, unknown>,
        ) => void;
      };
      if (typeof win.fbq === "function") win.fbq("track", event, params);
    }
  } catch {
    /* silent */
  }
}

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────
function formatDZD(v: number): string {
  try {
    return new Intl.NumberFormat("ar-DZ").format(v) + " دج";
  } catch {
    return v.toLocaleString() + " دج";
  }
}

// ─────────────────────────────────────────────
// SMART VALIDATION (Algerian Format)
// ─────────────────────────────────────────────
interface ValidationErrors {
  fullName?: string;
  phone?: string;
  wilaya?: string;
  baladiya?: string;
  watch?: string;
  delivery?: string;
}

function validatePhone(raw: string): string | undefined {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "أدخل رقم الهاتف";
  if (digits.length < 10) return "الرقم قصير — يجب أن يكون 10 أرقام";
  if (digits.length > 10) return "الرقم طويل — يجب أن يكون 10 أرقام";
  if (!/^0[567]/.test(digits)) return "الرقم يجب أن يبدأ بـ 05 أو 06 أو 07";
  return undefined;
}

function validateName(raw: string): string | undefined {
  const name = raw.trim();
  if (!name) return "أدخل اسمك الكامل";
  if (name.length < 4) return "الاسم قصير جداً";
  if (name.split(/\s+/).length < 2) return "أدخل الاسم واللقب";
  return undefined;
}

function validateForm(
  formData: FormData,
  selectedWatchId: string | null,
  deliveryOption: DeliveryOption | null,
): ValidationErrors {
  const errors: ValidationErrors = {};
  const nameErr = validateName(formData.fullName || "");
  if (nameErr) errors.fullName = nameErr;
  const phoneErr = validatePhone(formData.phone || "");
  if (phoneErr) errors.phone = phoneErr;
  if (!formData.wilaya?.trim()) errors.wilaya = "اختر أو اكتب اسم الولاية";
  if (!formData.baladiya?.trim()) errors.baladiya = "اكتب اسم البلدية أو الحي";
  if (!selectedWatchId) errors.watch = "اختر الموديل الذي يعجبك أعلاه";
  if (!deliveryOption) errors.delivery = "اختر طريقة التوصيل المناسبة لك";
  return errors;
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function Page() {
  useEffect(() => {
    initMetaPixel();
  }, []);

  // State
  const [selectedWatchId, setSelectedWatchId] = useState<string | null>(null);
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption | null>(
    null,
  );
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    phone: "",
    wilaya: "",
    baladiya: "",
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const selectedWatch = useMemo(
    () => WATCHES.find((w) => w.id === selectedWatchId) || null,
    [selectedWatchId],
  );

  const total = useMemo(() => {
    let price = BOX_PRICE;
    if (deliveryOption) price += DELIVERY_COST[deliveryOption];
    return price;
  }, [deliveryOption]);

  // Handlers
  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = "hidden";
    trackFb("ViewContent", {
      content_type: "product",
      content_ids: [WATCHES[index].id],
      content_name: WATCHES[index].name,
      value: BOX_PRICE,
      currency: "DZD",
    });
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    document.body.style.overflow = "";
  }, []);

  const nextImage = () => setLightboxIndex((p) => (p + 1) % WATCHES.length);
  const prevImage = () =>
    setLightboxIndex((p) => (p - 1 + WATCHES.length) % WATCHES.length);

  const handleWatchSelect = (watchId: string) => {
    setSelectedWatchId(watchId);
    setErrors((prev) => ({ ...prev, watch: undefined }));
    trackFb("AddToCart", {
      content_type: "product",
      content_ids: [watchId],
      value: BOX_PRICE,
      currency: "DZD",
    });
  };

  const handleDeliverySelect = (option: DeliveryOption) => {
    setDeliveryOption(option);
    setErrors((prev) => ({ ...prev, delivery: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateForm(
      formData,
      selectedWatchId,
      deliveryOption,
    );
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      const el = document.querySelector("[data-error='true']");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const orderData = {
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        wilaya: formData.wilaya.trim(),
        baladiya: formData.baladiya.trim(),
        selectedWatchId: selectedWatchId!,
        selectedWatchName: selectedWatch?.name || selectedWatchId!,
        boxPrice: BOX_PRICE,
        deliveryOption: deliveryOption!,
        deliveryCost: DELIVERY_COST[deliveryOption!],
        total,
        notes: formData.notes?.trim(),
        clientRequestId:
          crypto.randomUUID?.() ||
          `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      };

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (result.success) {
        trackFb("Purchase", {
          content_type: "product",
          content_ids: [selectedWatchId],
          value: total,
          currency: "DZD",
        });
        setShowSuccess(true);
        setTimeout(() => window.location.reload(), 10000);
      } else {
        setSubmitError(result.error || "حدث خطأ. يرجى المحاولة مرة أخرى.");
      }
    } catch {
      setSubmitError("فشل الاتصال. يرجى التحقق من الإنترنت.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Shared styles ───
  const inputBase =
    "w-full rounded-xl border px-4 py-3.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2 bg-white";
  const inputOk = `${inputBase} border-stone-200 focus:border-amber-600 focus:ring-amber-600/10`;
  const inputErr = `${inputBase} border-red-300 focus:border-red-500 focus:ring-red-500/10 bg-red-50/40`;

  // ═════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-stone-50 text-stone-800 selection:bg-amber-200/60"
    >
      {/* ── HEADER ── */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-stone-200/60 sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center shadow-lg shadow-amber-900/20">
                <Package className="w-5 h-5 text-amber-100" />
              </div>
              <div>
                <h1 className="font-bold text-base text-stone-900 tracking-tight">
                  BS Monters
                </h1>
                <p className="text-[11px] text-amber-700 font-medium tracking-wide">
                  أناقة بلا حدود
                </p>
              </div>
            </div>
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium">
                السعر الكامل
              </p>
              <p className="text-xl font-bold text-stone-900">
                {formatDZD(BOX_PRICE)}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-50/80 via-white to-stone-50" />
        <div className="relative mx-auto max-w-6xl px-4 py-14 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Product Image */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="relative aspect-square rounded-[2rem] overflow-hidden shadow-2xl shadow-stone-900/10 ring-1 ring-stone-200/50"
            >
              <Image
                src="/images/box/box.webp"
                alt="طقم الساعة الفاخر"
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/50 via-transparent to-transparent" />
              <div className="absolute top-5 right-5">
                <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-full shadow-lg">
                  عرض محدود
                </span>
              </div>
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-xs font-medium text-stone-700 shadow-sm">
                    <Gift className="w-3.5 h-3.5 text-amber-700" />
                    علبة هدية فاخرة
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-xs font-medium text-stone-700 shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    ضمان سنة كاملة
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="space-y-7"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 mb-3">
                  الأكثر مبيعاً في الجزائر
                </p>
                <h1 className="text-4xl md:text-5xl font-bold text-stone-900 leading-[1.15] tracking-tight">
                  طقم ساعة أنيق
                  <span className="block text-transparent bg-clip-text bg-gradient-to-l from-amber-600 to-amber-800 text-3xl md:text-4xl mt-2">
                    مع علبة هدية فاخرة
                  </span>
                </h1>
              </div>

              <p className="text-base md:text-lg text-stone-600 leading-relaxed max-w-lg">
                طقم كامل يشمل ساعة أنيقة مع علبة هدية فاخرة وإكسسوارات متنوعة.
                اختر من 11 موديل حصري واستلم طلبك حتى باب بيتك.
              </p>

              {/* Price Card */}
              <div className="bg-white rounded-2xl p-6 shadow-lg shadow-stone-900/5 ring-1 ring-stone-200/60">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-stone-500 uppercase tracking-wide font-medium">
                      السعر شامل كل شيء
                    </p>
                    <p className="text-4xl font-bold text-stone-900 mt-1">
                      {formatDZD(BOX_PRICE)}
                    </p>
                    <p className="text-sm text-emerald-600 font-medium mt-1.5 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      الساعة + العلبة + الإكسسوارات
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center shadow-lg shadow-amber-800/20">
                      <Star className="w-7 h-7 text-amber-100" />
                    </div>
                    <p className="text-[10px] text-stone-400 mt-1.5 font-medium">
                      11 موديل
                    </p>
                  </div>
                </div>
              </div>

              {/* Trust Signals */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Award, text: "11 موديل حصري" },
                  { icon: Gift, text: "علبة هدية فاخرة" },
                  { icon: ShieldCheck, text: "ضمان سنة كاملة" },
                  { icon: Truck, text: "الدفع عند الاستلام" },
                ].map(({ icon: Icon, text }) => (
                  <div
                    key={text}
                    className="flex items-center gap-2.5 text-sm text-stone-600"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-amber-700" />
                    </div>
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              <a
                href="#order"
                className="group inline-flex items-center justify-center gap-2.5 w-full md:w-auto px-10 py-4 bg-gradient-to-l from-stone-900 to-stone-800 text-white font-bold rounded-xl transition-all shadow-xl shadow-stone-900/15 hover:shadow-stone-900/25 hover:from-stone-800 hover:to-stone-700 active:scale-[0.98]"
                onClick={() => trackFb("InitiateCheckout")}
              >
                <ShoppingCart className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
                اطلب الآن — {formatDZD(BOX_PRICE)}
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── MODELS GALLERY ── */}
      <section id="models" className="py-16 md:py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 mb-3">
              تشكيلة حصرية
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">
              أي موديل يناسب ذوقك؟
            </h2>
            <p className="text-stone-500 mt-3 max-w-xl mx-auto">
              جميع الموديلات بنفس السعر — اضغط على أي صورة لمشاهدتها بالتفصيل
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
            {WATCHES.map((watch, index) => (
              <motion.div
                key={watch.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ delay: index * 0.04, duration: 0.4 }}
                className="group relative bg-stone-50 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl ring-1 ring-stone-200/60 hover:ring-amber-300/60 transition-all duration-300 cursor-pointer"
                onClick={() => openLightbox(index)}
              >
                <div className="aspect-[4/5] relative">
                  <Image
                    src={watch.image}
                    alt={watch.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    loading={index < 5 ? "eager" : "lazy"}
                  />
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center justify-center w-7 h-7 bg-stone-900/80 backdrop-blur text-white rounded-full text-xs font-bold">
                      {index + 1}
                    </span>
                  </div>
                  {/* Hover */}
                  <div className="absolute inset-0 bg-stone-900/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <span className="text-white font-medium flex items-center gap-2 text-sm">
                      <Eye className="w-4 h-4" />
                      عرض بالتفصيل
                    </span>
                  </div>
                </div>
                <div className="p-3 text-center">
                  <p className="font-semibold text-stone-800 text-sm">
                    {watch.name}
                  </p>
                  <p className="text-amber-700 text-xs mt-0.5 font-medium">
                    {formatDZD(BOX_PRICE)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ORDER FORM ── */}
      <section id="order" className="py-16 md:py-20 bg-stone-50">
        <div className="mx-auto max-w-2xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-[2rem] shadow-xl shadow-stone-900/5 ring-1 ring-stone-200/60 p-7 md:p-10"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">
                أكمل طلبك في ثوانٍ
              </h2>
              <p className="text-stone-500 mt-2 text-sm">
                اختر الموديل واملأ بياناتك — سنتصل بك لتأكيد الطلب وترتيب
                التوصيل
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* ── Model Selection ── */}
              <div
                className={`rounded-2xl p-5 transition-all ${
                  errors.watch
                    ? "bg-red-50/60 ring-2 ring-red-300"
                    : selectedWatch
                      ? "bg-emerald-50/50 ring-2 ring-emerald-300"
                      : "bg-stone-50 ring-1 ring-stone-200"
                }`}
                data-error={errors.watch ? "true" : undefined}
              >
                <label className="block text-sm font-bold text-stone-800 mb-2.5">
                  اختر موديل الساعة
                </label>

                <select
                  value={selectedWatchId || ""}
                  onChange={(e) => handleWatchSelect(e.target.value)}
                  className={`w-full rounded-xl border-2 px-4 py-3 text-sm focus:outline-none focus:ring-2 appearance-none bg-white cursor-pointer ${
                    errors.watch
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500/10"
                      : "border-stone-200 focus:border-amber-600 focus:ring-amber-600/10"
                  }`}
                >
                  <option value="">— اختر الموديل الذي أعجبك —</option>
                  {WATCHES.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>

                {errors.watch && (
                  <p className="text-red-600 text-sm mt-2 font-medium">
                    {errors.watch}
                  </p>
                )}

                {/* Preview */}
                <AnimatePresence>
                  {selectedWatch && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-stone-200/60"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-emerald-200 shadow-sm">
                          <Image
                            src={selectedWatch.image}
                            alt={selectedWatch.name}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-stone-900">
                            {selectedWatch.name}
                          </p>
                          <p className="text-emerald-600 text-sm font-medium mt-0.5">
                            تم اختيار هذا الموديل
                          </p>
                          <p className="text-stone-900 font-bold mt-0.5">
                            {formatDZD(BOX_PRICE)}
                          </p>
                        </div>
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Personal Info ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div data-error={errors.fullName ? "true" : undefined}>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    الاسم الكامل
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => {
                        setFormData((f) => ({
                          ...f,
                          fullName: e.target.value,
                        }));
                        setErrors((p) => ({ ...p, fullName: undefined }));
                      }}
                      placeholder="مثال: أحمد بوعلام"
                      className={errors.fullName ? inputErr : inputOk}
                    />
                    <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  </div>
                  {errors.fullName && (
                    <p className="text-red-600 text-xs mt-1.5 font-medium">
                      {errors.fullName}
                    </p>
                  )}
                </div>

                <div data-error={errors.phone ? "true" : undefined}>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    رقم الهاتف
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData((f) => ({ ...f, phone: e.target.value }));
                        setErrors((p) => ({ ...p, phone: undefined }));
                      }}
                      placeholder="0555123456"
                      className={errors.phone ? inputErr : inputOk}
                    />
                    <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  </div>
                  {errors.phone && (
                    <p className="text-red-600 text-xs mt-1.5 font-medium">
                      {errors.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* ── Location ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div data-error={errors.wilaya ? "true" : undefined}>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    الولاية
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.wilaya}
                      onChange={(e) => {
                        setFormData((f) => ({ ...f, wilaya: e.target.value }));
                        setErrors((p) => ({ ...p, wilaya: undefined }));
                      }}
                      placeholder="مثال: الجزائر العاصمة"
                      className={errors.wilaya ? inputErr : inputOk}
                    />
                    <MapPin className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  </div>
                  {errors.wilaya && (
                    <p className="text-red-600 text-xs mt-1.5 font-medium">
                      {errors.wilaya}
                    </p>
                  )}
                </div>

                <div data-error={errors.baladiya ? "true" : undefined}>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    البلدية
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.baladiya}
                      onChange={(e) => {
                        setFormData((f) => ({
                          ...f,
                          baladiya: e.target.value,
                        }));
                        setErrors((p) => ({ ...p, baladiya: undefined }));
                      }}
                      placeholder="مثال: باب الزوار"
                      className={errors.baladiya ? inputErr : inputOk}
                    />
                    <Building2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  </div>
                  {errors.baladiya && (
                    <p className="text-red-600 text-xs mt-1.5 font-medium">
                      {errors.baladiya}
                    </p>
                  )}
                </div>
              </div>

              {/* ── Delivery ── */}
              <div data-error={errors.delivery ? "true" : undefined}>
                <label className="block text-sm font-semibold text-stone-700 mb-2.5">
                  طريقة التوصيل
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    {
                      key: "desk" as DeliveryOption,
                      icon: Building2,
                      label: "توصيل للمكتب",
                      desc: "استلام من مكتب التوصيل",
                      cost: DELIVERY_COST.desk,
                    },
                    {
                      key: "home" as DeliveryOption,
                      icon: Home,
                      label: "توصيل للمنزل",
                      desc: "توصيل حتى باب بيتك",
                      cost: DELIVERY_COST.home,
                    },
                  ].map(({ key, icon: Icon, label, desc, cost }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleDeliverySelect(key)}
                      className={`relative flex items-center gap-3.5 p-4 rounded-xl border-2 transition-all text-right ${
                        deliveryOption === key
                          ? "border-amber-600 bg-amber-50/60 shadow-sm"
                          : "border-stone-200 hover:border-stone-300 bg-white"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          deliveryOption === key
                            ? "border-amber-600"
                            : "border-stone-300"
                        }`}
                      >
                        {deliveryOption === key && (
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-amber-700" />
                          <span className="font-bold text-stone-800 text-sm">
                            {label}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">{desc}</p>
                        <p className="text-sm font-bold text-stone-900 mt-1.5">
                          {formatDZD(cost)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
                {errors.delivery && (
                  <p className="text-red-600 text-sm mt-2 font-medium">
                    {errors.delivery}
                  </p>
                )}
              </div>

              {/* ── Notes ── */}
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                  ملاحظات (اختياري)
                </label>
                <textarea
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={3}
                  placeholder="عنوان تفصيلي أو رقم هاتف إضافي..."
                  className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-600/10 focus:border-amber-600 resize-none bg-white"
                />
              </div>

              {/* ── Price Summary + Submit ── */}
              <div className="pt-5 border-t border-stone-200/60">
                <div className="bg-stone-50 rounded-xl p-4 mb-5 ring-1 ring-stone-200/60">
                  <div className="flex items-center justify-between py-1.5">
                    <div>
                      <p className="text-stone-700 text-sm">
                        ساعة + علبة + إكسسوارات
                      </p>
                      <p className="text-xs text-stone-400">
                        {selectedWatch ? selectedWatch.name : "لم يتم الاختيار"}
                      </p>
                    </div>
                    <p className="font-semibold text-stone-800 text-sm">
                      {formatDZD(BOX_PRICE)}
                    </p>
                  </div>

                  {deliveryOption && (
                    <div className="flex items-center justify-between py-1.5 border-t border-stone-200/60 mt-1.5 pt-2">
                      <p className="text-stone-700 text-sm">
                        {deliveryOption === "desk"
                          ? "توصيل للمكتب"
                          : "توصيل للمنزل"}
                      </p>
                      <p className="font-semibold text-stone-800 text-sm">
                        + {formatDZD(DELIVERY_COST[deliveryOption])}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 mt-2 border-t-2 border-amber-300/60">
                    <p className="font-bold text-stone-900">المجموع الكلي</p>
                    <p className="text-2xl font-bold text-stone-900">
                      {formatDZD(total)}
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group w-full bg-gradient-to-l from-stone-900 to-stone-800 hover:from-stone-800 hover:to-stone-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-stone-900/10 active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      جاري إرسال الطلب...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
                      أرسل الطلب الآن — {formatDZD(total)}
                    </>
                  )}
                </button>

                {/* Trust line */}
                <div className="flex items-center justify-center gap-4 mt-4 text-xs text-stone-400">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> معاملة آمنة
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> توصيل 24-48 ساعة
                  </span>
                </div>

                {submitError && (
                  <div className="mt-4 bg-red-50 ring-1 ring-red-200 rounded-xl p-4 text-red-700 text-sm text-center">
                    {submitError}
                  </div>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      </section>

      {/* ── LIGHTBOX ── */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/95 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={closeLightbox}
          >
            <button
              onClick={closeLightbox}
              className="absolute top-5 left-5 z-10 w-11 h-11 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute right-3 md:right-8 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute left-3 md:left-8 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <motion.div
              key={lightboxIndex}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-3xl mx-4 aspect-[3/4] max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={WATCHES[lightboxIndex].image}
                alt={WATCHES[lightboxIndex].name}
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 768px"
                priority
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-stone-900/80 to-transparent p-8">
                <p className="text-white/50 text-sm mb-1">
                  {lightboxIndex + 1} من {WATCHES.length}
                </p>
                <p className="text-white text-2xl font-bold">
                  {WATCHES[lightboxIndex].name}
                </p>
                <p className="text-amber-400 text-lg font-bold mt-1">
                  {formatDZD(BOX_PRICE)}
                </p>
              </div>
            </motion.div>

            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
              {WATCHES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === lightboxIndex
                      ? "bg-amber-400 w-6"
                      : "bg-white/30 w-1.5"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SUCCESS MODAL ── */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white rounded-3xl p-8 md:p-12 max-w-md w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>

              <h3 className="text-2xl font-bold text-stone-900 mb-3">
                تم استلام طلبك بنجاح
              </h3>
              <p className="text-stone-600 mb-6 text-base">
                سنتصل بك قريباً لتأكيد الطلب وترتيب التوصيل
              </p>

              <div className="bg-stone-50 rounded-xl p-4 mb-6 ring-1 ring-stone-200/60">
                <div className="text-xs text-stone-400 mb-1 uppercase tracking-wide">
                  رقم الطلب
                </div>
                <div className="text-xl font-bold text-stone-900">
                  #{Date.now().toString().slice(-6)}
                </div>
                <div className="text-sm text-stone-500 mt-2">
                  الإجمالي: {formatDZD(total)}
                </div>
              </div>

              <button
                onClick={() => window.location.reload()}
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3.5 px-6 rounded-xl transition-colors"
              >
                حسناً
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t border-stone-200/60 text-stone-400 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <p className="text-xs">
            {new Date().getFullYear()} BS Monters — جميع الحقوق محفوظة
          </p>
        </div>
      </footer>
    </div>
  );
}
