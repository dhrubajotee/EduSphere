// client/src/components/login/LoginLeft.jsx

import React from "react";
import { motion } from "framer-motion";

export default function LoginLeft() {
    return (
        <div
            className="hidden md:flex h-full flex-col justify-center items-center text-white p-8 relative overflow-hidden bg-cover bg-center bg-no-repeat"
            style={{
                backgroundImage: `url('/images/eduSphereGpt.png')`,
            }}
        >
            {/* Optional overlay for readability */}
            {/* <div className="absolute inset-0 bg-gradient-to-br from-indigo-700/60 via-purple-700/60 to-pink-600/60" /> */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-800/70 via-purple-900/70 to-black/70" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="relative z-10 text-center"
            >
                <h1 className="text-5xl text-white font-extrabold mb-4 drop-shadow-lg">
                    EduSphere
                </h1>
                <p className="text-lg text-white/90 font-extrabold max-w-md mx-auto">
                    Your personal academic advisor, reimagined with AI and insight.
                </p>
            </motion.div>
        </div>

    );
}
