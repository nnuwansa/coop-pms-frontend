// /** @type {import('next').NextConfig} */
// const nextConfig = {
//     trailingSlash: false,
//     output: "standalone",
// };

// export default nextConfig;



/** @type {import('next').NextConfig} */
const nextConfig = {
    trailingSlash: false,
    output: "standalone",
    typescript: {
        ignoreBuildErrors: true,  
    },
    eslint: {
        ignoreDuringBuilds: true, 
    },
};

export default nextConfig;