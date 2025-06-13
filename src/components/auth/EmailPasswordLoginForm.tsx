
// src/components/auth/EmailPasswordLoginForm.tsx
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

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface EmailPasswordLoginFormProps {
  onSuccess?: () => void;
  // onSwitchToSignup prop removed
}

export function EmailPasswordLoginForm({ onSuccess }: EmailPasswordLoginFormProps) {
  const { loginWithEmailAndPassword, loading } = useAuth();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    try {
      await loginWithEmailAndPassword(data.email, data.password);
      onSuccess?.(); 
    } catch (error) {
      console.error("Login form submission error:", error);
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
          Sign In
        </Button>
        {/* onSwitchToSignup button removed */}
      </form>
    </Form>
  );
}
