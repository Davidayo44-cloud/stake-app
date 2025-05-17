import { NavLink, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  X,
  Shield,
  DollarSign,
  Settings,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

export function AdminSidebar({
  isOpen,
  setIsOpen,
  isCollapsed,
  setIsCollapsed,
}) {
  const links = [
    { href: "/admin", label: "Overview", icon: Shield, exact: true },
    { href: "/admin/manage-pool", label: "Manage Pool", icon: DollarSign },
    { href: "/admin/controls", label: "Contract Controls", icon: Settings },
  ];

  const handleToggleCollapse = () => {
    console.log(
      `AdminSidebar: Desktop sidebar collapse - isCollapsed=${!isCollapsed}`
    );
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      {/* Mobile Sidebar (Slide-in) */}
      <motion.aside
        initial={{ x: "-100%" }}
        animate={{ x: isOpen ? 0 : "-100%" }}
        transition={{ duration: 0.3 }}
        className="fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-cyan-700/30 p-6 z-40 lg:hidden"
        aria-expanded={isOpen}
      >
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/"
            className="text-xl flex justify-center items-center font-extrabold text-cyan-600"
            aria-label="StakePro Home"
          >
            <img
              src="/images/logo.png"
              alt="StakePro Feature Image"
              width={70}
              height={10}
              className="object-contain"
            />
          </Link>
          <button
            className="p-1 text-cyan-600 hover:text-cyan-400 transition-colors duration-200"
            onClick={() => {
              console.log(
                `AdminSidebar: Mobile sidebar toggle - isOpen=${false}`
              );
              setIsOpen(false);
            }}
            aria-label="Close sidebar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <nav className="space-y-2 flex-1 mt-16">
          {links.map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              end={link.exact}
              className={({ isActive }) =>
                `flex items-center p-3 text-sm font-medium rounded-md transition-all duration-300 ${
                  isActive
                    ? "bg-cyan-700/20 text-cyan-600"
                    : "text-slate-300 hover:bg-cyan-700/10 hover:text-cyan-600"
                }`
              }
              onClick={() => {
                console.log(
                  `AdminSidebar: Mobile nav link clicked - ${link.label}`
                );
                setIsOpen(false);
              }}
            >
              <link.icon className="w-5 h-5 mr-3 flex-shrink-0" />
              {link.label}
            </NavLink>
          ))}
        </nav>
      </motion.aside>

      {/* Desktop Sidebar (Fixed, Collapsible) */}
      <motion.aside
        animate={{ width: isCollapsed ? 80 : 256 }}
        transition={{ duration: 0.3 }}
        className="hidden lg:flex lg:flex-col lg:fixed lg:top-0 lg:left-0 lg:h-screen lg:min-w-[80px] bg-slate-900 border-r border-cyan-700/30 overflow-hidden group"
        aria-expanded={!isCollapsed}
      >
        <div
          className={`flex items-center ${
            isCollapsed ? "justify-center" : "justify-between"
          } p-6 mb-8`}
        >
          <h2
            className={`text-xl font-bold text-cyan-600 font-geist ${
              isCollapsed ? "hidden" : "block"
            }`}
          >
            <Link
              to="/"
              className="text-xl flex justify-center items-center font-extrabold text-cyan-600"
              aria-label="StakePro Home"
            >
              <img
                src="/images/logo.png"
                alt="StakePro Feature Image"
                width={70}
                height={10}
                className="object-contain"
              />
            </Link>
          </h2>
          <button
            className="p-1 text-cyan-600 hover:text-cyan-400 transition-colors duration-200"
            onClick={handleToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
          </button>
        </div>
        <nav className="space-y-2 flex-1 px-4">
          {links.map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              end={link.exact}
              className={({ isActive }) =>
                `flex ${
                  isCollapsed
                    ? "justify-center items-center relative"
                    : "items-center"
                } p-3 text-sm font-medium rounded-md transition-all duration-300 ${
                  isActive
                    ? "bg-cyan-700/20 text-cyan-600"
                    : "text-slate-300 hover:bg-cyan-700/10 hover:text-cyan-600"
                }`
              }
            >
              <link.icon
                className={`w-5 h-5 flex-shrink-0 ${
                  isCollapsed ? "text-cyan-600" : "mr-3 text-slate-300"
                }`}
              />
              <span
                className={`${
                  isCollapsed
                    ? "absolute left-full ml-2 px-2 py-1 bg-slate-800 text-cyan-600 rounded-md text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    : "block"
                }`}
                aria-hidden={isCollapsed}
              >
                {link.label}
              </span>
            </NavLink>
          ))}
        </nav>
      </motion.aside>

      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => {
            console.log(
              `AdminSidebar: Mobile backdrop clicked - isOpen=${false}`
            );
            setIsOpen(false);
          }}
          aria-hidden="true"
        />
      )}
    </>
  );
}
