import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Shield } from 'lucide-react';

// Login schema
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  
  // If user is already logged in, we handle that in the AuthContext

  // Login form
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // Submit handler
  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values);
  };

  return (
    <div className="flex min-h-screen w-full">
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-[350px]">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your username" {...field} />
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter your password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      
      <div className="hidden md:flex md:flex-1 bg-gradient-to-br from-primary/90 to-primary/50 items-center justify-center">
        <div className="max-w-md px-8">
          <h1 className="text-4xl font-bold mb-6 text-white">Disaster Recovery Platform</h1>
          <p className="text-lg mb-8 text-white/90">
            A comprehensive tool for managing recovery processes after disasters, tracking assistance, 
            and organizing resources for affected households.
          </p>
          <ul className="space-y-4">
            <li className="flex items-center">
              <div className="mr-3 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-white">✓</div>
              <p className="text-white">Document management & secure storage</p>
            </li>
            <li className="flex items-center">
              <div className="mr-3 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-white">✓</div>
              <p className="text-white">Household tracking & eligibility assessment</p>
            </li>
            <li className="flex items-center">
              <div className="mr-3 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-white">✓</div>
              <p className="text-white">S.T.A.R.T. recovery framework implementation</p>
            </li>
            <li className="flex items-center">
              <div className="mr-3 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center text-white">✓</div>
              <p className="text-white">Unified messaging & coordination tools</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}