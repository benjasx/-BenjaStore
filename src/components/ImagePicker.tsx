import { DEFAULT_PRODUCT_IMAGE } from "@/data/mock";
import { readImage } from "@/lib/image";

interface Props {
  value: string | undefined;
  onChange: (image: string | undefined) => void;
}

export const ImagePicker = ({ value, onChange }: Props) => (
  <div className="flex items-center gap-3">
    <img
      src={value ?? DEFAULT_PRODUCT_IMAGE}
      alt="Imagen del producto"
      className="size-20 shrink-0 rounded-xl object-cover"
    />
    <div className="flex flex-wrap gap-2">
      <label className="bg-surface-3 grid h-11 cursor-pointer place-items-center rounded-xl px-4 text-base font-bold">
        Cargar imagen
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={async (e) => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = "";
            if (file) onChange(await readImage(file).catch(() => undefined));
          }}
        />
      </label>
      {value && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="text-muted h-11 rounded-xl px-3 text-base font-semibold"
        >
          Quitar
        </button>
      )}
    </div>
  </div>
);
