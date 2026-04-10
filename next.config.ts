/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Essencial para o GitHub Pages
  images: {
    unoptimized: true, // Necessário porque o GitHub Pages não suporta a otimização de imagem padrão do Next
  },
};

export default nextConfig;