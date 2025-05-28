import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <section className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4 sm:px-6">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <h1
          className="text-6xl sm:text-8xl font-bold text-white mb-4"
          style={{ fontFamily: "'Orbitron', sans-serif" }}
        >
          404
        </h1>
        <h2
          className="text-2xl sm:text-3xl font-semibold text-gray-300 mb-6"
          style={{ fontFamily: "'Exo 2', sans-serif" }}
        >
          Page Not Found
        </h2>
        <p
          className="text-gray-400 mb-8 max-w-md mx-auto"
          style={{ fontFamily: "'Exo 2', sans-serif" }}
        >
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/"
          className="inline-block px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg text-white font-semibold shadow-lg hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105"
          style={{ fontFamily: "'Orbitron', sans-serif" }}
        >
          Back to Home
        </Link>
      </motion.div>
    </section>
  );
}
