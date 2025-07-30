import { useContext, useEffect, useState, type ReactElement, type ReactNode } from "react";
import { Context as APIContext } from "./api-context";
import type { GameData } from "../api/api";
import { GameDataContext } from "./game-data-context";

export const GameDataProvider = ({ children }: { children: ReactNode }): ReactElement => {
  const [gameData, setGameData] = useState<GameData>({});
  const { setUpdateCallbacks } = useContext(APIContext);

  useEffect(() => {
    if (!setUpdateCallbacks) return;

    setUpdateCallbacks({
      onGameDataUpdate: (gameData) => setGameData(structuredClone(gameData)),
    });
  }, [setUpdateCallbacks]);

  return <GameDataContext value={gameData}>{children}</GameDataContext>;
};
