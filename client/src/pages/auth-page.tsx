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
  const [activeTab, setActiveTab] = useState<string>('login');
  const [, navigate] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();

  // Use effect for navigation instead of during render
  useEffect(() => {
    // If user is already logged in, redirect to home
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

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

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      {/* Auth Form Section */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-12">
        <Card className="w-full max-w-md shadow-xl border-0 overflow-hidden">
          <CardHeader className="px-8 py-6 bg-slate-50 border-b">
            <CardTitle className="text-2xl font-bold text-slate-900">Welcome to Disaster Recovery</CardTitle>
            <CardDescription className="text-slate-600 mt-2 text-base">
              Sign in to your account or create a new one to access the disaster recovery platform.
            </CardDescription>
          </CardHeader>
          <Tabs
            defaultValue="login"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="border-b border-gray-200">
              <div className="px-8 pt-6 pb-2">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="login" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none bg-transparent px-4 py-3 text-sm font-medium">Login</TabsTrigger>
                  <TabsTrigger value="register" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none bg-transparent px-4 py-3 text-sm font-medium">Register</TabsTrigger>
                </TabsList>
              </div>
            </div>

            {/* Login Form */}
            <TabsContent value="login">
              <Form {...loginForm}>
                <form
                  onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                  className="space-y-4"
                >
                  <CardContent className="space-y-6 px-8 pt-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Username</FormLabel>
                          <FormControl>
                            <Input 
                              className="py-5 px-4" 
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
                          <FormLabel className="text-sm font-medium">Password</FormLabel>
                          <FormControl>
                            <Input 
                              className="py-5 px-4" 
                              type="password" 
                              placeholder="Enter your password" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-xs font-medium" />
                        </FormItem>
                      )}
                    />
                  </CardContent>

                  <CardFooter className="px-8 py-6 flex justify-end">
                    <Button 
                      type="submit" 
                      className="w-full py-6 text-base font-medium"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </TabsContent>

            {/* Register Form */}
            <TabsContent value="register">
              <Form {...registerForm}>
                <form 
                  onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                  className="space-y-4"
                >
                  <CardContent className="space-y-6 px-8 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">First Name</FormLabel>
                            <FormControl>
                              <Input 
                                className="py-5 px-4" 
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
                            <FormLabel className="text-sm font-medium">Last Name</FormLabel>
                            <FormControl>
                              <Input 
                                className="py-5 px-4" 
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
                          <FormLabel className="text-sm font-medium">Email</FormLabel>
                          <FormControl>
                            <Input 
                              className="py-5 px-4"
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
                          <FormLabel className="text-sm font-medium">Username</FormLabel>
                          <FormControl>
                            <Input 
                              className="py-5 px-4"
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
                          <FormLabel className="text-sm font-medium">Password</FormLabel>
                          <FormControl>
                            <Input 
                              className="py-5 px-4"
                              type="password" 
                              placeholder="Create a password" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage className="text-xs font-medium" />
                        </FormItem>
                      )}
                    />
                  </CardContent>

                  <CardFooter className="px-8 py-6 flex justify-end">
                    <Button 
                      type="submit" 
                      className="w-full py-6 text-base font-medium"
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
                  </CardFooter>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Hero Section */}
      <div className={cn(
        "hidden md:flex flex-1 bg-gradient-to-br from-primary/90 to-primary/50",
        "flex-col justify-center p-12 text-white"
      )}>
        <div className="max-w-md">
          <h1 className="text-4xl font-bold mb-6">Disaster Recovery Platform</h1>
          <p className="text-xl mb-8">
            A comprehensive tool for managing recovery processes after disasters, tracking assistance, 
            and organizing resources for affected households.
          </p>
          <ul className="space-y-3">
            <li className="flex items-center">
              <div className="mr-3 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">✓</div>
              <p>Document management & secure storage</p>
            </li>
            <li className="flex items-center">
              <div className="mr-3 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">✓</div>
              <p>Household tracking & eligibility assessment</p>
            </li>
            <li className="flex items-center">
              <div className="mr-3 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">✓</div>
              <p>S.T.A.R.T. recovery framework implementation</p>
            </li>
            <li className="flex items-center">
              <div className="mr-3 h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">✓</div>
              <p>Unified messaging & coordination tools</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}