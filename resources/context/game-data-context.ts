import { createContext } from "react";
import type { GameData } from "../api/api";

export const GameDataContext = createContext<GameData>({});
