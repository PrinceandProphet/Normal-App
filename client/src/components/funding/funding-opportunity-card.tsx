import { useState } from "react";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Banknote, 
  Calendar, 
  GanttChart, 
  MapPin, 
  MoreVertical, 
  ClipboardEdit, 
  Trash2,
  Users,
  Home,
  AlertTriangle,
  Globe
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function FundingOpportunityCard({ opportunity, onEdit, onDelete, user }) {
  // Check if the user has permission to edit this opportunity
  const canManage = 
    user?.role === "super_admin" || 
    (user?.role === "admin" && user?.organizationId === opportunity.organizationId);

  // Parse the eligibility criteria if it's a string
  const eligibilityCriteria = typeof opportunity.eligibilityCriteria === 'string'
    ? JSON.parse(opportunity.eligibilityCriteria)
    : opportunity.eligibilityCriteria || [];

  // Format dates for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (e) {
      return dateString;
    }
  };

  // Format currency for display
  const formatCurrency = (amount) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="relative pb-2">
        {opportunity.isPublic && (
          <Badge variant="outline" className="absolute top-2 right-2 bg-green-50 text-green-700 border-green-200">
            Public
          </Badge>
        )}
        <CardTitle className="line-clamp-1">{opportunity.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {opportunity.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4 pb-2">
        {/* Award amount */}
        <div className="flex items-center gap-2">
          <Banknote className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            <span className="font-medium">Award:</span> {formatCurrency(opportunity.awardAmount)}
          </span>
        </div>
        
        {/* Application dates */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            <span className="font-medium">Apply:</span> {formatDate(opportunity.applicationStartDate)} - {formatDate(opportunity.applicationEndDate)}
          </span>
        </div>

        {/* Eligibility summary */}
        <div className="pt-2">
          <h4 className="text-sm font-medium mb-2">Eligibility:</h4>
          <div className="flex flex-wrap gap-2">
            {eligibilityCriteria.length === 0 && (
              <span className="text-sm text-muted-foreground">No specific criteria</span>
            )}
            
            {eligibilityCriteria.map((criteria, index) => {
              let icon = null;
              let label = "";
              
              if (criteria.type === "zipCode") {
                icon = <MapPin className="h-3 w-3" />;
                label = "Zip Codes";
              } else if (criteria.type === "income") {
                icon = <Banknote className="h-3 w-3" />;
                label = "Income Levels"; 
              } else if (criteria.type === "disasterEvent") {
                icon = <AlertTriangle className="h-3 w-3" />;
                label = "Disaster Events";
              } else if (criteria.type === "householdSize") {
                icon = <Users className="h-3 w-3" />;
                label = "Household Size";
              } else if (criteria.type === "custom") {
                icon = <GanttChart className="h-3 w-3" />;
                label = criteria.name || "Custom";
              }
              
              return (
                <TooltipProvider key={index}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        {icon}
                        <span>{label}</span>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {criteria.type === "zipCode" && "Geographic location requirements"}
                        {criteria.type === "income" && "Income level requirements"}
                        {criteria.type === "disasterEvent" && "Disaster-related requirements"}
                        {criteria.type === "householdSize" && "Household size requirements"}
                        {criteria.type === "custom" && (criteria.description || "Custom criteria")}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between pt-2">
        <div className="flex items-center text-sm">
          <Globe className="h-4 w-4 text-muted-foreground mr-1" />
          <span className="text-muted-foreground">
            {opportunity.organizationName || "Organization"}
          </span>
        </div>
        
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(opportunity)}>
                <ClipboardEdit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(opportunity.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardFooter>
    </Card>
  );
}