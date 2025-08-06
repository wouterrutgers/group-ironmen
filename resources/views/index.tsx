import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "../components/app/app";
import { APIProvider } from "../context/api-context";
import { GameDataProvider } from "../context/game-data-context";
import { SettingsProvider } from "../context/settings-context";
import { GroupProvider } from "../context/group-context";

const root = document.getElementById("root")!;

createRoot(root).render(
  <StrictMode>
    <APIProvider>
      <GameDataProvider>
        <GroupProvider>
          <SettingsProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </SettingsProvider>
        </GroupProvider>
      </GameDataProvider>
    </APIProvider>
  </StrictMode>,
);
