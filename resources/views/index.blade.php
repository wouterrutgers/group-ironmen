<!doctype html>
<html lang="en">
  <head>
    <title>Group Ironmen</title>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
    <link rel="manifest" href="/site.webmanifest" />
    <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5" />
    <meta name="msapplication-TileColor" content="#da532c" />
    <meta name="theme-color" content="#ffffff" />
    <link rel="preload" href="/fonts/RuneScape-Chat-07.ttf" as="font" type="font/ttf" crossorigin />

    <script>
      window.getTheme = () => {
        let theme = localStorage.getItem("theme");

        if (!theme && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
          theme = "dark";
        }

        return theme;
      };

      window.updateTheme = () => {
        const theme = window.getTheme();
        const darkMode = theme === "dark";
        if (darkMode) {
          document.documentElement.classList.add("dark-mode");
        } else {
          document.documentElement.classList.remove("dark-mode");
        }
      };

      window.updateTheme(true);
    </script>
    @viteReactRefresh
    @vite(['resources/views/index.tsx'])
  </head>
  <body id="root">
  </body>
</html>
