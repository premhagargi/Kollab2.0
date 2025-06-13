
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
import { SplitText } from 'gsap/SplitText'; // Updated import
import { LayoutGrid, ListChecks, Brain, CopyPlus, ChevronRight, Zap, BarChartBig, Users, MessageSquare, PlayCircle, Settings2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

gsap.registerPlugin(ScrollTrigger, SplitText); // Register SplitText

const kollabMainFeatures = [
  {
    icon: LayoutGrid,
    title: "Visual Kanban Workflows",
    description: "Organize tasks visually with customizable columns. Drag & drop to manage your projects with ease, track progress at a glance, and maintain clarity across all your initiatives.",
    linkText: "Explore Workflows",
    image: "https://placehold.co/500x350.png",
    dataAiHint: "metallic abstract cube"
  },
  {
    icon: ListChecks,
    title: "Comprehensive Task Management",
    description: "Create, update, and manage tasks with details like client names, billable status, deliverables, priority, due dates, subtasks, and comments. Never miss a deadline.",
    linkText: "Manage Tasks Better",
    image: "https://placehold.co/500x350.png",
    dataAiHint: "glossy 3d shapes"
  },
  {
    icon: Brain,
    title: "AI-Powered Clarity Tools",
    description: "Leverage Genkit for AI-generated client update drafts and task breakdown suggestions to enhance scope, planning, and communication. Save time and reduce manual effort.",
    linkText: "Discover AI Tools",
    image: "https://placehold.co/500x350.png",
    dataAiHint: "futuristic metallic orb"
  },
];

const whyKollabPoints = [
  {
    icon: Zap,
    title: "Boost Productivity",
    description: "Streamline your processes and focus on what matters most with intuitive tools designed for efficiency."
  },
  {
    icon: BarChartBig,
    title: "Gain Clarity",
    description: "Visualize your entire workload, track progress in real-time, and make data-driven decisions."
  },
  {
    icon: Users, // Kept for general appeal, though focus is solo
    title: "Built for You, Ready to Grow",
    description: "Perfectly tailored for solo freelancers, with underlying capabilities for future team features if your needs evolve."
  }
];

const howItWorksSteps = [
  {
    icon: PlayCircle,
    title: "1. Create Your Workflow",
    description: "Start with a template or a blank canvas. Define columns that match your project stages or personal system."
  },
  {
    icon: ListChecks,
    title: "2. Add & Organize Tasks",
    description: "Break down projects into manageable tasks. Add details, set priorities, due dates, and assign them as needed."
  },
  {
    icon: Settings2,
    title: "3. Manage & Track",
    description: "Drag tasks between columns, update progress, utilize AI tools for clarity, and keep everything on schedule."
  },
  {
    icon: ShieldCheck,
    title: "4. Achieve Your Goals",
    description: "Deliver projects efficiently, meet deadlines, and gain insights into your productivity."
  }
];

const testimonials = [
  {
    quote: "Kollab has transformed how I manage my freelance projects. The AI tools are a game-changer for client updates!",
    name: "Alex P.",
    title: "Freelance Developer"
  },
  {
    quote: "Finally, a task manager that's both powerful and beautiful. The workflow templates saved me so much time.",
    name: "Sarah M.",
    title: "Content Creator"
  },
  {
    quote: "I love the clarity Kollab brings to my week. Seeing all my tasks and their progress in one place is invaluable.",
    name: "David K.",
    title: "Solo Entrepreneur"
  }
];


function LandingPageContent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const landingPageContainerRef = useRef<HTMLDivElement>(null); // Ref for the main container

  const headerRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const navItemsRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const authButtonsRef = useRef<HTMLDivElement>(null);
  
  const heroSectionRef = useRef<HTMLElement>(null);
  const hiringBannerRef = useRef<HTMLDivElement>(null);
  const heroTitleRef = useRef<HTMLHeadingElement>(null);
  const heroParagraphRef = useRef<HTMLParagraphElement>(null);
  const heroFormRef = useRef<HTMLDivElement>(null);
  
  const kanbanMockupSectionRef = useRef<HTMLElement>(null);
  const kanbanMockupCardRef = useRef<HTMLDivElement>(null);
  const kanbanColumnsRef = useRef<(HTMLDivElement | null)[]>([]);

  const whyKollabSectionRef = useRef<HTMLElement>(null);
  const whyKollabTitleRef = useRef<HTMLHeadingElement>(null);
  const whyKollabItemsRef = useRef<(HTMLDivElement | null)[]>([]);

  const howItWorksSectionRef = useRef<HTMLElement>(null);
  const howItWorksTitleRef = useRef<HTMLHeadingElement>(null);
  const howItWorksStepsRef = useRef<(HTMLDivElement | null)[]>([]);
  
  const featureSpotlightSectionRef = useRef<HTMLElement>(null);
  const featureSpotlightTitleRef = useRef<HTMLHeadingElement>(null);
  const featureSpotlightItemsRef = useRef<(HTMLDivElement | null)[]>([]);
  
  const testimonialsSectionRef = useRef<HTMLElement>(null);
  const testimonialsTitleRef = useRef<HTMLHeadingElement>(null);
  const testimonialsItemsRef = useRef<(HTMLDivElement | null)[]>([]);

  const finalCTASectionRef = useRef<HTMLElement>(null);
  const finalCTATitleRef = useRef<HTMLHeadingElement>(null);
  const finalCTAParagraphRef = useRef<HTMLParagraphElement>(null);
  const finalCTAButtonRef = useRef<HTMLAnchorElement>(null);

  const footerRef = useRef<HTMLElement>(null);

  const scrollbarTrackRef = useRef<HTMLDivElement>(null);
  const scrollbarThumbRef = useRef<HTMLDivElement>(null);
  const [isScrollbarVisible, setIsScrollbarVisible] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/'); 
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (loading || user) return; 

    gsap.registerPlugin(ScrollTrigger, SplitText);
    let heroTitleSplit: SplitText | null = null;
    let heroParagraphSplit: SplitText | null = null;
    let whyKollabTitleSplit: SplitText | null = null;
    let howItWorksTitleSplit: SplitText | null = null;
    let featureSpotlightTitleSplit: SplitText | null = null;
    let testimonialsTitleSplit: SplitText | null = null;
    let finalCTATitleSplit: SplitText | null = null;

    // Set initial states to prevent flash of unstyled/unanimaated content
    if (landingPageContainerRef.current) {
        gsap.set(landingPageContainerRef.current, { opacity: 0 });
    }
    gsap.set([
        logoRef.current,
        ...(navItemsRef.current.filter(el => el)),
        authButtonsRef.current,
        hiringBannerRef.current,
        heroFormRef.current,
        heroTitleRef.current, // Set parent of SplitText to autoAlpha: 0
        heroParagraphRef.current // Set parent of SplitText to autoAlpha: 0
      ], { autoAlpha: 0, y: 20 }); // autoAlpha includes visibility:hidden
    
    gsap.set(kanbanMockupCardRef.current, {autoAlpha:0, y: 50, scale: 0.95});


    const tlEntry = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.7 } });

    if (headerRef.current) {
      tlEntry.to(logoRef.current, { autoAlpha: 1, y: 0, delay: 0.2 })
        .to(navItemsRef.current.filter(el => el), { autoAlpha: 1, y: 0, stagger: 0.15, duration: 0.5 }, "-=0.5")
        .to(authButtonsRef.current, { autoAlpha: 1, y: 0, duration: 0.5 }, "-=0.4");
    }

    if (heroSectionRef.current && heroTitleRef.current && heroParagraphRef.current) {
      tlEntry.to(hiringBannerRef.current, { autoAlpha: 1, y: 0, duration: 0.6, ease: "back.out(1.7)" }, "-=0.2");
      
      // Make parent containers for SplitText visible right before their children animate
      tlEntry.set([heroTitleRef.current, heroParagraphRef.current], {autoAlpha: 1}, ">-0.1");

      heroTitleSplit = new SplitText(heroTitleRef.current, { type: "chars,words" });
      tlEntry.from(heroTitleSplit.chars, {
        duration: 0.8, autoAlpha: 0, y: 30, ease: "power3.out", stagger: 0.03,
      }, "-=0.3");

      heroParagraphSplit = new SplitText(heroParagraphRef.current, { type: "lines" });
      tlEntry.from(heroParagraphSplit.lines, {
        duration: 0.8, autoAlpha: 0, y: 20, ease: "power3.out", stagger: 0.1,
      }, "-=0.6");
      
      tlEntry.to(heroFormRef.current, { autoAlpha: 1, y: 0, duration: 0.8 }, "-=0.5");
    }
    
    // Fade in the whole page after initial animations are set
    if (landingPageContainerRef.current) {
        tlEntry.to(landingPageContainerRef.current, { opacity: 1, duration: 0.3 }, ">-0.5"); 
    }


    if (kanbanMockupSectionRef.current && kanbanMockupCardRef.current) {
      gsap.to(kanbanMockupCardRef.current, 
        { 
          autoAlpha: 1, y: 0, scale: 1, duration: 1, ease: "power3.out",
          scrollTrigger: {
            trigger: kanbanMockupSectionRef.current,
            start: "top 80%", 
            toggleActions: "play none none none",
            once: true,
            onEnter: () => {
              if (kanbanColumnsRef.current.length > 0) {
                gsap.from(kanbanColumnsRef.current.filter(el => el), {
                  autoAlpha: 0, y: 50, duration: 0.6, stagger: 0.15, ease: "power3.out", delay: 0.2
                });
              }
            }
          }
        }
      );
    }

    // Why Kollab Section Animation
    if (whyKollabSectionRef.current && whyKollabTitleRef.current) {
      whyKollabTitleSplit = new SplitText(whyKollabTitleRef.current, { type: "words,chars" });
      gsap.from(whyKollabTitleSplit.chars, {
        autoAlpha: 0, y: 20, stagger: 0.03, duration: 0.6, ease: "power2.out",
        scrollTrigger: { trigger: whyKollabSectionRef.current, start: "top 80%", toggleActions: "play none none none", once: true, }
      });
      gsap.from(whyKollabItemsRef.current.filter(el => el), {
        autoAlpha: 0, y: 50, stagger: 0.2, duration: 0.7, ease: "power3.out",
        scrollTrigger: { trigger: whyKollabSectionRef.current, start: "top 70%", toggleActions: "play none none none", once: true, }
      });
    }

    // How It Works Section Animation
    if (howItWorksSectionRef.current && howItWorksTitleRef.current) {
      howItWorksTitleSplit = new SplitText(howItWorksTitleRef.current, { type: "words,chars" });
      gsap.from(howItWorksTitleSplit.chars, {
        autoAlpha: 0, y: 20, stagger: 0.03, duration: 0.6, ease: "power2.out",
        scrollTrigger: { trigger: howItWorksSectionRef.current, start: "top 80%", toggleActions: "play none none none", once: true, }
      });
      gsap.from(howItWorksStepsRef.current.filter(el => el), {
        autoAlpha: 0, y: 50, stagger: 0.2, duration: 0.7, ease: "power3.out",
        scrollTrigger: { trigger: howItWorksSectionRef.current, start: "top 65%", toggleActions: "play none none none", once: true, }
      });
    }

    // Feature Spotlight Section Animation
    if (featureSpotlightSectionRef.current && featureSpotlightTitleRef.current) {
      featureSpotlightTitleSplit = new SplitText(featureSpotlightTitleRef.current, { type: "words,chars" });
      gsap.from(featureSpotlightTitleSplit.chars, {
        autoAlpha: 0, y: 20, stagger: 0.03, duration: 0.6, ease: "power2.out",
        scrollTrigger: { trigger: featureSpotlightSectionRef.current, start: "top 80%", toggleActions: "play none none none", once: true, }
      });
      featureSpotlightItemsRef.current.filter(el => el).forEach((item, index) => {
        const img = item.querySelector('img');
        const textContent = item.querySelector('.feature-text-content');
        const tlFeature = gsap.timeline({
          scrollTrigger: { trigger: item, start: "top 80%", toggleActions: "play none none none", once: true, }
        });
        tlFeature.from(img, { autoAlpha: 0, x: index % 2 === 0 ? -50 : 50, scale: 0.8, duration: 0.8, ease: "power3.out" })
                 .from(textContent, { autoAlpha: 0, y: 30, duration: 0.7, ease: "power3.out" }, "-=0.5");
        
        if (img) {
            gsap.to(img, {
                rotationY: 5, scale: 1.03, duration: 8, ease: "sine.inOut",
                yoyo: true, repeat: -1, delay: index * 0.5 + 1 // Delay after entry
            });
        }
      });
    }
    
    // Testimonials Section Animation
    if (testimonialsSectionRef.current && testimonialsTitleRef.current) {
      testimonialsTitleSplit = new SplitText(testimonialsTitleRef.current, { type: "words,chars" });
      gsap.from(testimonialsTitleSplit.chars, {
        autoAlpha: 0, y: 20, stagger: 0.03, duration: 0.6, ease: "power2.out",
        scrollTrigger: { trigger: testimonialsSectionRef.current, start: "top 80%", toggleActions: "play none none none", once: true, }
      });
      gsap.from(testimonialsItemsRef.current.filter(el => el), {
        autoAlpha: 0, y: 50, scale: 0.95, stagger: 0.2, duration: 0.7, ease: "back.out(1.4)",
        scrollTrigger: { trigger: testimonialsSectionRef.current, start: "top 70%", toggleActions: "play none none none", once: true, }
      });
    }
    
    // Final CTA Section Animation
    if (finalCTASectionRef.current && finalCTATitleRef.current && finalCTAParagraphRef.current && finalCTAButtonRef.current) {
      finalCTATitleSplit = new SplitText(finalCTATitleRef.current, { type: "words,chars" });
      const ctaTimeline = gsap.timeline({
        scrollTrigger: { trigger: finalCTASectionRef.current, start: "top 80%", toggleActions: "play none none none", once: true, }
      });
      ctaTimeline.from(finalCTATitleSplit.chars, { autoAlpha: 0, y: 20, stagger: 0.03, duration: 0.6, ease: "power2.out" })
        .from(finalCTAParagraphRef.current, { autoAlpha: 0, y: 20, duration: 0.5, ease: "power2.out" }, "-=0.3")
        .from(finalCTAButtonRef.current, { autoAlpha: 0, scale: 0.8, duration: 0.6, ease: "back.out(1.7)" }, "-=0.2");
    }

    if (footerRef.current) {
        gsap.from(footerRef.current, {
          autoAlpha: 0, y: 50, duration: 0.8, ease: "power3.out",
          scrollTrigger: { trigger: footerRef.current, start: "top 95%", toggleActions: "play none none none", once: true, }
        });
    }

    const scrollableElement = document.documentElement;
    const updateScrollbar = () => {
      if (scrollbarThumbRef.current && scrollbarTrackRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollableElement;
        if (scrollHeight <= clientHeight) { 
            if (isScrollbarVisible) {
                gsap.to(scrollbarTrackRef.current, {opacity: 0, duration: 0.3, onComplete: () => setIsScrollbarVisible(false) });
            }
            return;
        }
        
        if(!isScrollbarVisible) {
            gsap.to(scrollbarTrackRef.current, {opacity: 1, duration: 0.3});
            setIsScrollbarVisible(true);
        }

        const thumbHeight = Math.max(20, (clientHeight / scrollHeight) * clientHeight);
        const thumbPosition = (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - thumbHeight);
        gsap.to(scrollbarThumbRef.current, { height: thumbHeight, y: thumbPosition, duration: 0.1, ease: "power1.out" });
        
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
            if (scrollbarTrackRef.current && !scrollbarTrackRef.current.matches(':hover')) {
                 gsap.to(scrollbarTrackRef.current, {opacity: 0, duration: 0.3, onComplete: () => setIsScrollbarVisible(false) });
            }
        }, 1500);
      }
    };
    const handleScroll = () => updateScrollbar();
    const handleResize = () => updateScrollbar();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    updateScrollbar(); // Initial call

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
      if (heroTitleSplit) heroTitleSplit.revert();
      if (heroParagraphSplit) heroParagraphSplit.revert();
      if (whyKollabTitleSplit) whyKollabTitleSplit.revert();
      if (howItWorksTitleSplit) howItWorksTitleSplit.revert();
      if (featureSpotlightTitleSplit) featureSpotlightTitleSplit.revert();
      if (testimonialsTitleSplit) testimonialsTitleSplit.revert();
      if (finalCTATitleSplit) finalCTATitleSplit.revert();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      gsap.killTweensOf([scrollbarThumbRef.current, scrollbarTrackRef.current, landingPageContainerRef.current]);
    };
  }, [loading, user]); // Ensure animations only run when not loading and no user

  if (loading || (!loading && user)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a13] via-[#18182a] to-[#6e6ef6] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div ref={landingPageContainerRef} className="min-h-screen bg-gradient-to-br from-[#0a0a13] via-[#18182a] to-[#6e6ef6] text-white flex flex-col" style={{ opacity: 0 }}> {/* Initially hidden */}
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
            <Link href="#why-kollab" ref={el => navItemsRef.current[1] = el} className="hover:text-white transition-colors">Why Kollab?</Link>
            <Link href="#features" ref={el => navItemsRef.current[2] = el} className="hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" ref={el => navItemsRef.current[3] = el} className="hover:text-white transition-colors">Pricing</Link>
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

        <main className="flex-1">
          <section 
            ref={heroSectionRef}
            className="flex flex-col lg:flex-row items-center justify-between px-6 lg:px-16 py-10 lg:py-16 min-h-[calc(100vh-80px)] lg:min-h-0"
          >
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-start space-y-6 text-center lg:text-left mb-12 lg:mb-0">
              <div ref={hiringBannerRef} className="flex items-center space-x-3 mb-2 self-center lg:self-start">
                <span className="bg-[#23233a] text-[#b3b3ff] px-3 py-1 rounded-full text-xs font-medium">We&apos;re hiring</span>
                <button className="bg-[#18182a] text-white px-3 py-1 rounded-full text-xs font-medium border border-[#23233a] hover:bg-[#23233a] transition-colors">
                  Join our remote team →
                </button>
              </div>
              <h1 ref={heroTitleRef} className="text-4xl lg:text-6xl font-normal text-white leading-tight tracking-tighter">
                Manage All of Your Work In One Place Efficiently
              </h1>
              <p ref={heroParagraphRef} className="text-gray-400 text-base lg:text-lg max-w-md leading-relaxed tracking-tight">
                Manage your work, timelines and team mates all at once. Set and follow timelines, assign tasks and keep your projects in check.
              </p>
              <div ref={heroFormRef} className="flex w-full max-w-md mt-2 self-center lg:self-start">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-5 py-3 rounded-l-full bg-[#23233a] text-white placeholder-[#b3b3ff] focus:outline-none border border-[#23233a] focus:border-[#6e6ef6] focus:ring-1 focus:ring-[#6e6ef6]"
                />
                <Link href="/auth?view=signup" passHref className="contents">
                  <button className="px-6 py-3 bg-white text-[#18182a] font-semibold rounded-r-full hover:bg-gray-200 transition-colors">
                    Get started
                  </button>
                </Link>
              </div>
            </div>
            <div ref={kanbanMockupSectionRef} className="w-full lg:w-1/2 flex justify-center items-center mt-12 lg:mt-0">
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

          {/* Why Kollab Section */}
          <section id="why-kollab" ref={whyKollabSectionRef} className="py-16 lg:py-24 px-6 lg:px-16 bg-[#11111e]">
            <div className="container mx-auto text-center">
              <h2 ref={whyKollabTitleRef} className="text-3xl lg:text-4xl font-semibold text-white mb-12 lg:mb-16">
                Why Choose Kollab?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                {whyKollabPoints.map((point, index) => (
                  <div key={index} ref={el => whyKollabItemsRef.current[index] = el} className="flex flex-col items-center bg-[#18182a] p-8 rounded-xl shadow-xl border border-[#2c2c44] hover:border-[#6e6ef6]/50 transition-all duration-300 transform hover:-translate-y-1">
                    <div className="p-4 rounded-full bg-[#6e6ef6]/10 mb-5">
                      <point.icon className="h-8 w-8 text-[#8f8fff]" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3">{point.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{point.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How It Works Section */}
          <section ref={howItWorksSectionRef} className="py-16 lg:py-24 px-6 lg:px-16">
            <div className="container mx-auto text-center">
              <h2 ref={howItWorksTitleRef} className="text-3xl lg:text-4xl font-semibold text-white mb-12 lg:mb-16">
                Streamlined Workflow, Amplified Results
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {howItWorksSteps.map((step, index) => (
                  <div key={index} ref={el => howItWorksStepsRef.current[index] = el} className="bg-[#18182a] p-6 rounded-xl shadow-xl border border-[#2c2c44] flex flex-col items-start text-left hover:shadow-2xl hover:border-[#6e6ef6]/50 transition-all duration-300 transform hover:-translate-y-1">
                    <div className="p-3 rounded-lg bg-[#6e6ef6]/10 mb-4">
                       <step.icon className="h-7 w-7 text-[#8f8fff]" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Feature Spotlight Section */}
          <section id="features" ref={featureSpotlightSectionRef} className="py-16 lg:py-24 px-6 lg:px-16 bg-[#11111e]">
            <div className="container mx-auto">
              <h2 ref={featureSpotlightTitleRef} className="text-3xl lg:text-4xl font-semibold text-center text-white mb-16">
                Everything You Need to Succeed
              </h2>
              {kollabMainFeatures.map((feature, index) => (
                <div
                  key={index}
                  ref={el => featureSpotlightItemsRef.current[index] = el}
                  className={cn(
                    "flex flex-col lg:flex-row items-center gap-8 lg:gap-16 mb-16 lg:mb-24",
                    index % 2 !== 0 && "lg:flex-row-reverse" 
                  )}
                >
                  <div className="lg:w-1/2">
                    <NextImage
                      src={feature.image}
                      alt={feature.title}
                      width={500}
                      height={350}
                      className="rounded-xl shadow-2xl border border-[#2c2c44]"
                      data-ai-hint={feature.dataAiHint}
                    />
                  </div>
                  <div className="lg:w-1/2 feature-text-content">
                    <div className="p-3 rounded-lg bg-[#6e6ef6]/10 mb-4 inline-block">
                       <feature.icon className="h-7 w-7 text-[#8f8fff]" />
                    </div>
                    <h3 className="text-3xl font-semibold text-white mb-4">{feature.title}</h3>
                    <p className="text-gray-400 text-base leading-relaxed mb-6">{feature.description}</p>
                    <Link href="/auth?view=signup" className="text-base font-medium text-[#8f8fff] hover:text-white flex items-center group bg-[#23233a] px-6 py-3 rounded-lg transition-colors hover:bg-[#2c2c44]">
                      {feature.linkText}
                      <ChevronRight className="ml-2 h-5 w-5 transform transition-transform duration-200 group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Testimonials Section */}
          <section ref={testimonialsSectionRef} className="py-16 lg:py-24 px-6 lg:px-16">
            <div className="container mx-auto">
              <h2 ref={testimonialsTitleRef} className="text-3xl lg:text-4xl font-semibold text-center text-white mb-12 lg:mb-16">
                Loved by Freelancers & Creators
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {testimonials.map((testimonial, index) => (
                  <div
                    key={index}
                    ref={el => testimonialsItemsRef.current[index] = el}
                    className="bg-[#18182a] p-8 rounded-xl shadow-xl border border-[#2c2c44] flex flex-col text-left hover:shadow-2xl transition-all duration-300"
                  >
                    <MessageSquare className="h-8 w-8 text-[#6e6ef6] mb-6" />
                    <p className="text-gray-300 text-base leading-relaxed mb-6 flex-grow">&quot;{testimonial.quote}&quot;</p>
                    <div>
                      <p className="text-white font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-[#8f8fff]">{testimonial.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
          
          {/* Final CTA Section */}
          <section ref={finalCTASectionRef} className="py-20 lg:py-32 text-center bg-[#18182a] border-t border-b border-[#2c2c44] mt-10">
            <div className="container mx-auto px-6">
              <h2 ref={finalCTATitleRef} className="text-4xl lg:text-5xl font-semibold text-white mb-6">
                Ready to Supercharge Your Workflow?
              </h2>
              <p ref={finalCTAParagraphRef} className="text-gray-400 text-lg max-w-2xl mx-auto mb-10">
                Join Kollab today and experience a new level of organization and productivity. Sign up for free!
              </p>
              <Link
                href="/auth?view=signup"
                ref={finalCTAButtonRef}
                className="inline-block bg-[#6e6ef6] text-white text-lg font-semibold px-10 py-4 rounded-lg hover:bg-[#5757d1] transition-colors transform hover:scale-105"
              >
                Get Started for Free
              </Link>
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
            <Link href="#features" className="text-gray-400 hover:text-white">Features</Link>
            <Link href="#" className="text-gray-400 hover:text-white">Privacy Policy</Link>
            <Link href="#" className="text-gray-400 hover:text-white">Terms of Service</Link>
          </div>
        </footer>
      </div>
      <div 
        ref={scrollbarTrackRef} 
        className={cn("custom-scrollbar-track", isScrollbarVisible && "visible")}
        onMouseEnter={() => {
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
            if (scrollbarTrackRef.current && !isScrollbarVisible) {
                 gsap.to(scrollbarTrackRef.current, {opacity: 1, duration: 0.3});
                 setIsScrollbarVisible(true);
            }
        }}
        onMouseLeave={() => {
            if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
            scrollTimeoutRef.current = setTimeout(() => {
                if (scrollbarTrackRef.current && scrollbarTrackRef.current.matches(':hover') === false) { // Check hover again
                    gsap.to(scrollbarTrackRef.current, {opacity: 0, duration: 0.3, onComplete: () => setIsScrollbarVisible(false) });
                }
            }, 1500);
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
    
