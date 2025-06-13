
// src/app/auth/page.tsx
"use client";
import React, { useEffect, Suspense } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { useSearchParams, useRouter } from 'next/navigation'; // Changed from 'next/navigation'
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { EmailPasswordLoginForm } from '@/components/auth/EmailPasswordLoginForm';
import { EmailPasswordSignupForm } from '@/components/auth/EmailPasswordSignupForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Mail, Loader2 } from 'lucide-react';
import { siteConfig } from '@/config/site';

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18px" height="18px" className="mr-2">
    <path fill="#EA4335" d="M24 9.5c3.22 0 5.17.46 6.81 1.37 2.51 1.39 4.2 3.83 4.2 7.13 0 1.4-.33 2.7-.92 3.87L24 24l-8.09-8.09C16.24 14.55 18.67 12.5 24 12.5V9.5z"/>
    <path fill="#4285F4" d="M45.12 24.6c0-1.72-.15-3.36-.42-4.95H24v9.3h11.82c-.52 3.01-2.04 5.55-4.58 7.28l6.91 5.34c4.04-3.73 6.37-9.19 6.37-15.97z"/>
    <path fill="#FBBC05" d="M10.34 28.16l-7.49 5.79C1.04 30.96 0 27.62 0 24s1.04-6.96 2.85-9.95l7.49 5.79c-.4.99-.64 2.08-.64 3.16s.24 2.17.64 3.16z"/>
    <path fill="#34A853" d="M24 48c6.42 0 11.88-2.11 15.84-5.72l-6.91-5.34c-2.13 1.43-4.86 2.28-7.93 2.28-6.08 0-11.24-4.08-13.09-9.59L2.85 33.95C6.79 42.56 14.73 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
);

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get('view') || 'login'; // Default to login
  const { user, loading: authLoading, loginWithGoogle } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/'); // Redirect to dashboard if already logged in
    }
  }, [user, authLoading, router]);

  const handleLoginSuccess = () => {
    // AuthContext handles toasts, page effect handles redirect
  };
  
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-[#6e6ef6]" />
      </div>
    );
  }
  if (!authLoading && user) {
    // Effectively a loader while redirecting
    return (
       <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-[#6e6ef6]" />
        <p className="ml-4 text-lg">Redirecting to dashboard...</p>
      </div>
    );
  }


  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <Link href="/landing" className="flex items-center space-x-3 mb-8">
        <div className="bg-white rounded-md p-1.5">
          <NextImage src="https://placehold.co/30x30.png" alt="Kollab Logo" width={30} height={30} data-ai-hint="modern logo"/>
        </div>
        <span className="text-white text-2xl font-bold">{siteConfig.name}</span>
      </Link>

      <Card className="w-full max-w-md bg-[#18182a] border-[#2c2c44] text-white shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-center">
            {view === 'login' ? 'Welcome Back!' : 'Create Your Account'}
          </CardTitle>
          <CardDescription className="text-center text-gray-400">
            {view === 'login'
              ? 'Sign in to continue to Kollab.'
              : 'Join Kollab to streamline your workflow.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {view === 'login' ? (
            <EmailPasswordLoginForm onSuccess={handleLoginSuccess} />
          ) : (
            <EmailPasswordSignupForm onSuccess={handleLoginSuccess} />
          )}

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#2c2c44]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#18182a] px-2 text-gray-400">
                Or continue with
              </span>
            </div>
          </div>

          <Button onClick={async () => { await loginWithGoogle(); handleLoginSuccess();}} className="w-full bg-[#23233a] border border-[#2c2c44] hover:bg-[#2c2c44] text-white" disabled={authLoading}>
            {authLoading && view === 'login' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <GoogleIcon /> Sign {view === 'login' ? 'in' : 'up'} with Google
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center">
          {view === 'login' ? (
            <p className="text-sm text-gray-400">
              Don&apos;t have an account?{' '}
              <Link href="/auth?view=signup" className="font-semibold text-[#6e6ef6] hover:text-[#8f8fff]">
                Sign up
              </Link>
            </p>
          ) : (
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <Link href="/auth?view=login" className="font-semibold text-[#6e6ef6] hover:text-[#8f8fff]">
                Sign in
              </Link>
            </p>
          )}
        </CardFooter>
      </Card>
      <p className="mt-8 text-xs text-gray-500">
        &copy; {new Date().getFullYear()} Kollab. All rights reserved.
      </p>
    </div>
  );
}


export default function AuthPage() {
  return (
    // Suspense is good practice if AuthPageContent has its own data fetching,
    // but here it's mainly for reading query params.
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0a0a13] via-[#18182a] to-[#6e6ef6]"><Loader2 className="h-12 w-12 animate-spin text-[#6e6ef6]" /></div>}>
      <AuthProvider> {/* Ensure AuthProvider wraps the content */}
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a13] via-[#18182a] to-[#6e6ef6]">
          <AuthPageContent />
        </div>
      </AuthProvider>
    </Suspense>
  );
}
