// src/app/landing/page.tsx
"use client";
import React from 'react';
import NextImage from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { AuthProvider } from '@/contexts/AuthContext';
import { motion, LazyMotion, domAnimation } from 'framer-motion';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const navItemVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};


function LandingPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && user) {
      router.replace('/'); 
    }
  }, [user, loading, router]);

  if (loading || (!loading && user)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a13] via-[#18182a] to-[#6e6ef6] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a13] via-[#18182a] to-[#6e6ef6] text-white flex flex-col">
        {/* Header */}
        <motion.header 
          className="flex items-center justify-between px-6 md:px-8 py-5"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="flex items-center space-x-3">
            <Link href="/landing" className="flex items-center space-x-3">
              <div className="bg-white rounded-md p-1.5">
                <NextImage src="https://placehold.co/30x30.png" alt="Kollab Logo" width={30} height={30} data-ai-hint="modern logo" />
              </div>
              <span className="text-white text-xl font-bold">Kollab</span>
            </Link>
          </motion.div>
          
          <motion.nav 
            className="hidden md:flex space-x-6 text-sm font-medium"
            variants={containerVariants} // Stagger children
          >
            <motion.div variants={navItemVariants}>
              <Link href="/landing" className="hover:text-[#6e6ef6] cursor-pointer">Home</Link>
            </motion.div>
            {/* <motion.div variants={navItemVariants} className="relative group">
              <span className="hover:text-[#6e6ef6] cursor-pointer flex items-center">
                Products
                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </motion.div>
            <motion.div variants={navItemVariants}>
              <span className="hover:text-[#6e6ef6] cursor-pointer">Resources</span>
            </motion.div>
            <motion.div variants={navItemVariants}>
              <span className="hover:text-[#6e6ef6] cursor-pointer">Pricing</span>
            </motion.div> */}
          </motion.nav>

          <motion.div variants={itemVariants} className="flex items-center space-x-3">
            <Link href="/auth?view=login" passHref>
              <motion.button 
                className="bg-transparent text-white px-4 py-1.5 rounded-full font-semibold text-sm hover:bg-white/10 transition"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Sign in
              </motion.button>
            </Link>
            <Link href="/auth?view=signup" passHref>
              <motion.button 
                className="bg-[#6e6ef6] text-white px-4 py-1.5 rounded-full font-semibold text-sm hover:bg-[#5757d1] transition"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Sign up
              </motion.button>
            </Link>
          </motion.div>
        </motion.header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col lg:flex-row items-center justify-between px-6 lg:px-16 py-10 lg:py-0">
          {/* Left: Hero Section */}
          <motion.section 
            className="w-full lg:w-1/2 flex flex-col justify-center items-start space-y-6 text-center lg:text-left"
            initial="hidden"
            animate="visible"
            variants={containerVariants} // Stagger children
          >
            {/* <motion.div variants={itemVariants} className="flex items-center space-x-3 mb-2 self-center lg:self-start">
              <span className="bg-[#23233a] text-[#b3b3ff] px-3 py-1 rounded-full text-xs font-medium">We're hiring</span>
              <button className="bg-[#18182a] text-white px-3 py-1 rounded-full text-xs font-medium border border-[#23233a] hover:bg-[#23233a] transition">
                Join our remote team →
              </button>
            </motion.div> */}
            <motion.h1 
              variants={itemVariants} 
              className="text-4xl lg:text-6xl font-normal text-white leading-tight tracking-tighter"
            >
              Manage All of Your <br /> Work In One Place <br /> Efficiently
            </motion.h1>
            <motion.p 
              variants={itemVariants} 
              className="text-gray-400 text-base lg:text-lg max-w-md leading-relaxed tracking-tight"
            >
              Manage your work, timelines and team mates all at once. Set and follow timelines, assign tasks and keep your projects in check.
            </motion.p>

            <motion.div variants={itemVariants} className="flex w-full max-w-md mt-2 self-center lg:self-start">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-5 py-3 rounded-l-full bg-[#23233a] text-white placeholder-[#b3b3ff] focus:outline-none border border-[#23233a] focus:border-[#6e6ef6] focus:ring-1 focus:ring-[#6e6ef6]"
              />
              <Link href="/auth?view=signup" passHref className="contents">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-6 py-3 bg-white text-[#18182a] font-semibold rounded-r-full hover:bg-gray-200 transition"
                >
                  Get started
                </motion.button>
              </Link>
            </motion.div>
          </motion.section>

          {/* Right: Kanban Board Mockup */}
          <motion.section 
            className="w-full lg:w-1/2 flex justify-center items-center mt-12 lg:mt-0"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
          >
            <div className="bg-[#18182a] rounded-2xl shadow-2xl p-5 w-full max-w-2xl border border-[#2c2c44]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white font-semibold text-base">Project UI/UX</span>
                <div className="flex space-x-2">
                  <button className="bg-[#23233a] text-[#b3b3ff] px-3 py-1 rounded-full text-xs font-medium hover:bg-[#2c2c44] transition">Import</button>
                  <button className="bg-[#6e6ef6] text-white px-3 py-1 rounded-full text-xs font-medium hover:bg-[#5757d1] transition">+ New Board</button>
                </div>
              </div>
              <div className="flex space-x-3 overflow-x-auto pb-2">
                {/* To Do Column */}
                <div className="min-w-[180px] bg-[#0F0F1A] p-3 rounded-lg">
                  <h3 className="text-[#b3b3ff] font-semibold text-sm mb-2">To Do <span className="text-gray-500 text-xs">3</span></h3>
                  <div className="space-y-2">
                    <div className="bg-[#23233a] rounded-lg p-3 text-white text-xs shadow-md">
                      <p>Change top CTA button text</p>
                      <div className="flex items-center space-x-1 mt-1 text-gray-400">
                        <span>Due: Tomorrow</span>
                      </div>
                    </div>
                    <div className="bg-[#23233a] rounded-lg p-3 text-white text-xs shadow-md">
                      <p>Redesign analytics dashboard</p>
                       <div className="flex items-center space-x-1 mt-1 text-gray-400">
                         <span>Due: In 3 days</span>
                      </div>
                    </div>
                    <div className="bg-[#23233a] rounded-lg p-3 text-white text-xs shadow-md">
                      <p>Create landing page variations</p>
                       <div className="flex items-center space-x-1 mt-1 text-gray-400">
                         <span>Due: Next Week</span>
                      </div>
                    </div>
                    <div className="text-[#6e6ef6] mt-2 text-xs cursor-pointer hover:text-[#8f8fff] transition">+ Add new</div>
                  </div>
                </div>
                {/* In Progress Column */}
                <div className="min-w-[180px] bg-[#0F0F1A] p-3 rounded-lg">
                  <h3 className="text-[#b3b3ff] font-semibold text-sm mb-2">In Progress <span className="text-gray-500 text-xs">2</span></h3>
                  <div className="space-y-2">
                    <div className="bg-[#23233a] rounded-lg p-3 text-white text-xs shadow-md">
                      <p>Implement user feedback form</p>
                       <div className="flex items-center space-x-1 mt-1 text-gray-400">
                          <span>High Priority</span>
                      </div>
                    </div>
                    <div className="bg-[#23233a] rounded-lg p-3 text-white text-xs shadow-md">
                      <p>Copywriting for FAQ page</p>
                    </div>
                    <div className="text-[#6e6ef6] mt-2 text-xs cursor-pointer hover:text-[#8f8fff] transition">+ Add new</div>
                  </div>
                </div>
                {/* In Review Column */}
                <div className="min-w-[180px] bg-[#0F0F1A] p-3 rounded-lg">
                  <h3 className="text-[#b3b3ff] font-semibold text-sm mb-2">In Review <span className="text-gray-500 text-xs">1</span></h3>
                  <div className="space-y-2">
                    <div className="bg-[#23233a] rounded-lg p-3 text-white text-xs shadow-md">
                      <p>UI Animation for onboarding</p>
                       <div className="flex items-center space-x-1 mt-1 text-gray-400">
                         <span>Waiting for Lead</span>
                      </div>
                    </div>
                    <div className="text-[#6e6ef6] mt-2 text-xs cursor-pointer hover:text-[#8f8fff] transition">+ Add new</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        </main>
         <motion.footer 
          className="text-center py-6 text-gray-500 text-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          &copy; {new Date().getFullYear()} Kollab. All rights reserved.
        </motion.footer>
      </div>
    </LazyMotion>
  );
}

export default function LandingPage() {
  return (
    <AuthProvider>
      <LandingPageContent />
    </AuthProvider>
  );
}
