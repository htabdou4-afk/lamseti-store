import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { animate } from "motion";
import { Button } from "./components/ui/button.jsx";
import {
  Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription
} from "./components/ui/dialog.jsx";

const stages = [
  ["01", "نستقبل المواصفات", "تختار نوع المنتج وتكتب الاسم والألوان والكمية."],
  ["02", "نراجع التفاصيل", "نتواصل معك لتأكيد التصميم والسعر ومدة الإنجاز."],
  ["03", "نبدأ التنفيذ", "لا تبدأ الطباعة قبل اعتمادك للتفاصيل النهائية."]
];

export default function Enhancements() {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return undefined;
    const cleanups = [];
    const animateCard = card => {
      if (card.dataset.motionReady) return;
      card.dataset.motionReady = "true";
      const controls = animate(card, { opacity: [0, 1], y: [18, 0] }, {
        duration: 0.58, ease: [0.22, 1, 0.36, 1]
      });
      cleanups.push(() => controls.stop());
    };

    const grid = document.getElementById("productGrid");
    grid?.querySelectorAll(".product-card").forEach(animateCard);
    const observer = grid ? new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.matches?.(".product-card")) animateCard(node);
        node.querySelectorAll?.(".product-card").forEach(animateCard);
      }));
    }) : null;
    observer?.observe(grid, { childList: true, subtree: true });

    const onPointerOver = event => {
      const button = event.target.closest?.(".btn, .cart-open, .admin-open");
      if (!button || button.contains(event.relatedTarget)) return;
      animate(button, { scale: 1.025, y: -1 }, { duration: 0.18, ease: "easeOut" });
    };
    const onPointerOut = event => {
      const button = event.target.closest?.(".btn, .cart-open, .admin-open");
      if (!button || button.contains(event.relatedTarget)) return;
      animate(button, { scale: 1, y: 0 }, { duration: 0.22, ease: "easeOut" });
    };
    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("pointerout", onPointerOut);

    return () => {
      observer?.disconnect();
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      cleanups.forEach(cleanup => cleanup());
    };
  }, [reduce]);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.55, delay: 0.12 }}
      className="mt-5 flex flex-wrap items-center gap-3"
    >
      <span className="rounded-full border border-lamseti-sand/40 bg-white/80 px-3 py-1.5 text-xs font-semibold text-lamseti-ink shadow-sm">
        <span className="lamseti-shimmer">تفاصيل تصنع الفرق</span>
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="lamseti-glow">
            كيف نجهّز طلبك؟ <span aria-hidden="true">↗</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <div className="mb-5 pr-1">
            <p className="mb-2 text-xs font-bold tracking-wide text-lamseti-teal">تجربة LAMSETI</p>
            <DialogTitle className="text-xl font-bold">من فكرتك إلى منتج جاهز</DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-7 text-slate-500">
              خطوات واضحة، وموافقتك تسبق الطباعة دائماً.
            </DialogDescription>
          </div>
          <div className="grid gap-3">
            {stages.map(([number, title, description]) => (
              <motion.article
                key={number}
                initial={reduce ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: reduce ? 0 : 0.28, delay: reduce ? 0 : Number(number) * 0.07 }}
                className="flex gap-3 rounded-xl border border-slate-100 bg-[#fbfaf7] p-3"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-lamseti-ink text-xs font-bold text-white">{number}</span>
                <div>
                  <h3 className="text-sm font-bold">{title}</h3>
                  <p className="mt-1 text-xs leading-6 text-slate-500">{description}</p>
                </div>
              </motion.article>
            ))}
          </div>
          <div className="mt-5 flex justify-start">
            <Button onClick={() => setOpen(false)}>واضح، لنبدأ</Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
