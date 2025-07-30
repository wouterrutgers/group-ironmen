import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "../components/app/app";
import { APIProvider } from "../context/api-context";
import { GroupStateProvider } from "../context/group-state-provider";
import { GameDataProvider } from "../context/game-data-provider";
import { SettingsProvider } from "../context/settings-context";

const root = document.getElementById("root")!;

createRoot(root).render(
  <StrictMode>
    <APIProvider>
      <GameDataProvider>
        <GroupStateProvider>
          <SettingsProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </SettingsProvider>
        </GroupStateProvider>
      </GameDataProvider>
    </APIProvider>
  </StrictMode>,
);
