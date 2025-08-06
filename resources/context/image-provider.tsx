import { createContext, useEffect, useState, useMemo, useCallback, type ReactElement, type ReactNode } from "react";

type ImageManifest = Record<string, string>;

export interface ImageContextValue {
  getImageUrl: (path: string) => string;
  isLoaded: boolean;
}

export const ImageContext = createContext<ImageContextValue | null>(null);

export const ImageProvider = ({ children }: { children: ReactNode }): ReactElement => {
  const [imageManifest, setImageManifest] = useState<ImageManifest | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadImageManifest = async (): Promise<void> => {
      try {
        const response = await fetch("/data/images.json");
        const manifest: ImageManifest = await response.json();
        setImageManifest(manifest);
        setIsLoaded(true);
      } catch {
        setIsLoaded(true);
      }
    };

    loadImageManifest();
  }, []);

  const getImageUrl = useCallback(
    (path: string): string => {
      if (!imageManifest) {
        return "";
      }

      const hash = imageManifest[path];
      if (hash) {
        return `${path}?v=${hash}`;
      }

      return path;
    },
    [imageManifest],
  );

  const contextValue: ImageContextValue = useMemo(
    () => ({
      getImageUrl,
      isLoaded,
    }),
    [getImageUrl, isLoaded],
  );

  return <ImageContext.Provider value={contextValue}>{children}</ImageContext.Provider>;
};
