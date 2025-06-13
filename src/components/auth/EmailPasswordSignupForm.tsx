
// src/components/auth/EmailPasswordSignupForm.tsx
"use client";
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Not used directly if using FormField
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const signupSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

interface EmailPasswordSignupFormProps {
  onSuccess?: () => void;
  // onSwitchToLogin prop removed
}

export function EmailPasswordSignupForm({ onSuccess }: EmailPasswordSignupFormProps) {
  const { signupWithEmailAndPassword, loading } = useAuth();
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SignupFormValues) => {
    try {
      await signupWithEmailAndPassword(data.email, data.password);
      onSuccess?.(); 
    } catch (error) {
      console.error("Signup form submission error:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300">Email</FormLabel>
              <FormControl>
                <Input 
                  type="email" 
                  placeholder="you@example.com" 
                  {...field} 
                  disabled={loading}
                  className="bg-[#23233a] border-[#2c2c44] text-white placeholder-gray-500 focus:border-[#6e6ef6] focus:ring-[#6e6ef6]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300">Password</FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  placeholder="•••••••• (min. 6 characters)" 
                  {...field} 
                  disabled={loading} 
                  className="bg-[#23233a] border-[#2c2c44] text-white placeholder-gray-500 focus:border-[#6e6ef6] focus:ring-[#6e6ef6]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300">Confirm Password</FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  {...field} 
                  disabled={loading} 
                  className="bg-[#23233a] border-[#2c2c44] text-white placeholder-gray-500 focus:border-[#6e6ef6] focus:ring-[#6e6ef6]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-[#6e6ef6] hover:bg-[#5757d1] text-white" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign Up
        </Button>
        {/* onSwitchToLogin button removed */}
      </form>
    </Form>
  );
}
