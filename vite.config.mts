import { defineConfig, type PluginOption } from "vite";
import fs from "fs";
import path from "path";
import react from "@vitejs/plugin-react";
import { MapMetadataSchema } from "./resources/game/map-data";
import laravel from "laravel-vite-plugin";

const mapJsonPlugin = (): PluginOption => ({
  name: "mapTilesJson",
  buildStart(): void {
    const mapImageFiles = fs
      .readdirSync("public/map")
      .filter((file) => file.endsWith(".webp"))
      .map((file) => path.basename(file, ".webp"));

    const tiles: number[][] = [[], [], [], []];
    for (const mapImageFile of mapImageFiles) {
      const [plane, x, y] = mapImageFile.split("_").map((x) => parseInt(x, 10));
      tiles[plane].push(((x + y) * (x + y + 1)) / 2 + y);
    }

    const map = MapMetadataSchema.safeParse({
      icons: JSON.parse(fs.readFileSync("public/data/map_icons.json", "utf8")) as unknown,
      labels: JSON.parse(fs.readFileSync("public/data/map_labels.json", "utf8")) as unknown,
      tiles: tiles,
    });

    if (!map.success) {
      console.error("Failed to generate 'maps.json'.");
      console.error(map.error);
      return;
    }

    const result = {
      tiles: map.data.tiles,
      icons: map.data.icons,
      labels: map.data.labels,
    };

    fs.writeFileSync("public/data/map.json", JSON.stringify(result, null, 2));
  },
});

const DEFAULT_API_URL = "http://localhost:8000";
const backendURL = process.env.APP_URL ?? DEFAULT_API_URL;
if (!process.env.APP_URL) {
  console.info(
    `API URL used for requests to backend/app (loaded from default, env.APP_URL was '${process.env.APP_URL}'): ${backendURL}`,
  );
} else {
  console.info(`API URL uses for requests to backend/app (loaded from env): ${backendURL}`);
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    mapJsonPlugin(),
    react(),
    laravel({
      input: ["resources/views/index.tsx"],
      refresh: true,
    }),
  ],
  define: {
    __API_URL__: process.env.NODE_ENV === "production" ? JSON.stringify(`${backendURL}/api`) : "'/api'",
  },
});
