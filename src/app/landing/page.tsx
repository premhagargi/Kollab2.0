// src/app/landing/page.tsx
"use client";
import React, { useEffect, useRef } from 'react';
import NextImage from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { AuthProvider } from '@/contexts/AuthContext';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextPlugin } from 'gsap/TextPlugin';

gsap.registerPlugin(ScrollTrigger, TextPlugin);

function LandingPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const headerRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const navItemsRef = useRef<(HTMLAnchorElement | HTMLDivElement | null)[]>([]);
  const authButtonsRef = useRef<HTMLDivElement>(null);
  
  const heroSectionRef = useRef<HTMLElement>(null);
  const hiringBannerRef = useRef<HTMLDivElement>(null);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const heroParagraphRef = useRef<HTMLParagraphElement>(null);
  const heroFormRef = useRef<HTMLDivElement>(null);
  
  const kanbanMockupRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/'); 
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (loading || user) return; 

    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.7 } });

    // Header animations
    if (headerRef.current) {
      tl.from(logoRef.current, { opacity: 0, y: -30, delay: 0.2 })
        .from(navItemsRef.current.filter(el => el), { opacity: 0, y: -30, stagger: 0.15 }, "-=0.5")
        .from(authButtonsRef.current, { opacity: 0, y: -30 }, "-=0.4");
    }

    // Hero section animations
    if (heroSectionRef.current && heroTitleRef.current) {
      tl.from(hiringBannerRef.current, { opacity: 0, y: 40, duration: 0.6 }, "-=0.2")
        // TextPlugin for hero title
        .from(heroTitleRef.current, {
          duration: 1.5,
          text: { value: "", speed: 0.5 }, // Clears existing text, then animates in
          ease: "power2.inOut"
        }, "-=0.3")
        .from(heroParagraphRef.current, { opacity: 0, y: 40, duration: 0.8 }, "-=1.2") // Overlap with title animation
        .from(heroFormRef.current, { opacity: 0, y: 40, duration: 0.8 }, "-=1.0"); // Overlap
    }

    // Scroll-triggered animation for Kanban mockup
    if (kanbanMockupRef.current) {
      gsap.fromTo(kanbanMockupRef.current, 
        { opacity: 0, y: 100, scale: 0.95 },
        { 
          opacity: 1, y: 0, scale: 1, duration: 1, ease: "power3.out",
          scrollTrigger: {
            trigger: kanbanMockupRef.current,
            start: "top 85%", // Trigger when 85% of the element is visible from the top
            toggleActions: "play none none none", // Play animation once on enter
          }
        }
      );
    }
    
    // Scroll-triggered animation for Footer
    if (footerRef.current) {
        gsap.fromTo(footerRef.current,
            { opacity: 0, y: 50 },
            {
                opacity: 1, y: 0, duration: 0.8, ease: "power3.out",
                scrollTrigger: {
                    trigger: footerRef.current,
                    start: "top 95%",
                    toggleActions: "play none none none",
                }
            }
        );
    }

    // Cleanup ScrollTriggers on component unmount
    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };

  }, [loading, user]);


  if (loading || (!loading && user)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a13] via-[#18182a] to-[#6e6ef6] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a13] via-[#18182a] to-[#6e6ef6] text-white flex flex-col">
        {/* Header */}
        <header 
          ref={headerRef}
          className="flex items-center justify-between px-6 md:px-8 py-5"
        >
          <div ref={logoRef} className="flex items-center space-x-3">
            <Link href="/landing" className="flex items-center space-x-3">
              <div className="bg-white rounded-md p-1.5">
                <NextImage src="https://placehold.co/30x30.png" alt="Kollab Logo" width={30} height={30} data-ai-hint="modern logo"/>
              </div>
              <span className="text-white text-xl font-bold">Kollab</span>
            </Link>
          </div>
          
          <nav className="hidden md:flex space-x-6 text-sm font-medium text-gray-300">
            <Link href="/landing" ref={el => navItemsRef.current[0] = el} className="hover:text-white transition-colors">Home</Link>
            <Link href="/landing#features" ref={el => navItemsRef.current[1] = el} className="hover:text-white transition-colors">Features</Link>
            <Link href="/landing#pricing" ref={el => navItemsRef.current[2] = el} className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/landing#contact" ref={el => navItemsRef.current[3] = el} className="hover:text-white transition-colors">Contact</Link>
          </nav>

          <div ref={authButtonsRef} className="flex items-center space-x-3">
            <Link href="/auth?view=login" passHref>
              <button className="bg-transparent text-white px-4 py-1.5 rounded-full font-semibold text-sm hover:bg-white/10 transition-colors">
                Sign in
              </button>
            </Link>
            <Link href="/auth?view=signup" passHref>
              <button className="bg-[#6e6ef6] text-white px-4 py-1.5 rounded-full font-semibold text-sm hover:bg-[#5757d1] transition-colors">
                Sign up
              </button>
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col lg:flex-row items-center justify-between px-6 lg:px-16 py-10 lg:py-0">
          {/* Left: Hero Section */}
          <section 
            ref={heroSectionRef}
            className="w-full lg:w-1/2 flex flex-col justify-center items-start space-y-6 text-center lg:text-left mb-12 lg:mb-0"
          >
            <div ref={hiringBannerRef} className="flex items-center space-x-3 mb-2 self-center lg:self-start">
              <span className="bg-[#23233a] text-[#b3b3ff] px-3 py-1 rounded-full text-xs font-medium">We&apos;re hiring</span>
              <button className="bg-[#18182a] text-white px-3 py-1 rounded-full text-xs font-medium border border-[#23233a] hover:bg-[#23233a] transition-colors">
                Join our remote team →
              </button>
            </div>
            <h1 
              ref={heroTitleRef}
              className="text-4xl lg:text-6xl font-normal text-white leading-tight tracking-tighter"
            >
              Manage All of Your <br /> Work In One Place <br /> Efficiently
            </h1>
            <p 
              ref={heroParagraphRef}
              className="text-gray-400 text-base lg:text-lg max-w-md leading-relaxed tracking-tight"
            >
              Manage your work, timelines and team mates all at once. Set and follow timelines, assign tasks and keep your projects in check.
            </p>

            <div ref={heroFormRef} className="flex w-full max-w-md mt-2 self-center lg:self-start">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-5 py-3 rounded-l-full bg-[#23233a] text-white placeholder-[#b3b3ff] focus:outline-none border border-[#23233a] focus:border-[#6e6ef6] focus:ring-1 focus:ring-[#6e6ef6]"
              />
              <Link href="/auth?view=signup" passHref className="contents">
                <button
                  className="px-6 py-3 bg-white text-[#18182a] font-semibold rounded-r-full hover:bg-gray-200 transition-colors"
                >
                  Get started
                </button>
              </Link>
            </div>
          </section>

          {/* Right: Kanban Board Mockup */}
          <section 
            ref={kanbanMockupRef}
            className="w-full lg:w-1/2 flex justify-center items-center mt-12 lg:mt-0"
          >
            <div className="bg-[#18182a] rounded-2xl shadow-2xl p-5 w-full max-w-2xl border border-[#2c2c44]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white font-semibold text-base">Project UI/UX</span>
                <div className="flex space-x-2">
                  <button className="bg-[#23233a] text-[#b3b3ff] px-3 py-1 rounded-full text-xs font-medium hover:bg-[#2c2c44] transition-colors">Import</button>
                  <button className="bg-[#6e6ef6] text-white px-3 py-1 rounded-full text-xs font-medium hover:bg-[#5757d1] transition-colors">+ New Board</button>
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
                    <div className="text-[#6e6ef6] mt-2 text-xs cursor-pointer hover:text-[#8f8fff] transition-colors">+ Add new</div>
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
                    <div className="text-[#6e6ef6] mt-2 text-xs cursor-pointer hover:text-[#8f8fff] transition-colors">+ Add new</div>
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
                    <div className="text-[#6e6ef6] mt-2 text-xs cursor-pointer hover:text-[#8f8fff] transition-colors">+ Add new</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
         <footer 
          ref={footerRef}
          className="text-center py-8 text-gray-500 text-xs"
        >
          &copy; {new Date().getFullYear()} Kollab. All rights reserved. A Project IDX Demo.
        </footer>
      </div>
  );
}

export default function LandingPage() {
  return (
    <AuthProvider>
      <LandingPageContent />
    </AuthProvider>
  );
}
