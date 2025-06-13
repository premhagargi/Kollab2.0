
// src/app/landing/page.tsx
"use client";
import React, { useEffect, useRef, useState } from 'react';
import NextImage from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { AuthProvider } from '@/contexts/AuthContext';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { LayoutGrid, ListChecks, Brain, CopyPlus, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger, SplitText);

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
  
  const kanbanMockupSectionRef = useRef<HTMLElement>(null);
  const kanbanMockupCardRef = useRef<HTMLDivElement>(null);
  const kanbanColumnsRef = useRef<(HTMLDivElement | null)[]>([]);

  const featuresSectionRef = useRef<HTMLElement>(null);
  const featuresTitleRef = useRef<HTMLHeadingElement>(null);
  const featureItemsRef = useRef<(HTMLDivElement | null)[]>([]);
  
  const footerRef = useRef<HTMLElement>(null);

  // Custom scrollbar refs and state
  const scrollbarTrackRef = useRef<HTMLDivElement>(null);
  const scrollbarThumbRef = useRef<HTMLDivElement>(null);
  const [isScrollbarVisible, setIsScrollbarVisible] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  const kollabFeatures = [
    {
      icon: LayoutGrid,
      title: "Visual Kanban Workflows",
      description: "Organize tasks visually with customizable columns. Drag & drop to manage your projects with ease.",
      linkText: "Explore Workflows",
    },
    {
      icon: ListChecks,
      title: "Comprehensive Task Management",
      description: "Create, update, and manage tasks with details like client names, billable status, deliverables, priority, and due dates.",
      linkText: "Manage Tasks Better",
    },
    {
      icon: Brain,
      title: "AI-Powered Clarity Tools",
      description: "Leverage Genkit for AI-generated client update drafts and task breakdown suggestions to enhance scope and planning.",
      linkText: "Discover AI Tools",
    },
    {
      icon: CopyPlus,
      title: "Workflow Templates",
      description: "Kickstart your projects quickly with predefined templates for freelance work, content creation, and more.",
      linkText: "Use Templates",
    },
  ];


  useEffect(() => {
    if (!loading && user) {
      router.replace('/'); 
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (loading || user) return; 

    let heroTitleSplit: SplitText | null = null;
    let heroParagraphSplit: SplitText | null = null;

    const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.7 } });

    // Header animations
    if (headerRef.current) {
      tl.from(logoRef.current, { opacity: 0, y: -30, delay: 0.2 })
        .from(navItemsRef.current.filter(el => el), { opacity: 0, y: -30, stagger: 0.15, duration: 0.5 }, "-=0.5")
        .from(authButtonsRef.current, { opacity: 0, y: -30, duration: 0.5 }, "-=0.4");
    }

    // Hero section animations
    if (heroSectionRef.current && heroTitleRef.current && heroParagraphRef.current) {
      tl.from(hiringBannerRef.current, { opacity: 0, y: 40, duration: 0.6, ease: "back.out(1.7)" }, "-=0.2");
      
      heroTitleSplit = new SplitText(heroTitleRef.current, { type: "lines,words,chars" });
      tl.from(heroTitleSplit.chars, {
        duration: 0.8,
        opacity: 0,
        y: 30,
        ease: "power3.out",
        stagger: 0.03,
      }, "-=0.3");

      heroParagraphSplit = new SplitText(heroParagraphRef.current, { type: "lines" });
      tl.from(heroParagraphSplit.lines, {
        duration: 0.8,
        opacity: 0,
        y: 20,
        ease: "power3.out",
        stagger: 0.1,
      }, "-=0.6");
      
      tl.from(heroFormRef.current, { opacity: 0, y: 40, duration: 0.8 }, "-=0.5");
    }

    // Scroll-triggered animation for Kanban mockup section
    if (kanbanMockupSectionRef.current && kanbanMockupCardRef.current) {
      gsap.fromTo(kanbanMockupCardRef.current, 
        { opacity: 0, y: 100, scale: 0.95 },
        { 
          opacity: 1, y: 0, scale: 1, duration: 1, ease: "power3.out",
          scrollTrigger: {
            trigger: kanbanMockupSectionRef.current,
            start: "top 80%", 
            toggleActions: "play none none none",
            onEnter: () => {
              if (kanbanColumnsRef.current.length > 0) {
                gsap.from(kanbanColumnsRef.current.filter(el => el), {
                  opacity: 0,
                  y: 50,
                  duration: 0.6,
                  stagger: 0.15,
                  ease: "power3.out",
                  delay: 0.2 
                });
              }
            }
          }
        }
      );
    }

    // Scroll-triggered animation for Features Section
    if (featuresSectionRef.current && featuresTitleRef.current) {
      gsap.from(featuresTitleRef.current, {
        opacity: 0,
        y: 50,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: {
          trigger: featuresSectionRef.current,
          start: "top 80%",
          toggleActions: "play none none none",
        }
      });

      gsap.from(featureItemsRef.current.filter(el => el), {
        opacity: 0,
        y: 50,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.2,
        scrollTrigger: {
          trigger: featuresSectionRef.current,
          start: "top 70%",
          toggleActions: "play none none none",
        }
      });
    }
    
    // Scroll-triggered animation for Footer
    if (footerRef.current) {
        gsap.from(footerRef.current, {
          opacity: 0,
          y: 50,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top 95%",
            toggleActions: "play none none none",
          }
        });
    }

    // Custom Scrollbar Logic
    const scrollableElement = document.documentElement; // Full page scroll
    const updateScrollbar = () => {
      if (scrollbarThumbRef.current && scrollbarTrackRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollableElement;
        if (scrollHeight <= clientHeight) { // No scroll needed
          setIsScrollbarVisible(false);
          return;
        }
        
        setIsScrollbarVisible(true);

        const thumbHeight = Math.max(20, (clientHeight / scrollHeight) * clientHeight); // Min height 20px
        const thumbPosition = (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - thumbHeight);

        gsap.to(scrollbarThumbRef.current, {
          height: thumbHeight,
          y: thumbPosition,
          duration: 0.1, // Quick update
          ease: "power1.out"
        });
        
        // Hide scrollbar after a delay if not scrolling
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
            // Check if mouse is over the track before hiding
            if (scrollbarTrackRef.current && !scrollbarTrackRef.current.matches(':hover')) {
                setIsScrollbarVisible(false);
            }
        }, 1500);
      }
    };

    const handleScroll = () => {
      updateScrollbar();
    };
    
    const handleResize = () => {
      updateScrollbar();
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    updateScrollbar(); // Initial check


    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
      if (heroTitleSplit) heroTitleSplit.revert();
      if (heroParagraphSplit) heroParagraphSplit.revert();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      gsap.killTweensOf(scrollbarThumbRef.current);
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
    <>
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a13] via-[#18182a] to-[#6e6ef6] text-white flex flex-col">
        {/* Header */}
        <header 
          ref={headerRef}
          className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-8 py-5 bg-[#0a0a13]/80 backdrop-blur-md"
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
            <Link href="#features" ref={el => navItemsRef.current[1] = el} className="hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" ref={el => navItemsRef.current[2] = el} className="hover:text-white transition-colors">Pricing</Link>
            <Link href="#contact" ref={el => navItemsRef.current[3] = el} className="hover:text-white transition-colors">Contact</Link>
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
        <main className="flex-1">
          {/* Hero Section */}
          <section 
            ref={heroSectionRef}
            className="flex flex-col lg:flex-row items-center justify-between px-6 lg:px-16 py-10 lg:py-16 min-h-[calc(100vh-80px)] lg:min-h-0"
          >
            {/* Left: Hero Text */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-start space-y-6 text-center lg:text-left mb-12 lg:mb-0">
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
            </div>

            {/* Right: Kanban Board Mockup */}
            <div 
              ref={kanbanMockupSectionRef} 
              className="w-full lg:w-1/2 flex justify-center items-center mt-12 lg:mt-0"
            >
              <div ref={kanbanMockupCardRef} className="bg-[#18182a] rounded-2xl shadow-2xl p-5 w-full max-w-2xl border border-[#2c2c44]">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white font-semibold text-base">Project UI/UX</span>
                  <div className="flex space-x-2">
                    <button className="bg-[#23233a] text-[#b3b3ff] px-3 py-1 rounded-full text-xs font-medium hover:bg-[#2c2c44] transition-colors">Import</button>
                    <button className="bg-[#6e6ef6] text-white px-3 py-1 rounded-full text-xs font-medium hover:bg-[#5757d1] transition-colors">+ New Board</button>
                  </div>
                </div>
                <div className="flex space-x-3 overflow-x-auto pb-2">
                  <div ref={el => kanbanColumnsRef.current[0] = el} className="min-w-[180px] bg-[#0F0F1A] p-3 rounded-lg kanban-column-mock">
                    <h3 className="text-[#b3b3ff] font-semibold text-sm mb-2">To Do <span className="text-gray-500 text-xs">3</span></h3>
                    <div className="space-y-2">
                      <div className="bg-[#23233a] rounded-lg p-3 text-white text-xs shadow-md">Change top CTA button text</div>
                      <div className="bg-[#23233a] rounded-lg p-3 text-white text-xs shadow-md">Redesign analytics dashboard</div>
                      <div className="bg-[#23233a] rounded-lg p-3 text-white text-xs shadow-md">Create landing page variations</div>
                      <div className="text-[#6e6ef6] mt-2 text-xs cursor-pointer hover:text-[#8f8fff] transition-colors">+ Add new</div>
                    </div>
                  </div>
                  <div ref={el => kanbanColumnsRef.current[1] = el} className="min-w-[180px] bg-[#0F0F1A] p-3 rounded-lg kanban-column-mock">
                    <h3 className="text-[#b3b3ff] font-semibold text-sm mb-2">In Progress <span className="text-gray-500 text-xs">2</span></h3>
                    <div className="space-y-2">
                      <div className="bg-[#23233a] rounded-lg p-3 text-white text-xs shadow-md">Implement user feedback form</div>
                      <div className="bg-[#23233a] rounded-lg p-3 text-white text-xs shadow-md">Copywriting for FAQ page</div>
                      <div className="text-[#6e6ef6] mt-2 text-xs cursor-pointer hover:text-[#8f8fff] transition-colors">+ Add new</div>
                    </div>
                  </div>
                  <div ref={el => kanbanColumnsRef.current[2] = el} className="min-w-[180px] bg-[#0F0F1A] p-3 rounded-lg kanban-column-mock">
                    <h3 className="text-[#b3b3ff] font-semibold text-sm mb-2">In Review <span className="text-gray-500 text-xs">1</span></h3>
                    <div className="space-y-2">
                      <div className="bg-[#23233a] rounded-lg p-3 text-white text-xs shadow-md">UI Animation for onboarding</div>
                      <div className="text-[#6e6ef6] mt-2 text-xs cursor-pointer hover:text-[#8f8fff] transition-colors">+ Add new</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section id="features" ref={featuresSectionRef} className="py-16 lg:py-24 px-6 lg:px-16 bg-[#11111e]">
            <div className="container mx-auto">
              <h2 ref={featuresTitleRef} className="text-3xl lg:text-4xl font-semibold text-center text-white mb-12 lg:mb-16">
                Powerful Features to Boost Your Productivity
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {kollabFeatures.map((feature, index) => (
                  <div
                    key={index}
                    ref={el => featureItemsRef.current[index] = el}
                    className="bg-[#18182a] p-6 rounded-xl shadow-xl border border-[#2c2c44] flex flex-col items-start hover:shadow-2xl hover:border-[#6e6ef6]/50 transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <div className="p-3 rounded-lg bg-[#6e6ef6]/10 mb-4">
                       <feature.icon className="h-7 w-7 text-[#8f8fff]" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-4 flex-grow">{feature.description}</p>
                    <Link href="/auth?view=signup" className="text-sm font-medium text-[#8f8fff] hover:text-white flex items-center group">
                      {feature.linkText}
                      <ChevronRight className="ml-1 h-4 w-4 transform transition-transform duration-200 group-hover:translate-x-1" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>
         
        <footer 
          ref={footerRef}
          className="text-center py-10 px-6 bg-[#0a0a13] border-t border-[#18182a]"
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="bg-white rounded-md p-1.5">
              <NextImage src="https://placehold.co/24x24.png" alt="Kollab Logo Small" width={24} height={24} data-ai-hint="modern logo"/>
            </div>
            <span className="text-white text-lg font-bold">Kollab</span>
          </div>
          <p className="text-gray-500 text-xs">
            &copy; {new Date().getFullYear()} Kollab. All rights reserved. A Project IDX Demo.
          </p>
           <div className="mt-4 space-x-4 text-xs">
            <Link href="/landing#features" className="text-gray-400 hover:text-white">Features</Link>
            <Link href="#" className="text-gray-400 hover:text-white">Privacy Policy</Link>
            <Link href="#" className="text-gray-400 hover:text-white">Terms of Service</Link>
          </div>
        </footer>
      </div>
      {/* Custom Scrollbar */}
      <div 
        ref={scrollbarTrackRef} 
        className={cn(
          "custom-scrollbar-track",
          isScrollbarVisible && "visible"
        )}
        onMouseEnter={() => { // Keep visible if mouse is over track
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
            setIsScrollbarVisible(true);
        }}
        onMouseLeave={() => { // Resume auto-hide when mouse leaves track
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
            scrollTimeoutRef.current = setTimeout(() => setIsScrollbarVisible(false), 1500);
        }}
      >
        <div ref={scrollbarThumbRef} className="custom-scrollbar-thumb"></div>
      </div>
    </>
  );
}

export default function LandingPage() {
  return (
    <AuthProvider>
      <LandingPageContent />
    </AuthProvider>
  );
}
