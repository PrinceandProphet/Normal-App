import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { insertUserSchema } from '@shared/schema';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Login schema
const loginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Register schema - use the one from the shared schema but enforce string types
const registerSchema = insertUserSchema.extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();

  // Use effect for navigation instead of during render
  useEffect(() => {
    // If user is already logged in, redirect based on role
    // We'll only handle the initial redirect here, not after login/register 
    // since those are handled in the mutations
    if (user && !loginMutation.isPending && !registerMutation.isPending) {
      // Super admins land on the Admin Dashboard
      if (user.role === 'super_admin') {
        navigate('/admin');
      } 
      // Organization admins go to org dashboard
      else if (user.role === 'admin') {
        navigate('/org-dashboard');
      }
      // Case managers go to practitioner dashboard
      else if (user.role === 'case_manager') {
        navigate('/practitioner-dashboard');
      }
      // Regular users and others go to home
      else {
        navigate('/');
      }
    }
  }, [user, navigate, loginMutation.isPending, registerMutation.isPending]);

  // Login form
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // Register form
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      password: '',
      email: '',
      firstName: '',
      lastName: '',
      role: 'user',
    },
  });

  // Submit handlers
  const onLoginSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values);
  };

  const onRegisterSubmit = (values: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(values);
  };

  // Determine which form to show
  const [isLogin, setIsLogin] = useState(true);
  const toggleForm = () => setIsLogin(!isLogin);

  return (
    <div className="flex min-h-screen w-full bg-gray-100">
      {/* Left side - Form Section */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Disaster Recovery Platform
            </h1>
            <p className="mt-3 text-gray-600">
              {isLogin ? 'Sign in to your account' : 'Create a new account'}
            </p>
          </div>

          {isLogin ? (
            <div className="mt-8 bg-white py-8 px-10 shadow-lg rounded-xl">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block text-sm font-medium text-gray-700">
                          Username
                        </FormLabel>
                        <FormControl>
                          <Input 
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" 
                            placeholder="Enter your username" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage className="text-xs font-medium" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block text-sm font-medium text-gray-700">
                          Password
                        </FormLabel>
                        <FormControl>
                          <Input 
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" 
                            type="password" 
                            placeholder="Enter your password" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage className="text-xs font-medium" />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full rounded-md bg-primary py-3 font-medium text-white shadow hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign in'
                    )}
                  </Button>
                </form>
              </Form>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <button 
                    onClick={toggleForm} 
                    className="font-medium text-primary hover:text-primary/80"
                  >
                    Create one
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-8 bg-white py-8 px-10 shadow-lg rounded-xl">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={registerForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="block text-sm font-medium text-gray-700">
                            First Name
                          </FormLabel>
                          <FormControl>
                            <Input 
                              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" 
                              placeholder="First name" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-xs font-medium" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="block text-sm font-medium text-gray-700">
                            Last Name
                          </FormLabel>
                          <FormControl>
                            <Input 
                              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" 
                              placeholder="Last name" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-xs font-medium" />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block text-sm font-medium text-gray-700">
                          Email
                        </FormLabel>
                        <FormControl>
                          <Input 
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" 
                            type="email" 
                            placeholder="your.email@example.com" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage className="text-xs font-medium" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block text-sm font-medium text-gray-700">
                          Username
                        </FormLabel>
                        <FormControl>
                          <Input 
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" 
                            placeholder="Choose a username" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage className="text-xs font-medium" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="block text-sm font-medium text-gray-700">
                          Password
                        </FormLabel>
                        <FormControl>
                          <Input 
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" 
                            type="password" 
                            placeholder="Create a password" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage className="text-xs font-medium" />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full rounded-md bg-primary py-3 font-medium text-white shadow hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </Form>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <button 
                    onClick={toggleForm} 
                    className="font-medium text-primary hover:text-primary/80"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right side - Hero Section */}
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