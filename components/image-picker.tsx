"use client";

import { useId, useState, type ChangeEvent } from "react";

const MAX_SIDE = 800; // lado mayor en pixeles
const MAX_CHARS = 600_000; // tope del texto de la imagen (el servidor acepta hasta 700 000)

// lee la foto y la reduce a JPEG para que no sature la base de datos
function fileToCompressedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas"));
      ctx.fillStyle = "#ffffff"; // los PNG con fondo transparente quedan en blanco
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let quality = 0.82;
      let data = canvas.toDataURL("image/jpeg", quality);
      while (data.length > MAX_CHARS && quality > 0.4) {
        quality -= 0.1;
        data = canvas.toDataURL("image/jpeg", quality);
      }
      if (data.length > MAX_CHARS) return reject(new Error("grande"));
      resolve(data);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("lectura"));
    };
    img.src = objectUrl;
  });
}

export function ImagePicker({ initialUrl = null }: { initialUrl?: string | null }) {
  const id = useId();
  const [data, setData] = useState(""); // foto nueva elegida (data URL)
  const [removed, setRemoved] = useState(false); // quitar la foto actual
  const [error, setError] = useState("");

  const preview = data || (removed ? null : initialUrl);

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite elegir la misma foto otra vez
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Elige un archivo de imagen.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("La imagen pesa más de 15 MB.");
      return;
    }
    try {
      setData(await fileToCompressedDataUrl(file));
      setRemoved(false);
    } catch {
      setError("No se pudo leer esa imagen. Prueba con otra.");
    }
  }

  function clear() {
    setData("");
    setRemoved(true);
    setError("");
  }

  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="label">
        Foto (opcional)
      </label>
      {/* sin "name": solo viajan los campos ocultos de abajo, ya reducidos */}
      <input id={id} type="file" accept="image/*" onChange={onPick} className="input py-2" />
      <input type="hidden" name="imageData" value={data} />
      <input type="hidden" name="removeImage" value={removed ? "1" : "0"} />
      {preview && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Vista previa de la foto" className="h-20 w-20 rounded-xl object-cover" />
          <button type="button" className="btn-ghost" onClick={clear}>
            Quitar foto
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
