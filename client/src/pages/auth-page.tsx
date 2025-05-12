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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Loader2, Shield, UserPlus, ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Login schema
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

// Registration schema
const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  name: z.string().min(1, 'Full name is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Password reset request schema
const resetRequestSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetRequestSent, setResetRequestSent] = useState(false);
  
  // If user is already logged in, we handle that in the AuthContext

  // Login form
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // Registration form
  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
    },
  });

  // Password reset request form
  const resetRequestForm = useForm<z.infer<typeof resetRequestSchema>>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: {
      email: '',
    },
  });

  // Login submit handler
  const onLoginSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values);
  };

  // Registration submit handler
  const onRegisterSubmit = (values: z.infer<typeof registerSchema>) => {
    // Add role and userType to registration data
    const registrationData = {
      username: values.username,
      email: values.email,
      password: values.password,
      name: values.name,
      role: 'user' as const, // Default role is 'user'
      userType: 'survivor' as const, // Default user type is 'survivor'
    };
    
    registerMutation.mutate(registrationData);
  };

  // Password reset request handler
  const onResetRequestSubmit = async (values: z.infer<typeof resetRequestSchema>) => {
    try {
      console.log('📨 Submitting password reset request for:', values.email);
      
      // Send password reset request
      const response = await apiRequest('POST', '/api/request-password-reset', { email: values.email });
      console.log('✅ Password reset response:', response);
      
      setResetRequestSent(true);
      toast({
        title: "Reset link sent",
        description: "If an account exists with this email, you'll receive a password reset link.",
      });
    } catch (error) {
      // Even if there's an error, we still show success to prevent email fishing
      console.error('❌ Password reset request error:', error);
      
      setResetRequestSent(true);
      toast({
        title: "Reset link sent",
        description: "If an account exists with this email, you'll receive a password reset link.",
      });
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            
            {!showForgotPassword ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <CardTitle className="text-2xl mt-4">Sign In</CardTitle>
                  <CardDescription>Enter your credentials to access your account</CardDescription>
                </TabsContent>
                
                <TabsContent value="register">
                  <CardTitle className="text-2xl mt-4">Create Account</CardTitle>
                  <CardDescription>Register for a free account to track your recovery</CardDescription>
                </TabsContent>
              </Tabs>
            ) : (
              <>
                <CardTitle className="text-2xl">Reset Password</CardTitle>
                <CardDescription>
                  Enter your email address and we'll send you a link to reset your password
                </CardDescription>
              </>
            )}
          </CardHeader>
          
          <CardContent>
            {!showForgotPassword ? (
              <>
                {/* Login Form */}
                {activeTab === "login" && (
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
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
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter your password" {...field} />
                            </FormControl>
                            <FormMessage />
                            <Button 
                              variant="link" 
                              className="px-0 text-sm font-normal"
                              type="button"
                              onClick={() => setShowForgotPassword(true)}
                            >
                              Forgot password?
                            </Button>
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
                )}

                {/* Registration Form */}
                {activeTab === "register" && (
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Choose a username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="Enter your email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Create a password" {...field} />
                            </FormControl>
                            <FormDescription className="text-xs">
                              Must be at least 6 characters
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Confirm your password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={registerMutation.isPending}
                      >
                        {registerMutation.isPending ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</>
                        ) : (
                          <>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Register
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                )}
              </>
            ) : (
              /* Password Reset Request Form */
              <>
                {!resetRequestSent ? (
                  <Form {...resetRequestForm}>
                    <form onSubmit={resetRequestForm.handleSubmit(onResetRequestSubmit)} className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="reset-email" className="text-sm font-medium">Email</label>
                        <input
                          id="reset-email"
                          type="email"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Enter your email"
                          value={resetRequestForm.getValues().email}
                          onChange={(e) => resetRequestForm.setValue('email', e.target.value)}
                        />
                        {resetRequestForm.formState.errors.email && (
                          <p className="text-sm font-medium text-destructive">
                            {resetRequestForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full"
                      >
                        Send Reset Link
                      </Button>
                      
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full"
                        onClick={() => setShowForgotPassword(false)}
                      >
                        Back to Login
                      </Button>
                    </form>
                  </Form>
                ) : (
                  <>
                    <Alert className="mb-4">
                      <AlertDescription>
                        If an account exists with this email, you'll receive a password reset link.
                        Please check your inbox and spam folders.
                      </AlertDescription>
                    </Alert>
                    <Button 
                      className="w-full"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setResetRequestSent(false);
                      }}
                    >
                      Back to Login
                    </Button>
                  </>
                )}
              </>
            )}
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