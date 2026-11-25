import { productImageUrl, type Product } from "@/lib/menu";

// foto del producto; si no tiene, se muestra su emoji
export function ProductThumb({
  product,
  size = "md",
}: {
  product: Pick<Product, "id" | "name" | "emoji" | "image_at">;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-10 w-10 rounded-lg text-2xl" : "h-16 w-16 rounded-xl text-4xl";
  const url = productImageUrl(product);
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={product.name} loading="lazy" decoding="async" className={`${box} shrink-0 object-cover`} />
    );
  }
  return (
    <span className={`${box} flex shrink-0 items-center justify-center`} aria-hidden>
      {product.emoji}
    </span>
  );
}
