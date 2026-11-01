import { useState } from "react";
import type { Product } from "@/data/mock";
import type { Combo } from "@/hooks/useCombos";
import type { ImageMap } from "@/hooks/useImages";
import { migrateImages, type LegacyImage } from "@/lib/imageStore";

interface Props {
  products: Product[];
  combos: Combo[];
  images: ImageMap;
}

export const MigrateImagesBanner = ({ products, combos, images }: Props) => {
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [failed, setFailed] = useState(false);

  const legacy: LegacyImage[] = [
    ...products.flatMap((p) =>
      p.image
        ? [{ id: p.id, collection: "products" as const, image: p.image }]
        : [],
    ),
    ...combos.flatMap((c) =>
      c.image
        ? [{ id: c.id, collection: "combos" as const, image: c.image }]
        : [],
    ),
  ];
  if (legacy.length === 0) return null;

  const migrating = progress !== null;
  const run = async () => {
    setFailed(false);
    setProgress({ done: 0, total: legacy.length });
    try {
      await migrateImages(
        legacy,
        (done, total) => setProgress({ done, total }),
        images,
      );
    } catch (error) {
      console.error(error);
      setFailed(true);
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="bg-surface mx-5 mb-3 flex flex-col gap-2 rounded-[14px] p-3.5">
      <p className="text-[15px] font-semibold">
        {legacy.length} {legacy.length === 1 ? "foto" : "fotos"} en el formato
        anterior.
      </p>
      {failed && (
        <p role="alert" className="text-salmon text-[15px] font-bold">
          No se pudieron migrar todas las imágenes. Inténtalo de nuevo.
        </p>
      )}
      <button
        type="button"
        disabled={migrating}
        onClick={run}
        className="bg-gold text-ink h-11 self-start rounded-xl px-4 text-base font-extrabold disabled:opacity-40"
      >
        {progress
          ? `Migrando ${progress.done} de ${progress.total}…`
          : "Migrar imágenes"}
      </button>
    </div>
  );
};
