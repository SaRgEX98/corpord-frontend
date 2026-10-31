import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },
  app: {
    head: {
      htmlAttrs: { lang: "ru" },
      title: "Автобусные перевозки",
      titleTemplate: "%s · Corpord",
      meta: [
        {
          name: "description",
          content: "Рейсы, автобусы и управление перевозками в одном месте.",
        },
      ],
      link: [
        { rel: "icon", type: "image/png", href: "/brand/corpord-mark.png" },
      ],
      script: [
        {
          innerHTML:
            "try{var t=localStorage.getItem('corpord-theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){document.documentElement.classList.toggle('dark',matchMedia('(prefers-color-scheme: dark)').matches)}",
        },
      ],
    },
  },
  modules: ["@nuxt/image", "shadcn-nuxt", "@nuxt/icon", "@pinia/nuxt"],
  ssr: false,
  typescript: {
    tsConfig: { compilerOptions: { allowImportingTsExtensions: true } },
  },
  css: ["~/assets/css/main.css"],
  vite: {
    plugins: [tailwindcss()],
  },
  shadcn: {
    prefix: "ui",
    componentDir: "@/components/ui",
  },

  runtimeConfig: {
    public: {
      apiBase:
        process.env.NUXT_PUBLIC_API_BASE || "http://localhost:8080/api/v1",
    },
  },
});
