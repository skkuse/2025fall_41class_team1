/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'askku-primary': '#1f3a28',
                'askku-secondary': '#2d5a3f',
            },
        },
    },
    plugins: [],
}
