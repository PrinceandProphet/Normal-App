import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Mail, 
  Phone, 
  User, 
  KeyRound, 
  Shield, 
  Download, 
  AlertCircle, 
  CheckCircle,
  Edit,
  UserCircle 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

export default function Profile() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isEditingNotifications, setIsEditingNotifications] = useState(false);
  
  // Form values for personal information
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(""); // Would need to be added to user schema
  
  // Password change form values
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PATCH", `/api/profile`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setIsEditingPersonal(false);
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error updating profile",
        description: error.message || "There was an error updating your profile.",
      });
    }
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", `/api/change-password`, data);
    },
    onSuccess: () => {
      setIsEditingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error changing password",
        description: error.message || "There was an error changing your password.",
      });
    }
  });

  const handleUpdateProfile = () => {
    updateProfileMutation.mutate({
      firstName,
      lastName,
      email,
      phone
    });
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "Your new password and confirmation don't match.",
      });
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword
    });
  };

  const handleExportData = async () => {
    try {
      const res = await apiRequest("GET", "/api/export-data");
      // Create and download the data file
      const blob = new Blob([JSON.stringify(res)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-recovery-data.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Data exported",
        description: "Your data has been exported successfully.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error exporting data",
        description: error.message || "There was an error exporting your data.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-0.5">
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information and account settings
        </p>
      </div>

      <div className="grid gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Update your personal contact information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditingPersonal ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input 
                      id="firstName" 
                      value={firstName} 
                      onChange={(e) => setFirstName(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input 
                      id="lastName" 
                      value={lastName} 
                      onChange={(e) => setLastName(e.target.value)} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditingPersonal(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleUpdateProfile}
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">First Name</p>
                    <p className="text-sm">{user?.firstName || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Name</p>
                    <p className="text-sm">{user?.lastName || "Not set"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email Address</p>
                  <p className="text-sm">{user?.email || "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone Number</p>
                  <p className="text-sm">Not set</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditingPersonal(true)}
                  className="mt-2"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Personal Information
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Password Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Password & Security
            </CardTitle>
            <CardDescription>
              Manage your password and account security settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditingPassword ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input 
                    id="currentPassword" 
                    type="password" 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input 
                    id="newPassword" 
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditingPassword(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleChangePassword}
                    disabled={changePasswordMutation.isPending}
                  >
                    {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Password</p>
                    <p className="text-sm text-muted-foreground">Last changed: Never</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditingPassword(true)}
                  >
                    Change Password
                  </Button>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="font-medium">Account Security</p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Shield className="h-4 w-4 mr-2 text-yellow-600" />
                        <span className="text-sm">Two-factor authentication</span>
                      </div>
                      <Button variant="outline" size="sm" disabled>Enable</Button>
                    </div>
                    <p className="text-xs text-muted-foreground pl-6">
                      Coming soon: Add an extra layer of security to your account
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data & Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Data & Privacy
            </CardTitle>
            <CardDescription>
              Manage your data and privacy preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <p className="font-medium">Export Your Data</p>
                <p className="text-sm text-muted-foreground mb-2">
                  Download a copy of all your personal information and recovery data
                </p>
                <Button variant="outline" onClick={handleExportData}>
                  Export Data
                </Button>
              </div>
              
              <div className="pt-4 border-t">
                <p className="font-medium">Data Deletion</p>
                <p className="text-sm text-muted-foreground mb-2">
                  Request to delete your account and all associated data
                </p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive">Request Account Deletion</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-destructive">Delete Account</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-5 w-5" />
                        <p className="font-medium">This action cannot be undone</p>
                      </div>
                      <p>
                        Your account and all your data will be permanently deleted. This includes your:
                      </p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Personal profile information</li>
                        <li>Household and property data</li>
                        <li>Recovery plan and progress</li>
                        <li>Messages and communication history</li>
                        <li>Document uploads and records</li>
                      </ul>
                      <p className="text-sm text-muted-foreground">
                        Note: If you're working with an organization, they may retain some data per their policies. 
                        Contact your case manager for details.
                      </p>
                    </div>
                    <DialogFooter>
                      <Button variant="outline">Cancel</Button>
                      <Button variant="destructive" disabled>
                        Delete My Account
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences - Simplified for client view */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Manage how and when you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-md">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-medium">Your notifications are active</p>
                  <p className="text-sm text-muted-foreground">
                    You will receive important updates via email and in-app notifications
                  </p>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mt-4">
                More notification options will be available in future updates.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}