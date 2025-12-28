import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
    compatibilityDate: '2025-07-15',
    devtools: {enabled: true},
    modules: [
        '@nuxt/image',
        'shadcn-nuxt',
        ['@nuxtjs/google-fonts', {
            families: {
                Lato: {
                    wght: [300, 400, 700],
                    ital: [300]
                },
            }
        }],
        '@nuxt/icon',
        '@pinia/nuxt',
        '@vee-validate/nuxt',
    ],
    ssr: false,
    css: ['./app/assets/css/main.css'],
    vite: {
        plugins: [
            tailwindcss(),
        ],
    },
    shadcn: {
        prefix: 'ui',
        componentDir: '@/components/ui'
    },

    veeValidate: {
        // disable or enable auto imports
        autoImports: true,
        // Use different names for components
        componentNames: {
            Form: 'VeeForm',
            Field: 'VeeField',
            FieldArray: 'VeeFieldArray',
            ErrorMessage: 'VeeErrorMessage',
        },
    },

    runtimeConfig: {
        public: {
            apiBase: process.env.NUXT_PUBLIC_API_BASE || 'https://api.example.com/v1',
        },
    },
});