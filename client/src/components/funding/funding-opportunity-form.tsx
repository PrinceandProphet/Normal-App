import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, X, Plus, Trash2, Pencil, Save } from "lucide-react";

// Create a schema for the form with all funding opportunity fields
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  organizationId: z.number(),
  applicationStartDate: z.date().optional(),
  applicationEndDate: z.date().optional(),
  awardAmount: z.string().transform((val) => val === "" ? null : Number(val)),
  isPublic: z.boolean().default(false),
  eligibilityCriteria: z.array(
    z.object({
      type: z.enum(["zipCode", "income", "disasterEvent", "householdSize", "custom"]),
      // For zipCode type
      ranges: z.array(
        z.object({
          min: z.string().optional(),
          max: z.string().optional(),
        })
      ).optional(),
      // For income type
      incomeRanges: z.array(
        z.object({
          min: z.number().optional(),
          max: z.number().optional(),
        })
      ).optional(),
      // For disasterEvent type
      events: z.array(z.string()).optional(),
      // For householdSize type
      sizeRanges: z.array(
        z.object({
          min: z.number().optional(),
          max: z.number().optional(),
        })
      ).optional(),
      // For custom type
      name: z.string().optional(),
      description: z.string().optional(),
      value: z.string().optional(),
    })
  ).default([]),
});

export default function FundingOpportunityForm({ opportunity, onClose }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");
  
  // Create form with default values
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: opportunity?.name || "",
      description: opportunity?.description || "",
      organizationId: opportunity?.organizationId || user?.organizationId || 0,
      applicationStartDate: opportunity?.applicationStartDate ? new Date(opportunity.applicationStartDate) : undefined,
      applicationEndDate: opportunity?.applicationEndDate ? new Date(opportunity.applicationEndDate) : undefined,
      awardAmount: opportunity?.awardAmount?.toString() || "",
      isPublic: opportunity?.isPublic || false,
      eligibilityCriteria: [],
    },
  });

  // Field array for eligibility criteria
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "eligibilityCriteria",
  });

  // Query to get organizations for the select dropdown
  const { data: organizations } = useQuery({
    queryKey: ["/api/organizations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/organizations");
      return await res.json();
    },
    enabled: user?.role === "super_admin", // Only fetch if super admin
  });

  // Create opportunity mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const res = await apiRequest("POST", "/api/funding", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Funding opportunity created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/funding"] });
      queryClient.invalidateQueries({ queryKey: ["/api/funding/public"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create funding opportunity",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Update opportunity mutation
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const res = await apiRequest("PATCH", `/api/funding/${opportunity.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Funding opportunity updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/funding"] });
      queryClient.invalidateQueries({ queryKey: ["/api/funding/public"] });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update funding opportunity",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Handle form submission
  const onSubmit = (data) => {
    if (opportunity) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  // Initialize eligibility criteria from existing opportunity
  useEffect(() => {
    if (opportunity?.eligibilityCriteria) {
      try {
        const criteria = typeof opportunity.eligibilityCriteria === 'string'
          ? JSON.parse(opportunity.eligibilityCriteria)
          : opportunity.eligibilityCriteria;
        
        // Reset the form with the parsed criteria
        form.setValue("eligibilityCriteria", criteria);
      } catch (error) {
        console.error("Error parsing eligibility criteria:", error);
      }
    }
  }, [opportunity, form]);

  // Add a new eligibility criteria
  const addCriteria = (type) => {
    let newCriteria = { type };
    
    // Add default fields based on type
    if (type === "zipCode") {
      newCriteria.ranges = [{ min: "", max: "" }];
    } else if (type === "income") {
      newCriteria.incomeRanges = [{ min: 0, max: 0 }];
    } else if (type === "disasterEvent") {
      newCriteria.events = [""];
    } else if (type === "householdSize") {
      newCriteria.sizeRanges = [{ min: 0, max: 0 }];
    } else if (type === "custom") {
      newCriteria.name = "";
      newCriteria.description = "";
      newCriteria.value = "";
    }
    
    append(newCriteria);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="general">General Information</TabsTrigger>
            <TabsTrigger value="eligibility">Eligibility Criteria</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4 mt-4">
            {/* Name field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Funding opportunity name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Description field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the funding opportunity" 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Organization field (only for super_admin) */}
            {user?.role === "super_admin" && (
              <FormField
                control={form.control}
                name="organizationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select organization" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {organizations?.map((org) => (
                          <SelectItem key={org.id} value={org.id.toString()}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {/* Award amount field */}
            <FormField
              control={form.control}
              name="awardAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Award Amount</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Application start date field */}
            <FormField
              control={form.control}
              name="applicationStartDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Application Start Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Select start date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Application end date field */}
            <FormField
              control={form.control}
              name="applicationEndDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Application End Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Select end date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => 
                          date < new Date("1900-01-01") || 
                          (form.getValues("applicationStartDate") && date < form.getValues("applicationStartDate"))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Public visibility toggle */}
            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Public Visibility</FormLabel>
                    <FormDescription>
                      Make this funding opportunity visible to all users
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </TabsContent>
          
          <TabsContent value="eligibility" className="space-y-4 mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Eligibility Criteria</h3>
              
              <div className="flex gap-2">
                <Select onValueChange={(value) => addCriteria(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Add criteria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zipCode">Zip Code Range</SelectItem>
                    <SelectItem value="income">Income Range</SelectItem>
                    <SelectItem value="disasterEvent">Disaster Event</SelectItem>
                    <SelectItem value="householdSize">Household Size</SelectItem>
                    <SelectItem value="custom">Custom Criteria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {fields.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No eligibility criteria defined. Add criteria to define who is eligible for this funding.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <Card key={field.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">
                            {field.type === "zipCode" && "Zip Code Range"}
                            {field.type === "income" && "Income Range"}
                            {field.type === "disasterEvent" && "Disaster Event"}
                            {field.type === "householdSize" && "Household Size"}
                            {field.type === "custom" && (form.getValues(`eligibilityCriteria.${index}.name`) || "Custom Criteria")}
                          </CardTitle>
                          <Badge variant="outline">{field.type}</Badge>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => remove(index)}
                          className="h-7 w-7 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      {/* Zip Code Criteria */}
                      {field.type === "zipCode" && (
                        <div className="space-y-2">
                          <FormLabel>Zip Code Ranges</FormLabel>
                          {form.getValues(`eligibilityCriteria.${index}.ranges`)?.map((_, rangeIndex) => (
                            <div key={rangeIndex} className="flex items-center gap-2">
                              <Input
                                placeholder="Min (e.g., 90001)"
                                value={form.getValues(`eligibilityCriteria.${index}.ranges.${rangeIndex}.min`) || ""}
                                onChange={(e) => {
                                  const ranges = [...form.getValues(`eligibilityCriteria.${index}.ranges`)];
                                  ranges[rangeIndex].min = e.target.value;
                                  form.setValue(`eligibilityCriteria.${index}.ranges`, ranges);
                                }}
                              />
                              <span>to</span>
                              <Input
                                placeholder="Max (e.g., 90210)"
                                value={form.getValues(`eligibilityCriteria.${index}.ranges.${rangeIndex}.max`) || ""}
                                onChange={(e) => {
                                  const ranges = [...form.getValues(`eligibilityCriteria.${index}.ranges`)];
                                  ranges[rangeIndex].max = e.target.value;
                                  form.setValue(`eligibilityCriteria.${index}.ranges`, ranges);
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const ranges = [...form.getValues(`eligibilityCriteria.${index}.ranges`)];
                                  ranges.splice(rangeIndex, 1);
                                  form.setValue(`eligibilityCriteria.${index}.ranges`, ranges);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const ranges = [...form.getValues(`eligibilityCriteria.${index}.ranges`) || []];
                              ranges.push({ min: "", max: "" });
                              form.setValue(`eligibilityCriteria.${index}.ranges`, ranges);
                            }}
                            className="mt-2"
                          >
                            <Plus className="h-4 w-4 mr-2" /> Add Range
                          </Button>
                        </div>
                      )}
                      
                      {/* Income Range Criteria */}
                      {field.type === "income" && (
                        <div className="space-y-2">
                          <FormLabel>Income Ranges</FormLabel>
                          {form.getValues(`eligibilityCriteria.${index}.incomeRanges`)?.map((_, rangeIndex) => (
                            <div key={rangeIndex} className="flex items-center gap-2">
                              <Input
                                type="number"
                                placeholder="Min Amount"
                                value={form.getValues(`eligibilityCriteria.${index}.incomeRanges.${rangeIndex}.min`) || ""}
                                onChange={(e) => {
                                  const ranges = [...form.getValues(`eligibilityCriteria.${index}.incomeRanges`)];
                                  ranges[rangeIndex].min = Number(e.target.value);
                                  form.setValue(`eligibilityCriteria.${index}.incomeRanges`, ranges);
                                }}
                              />
                              <span>to</span>
                              <Input
                                type="number"
                                placeholder="Max Amount"
                                value={form.getValues(`eligibilityCriteria.${index}.incomeRanges.${rangeIndex}.max`) || ""}
                                onChange={(e) => {
                                  const ranges = [...form.getValues(`eligibilityCriteria.${index}.incomeRanges`)];
                                  ranges[rangeIndex].max = Number(e.target.value);
                                  form.setValue(`eligibilityCriteria.${index}.incomeRanges`, ranges);
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const ranges = [...form.getValues(`eligibilityCriteria.${index}.incomeRanges`)];
                                  ranges.splice(rangeIndex, 1);
                                  form.setValue(`eligibilityCriteria.${index}.incomeRanges`, ranges);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const ranges = [...form.getValues(`eligibilityCriteria.${index}.incomeRanges`) || []];
                              ranges.push({ min: 0, max: 0 });
                              form.setValue(`eligibilityCriteria.${index}.incomeRanges`, ranges);
                            }}
                            className="mt-2"
                          >
                            <Plus className="h-4 w-4 mr-2" /> Add Range
                          </Button>
                        </div>
                      )}
                      
                      {/* Disaster Event Criteria */}
                      {field.type === "disasterEvent" && (
                        <div className="space-y-2">
                          <FormLabel>Disaster Events</FormLabel>
                          {form.getValues(`eligibilityCriteria.${index}.events`)?.map((_, eventIndex) => (
                            <div key={eventIndex} className="flex items-center gap-2">
                              <Input
                                placeholder="Event name (e.g., Hurricane Maria)"
                                value={form.getValues(`eligibilityCriteria.${index}.events.${eventIndex}`) || ""}
                                onChange={(e) => {
                                  const events = [...form.getValues(`eligibilityCriteria.${index}.events`)];
                                  events[eventIndex] = e.target.value;
                                  form.setValue(`eligibilityCriteria.${index}.events`, events);
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const events = [...form.getValues(`eligibilityCriteria.${index}.events`)];
                                  events.splice(eventIndex, 1);
                                  form.setValue(`eligibilityCriteria.${index}.events`, events);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const events = [...form.getValues(`eligibilityCriteria.${index}.events`) || []];
                              events.push("");
                              form.setValue(`eligibilityCriteria.${index}.events`, events);
                            }}
                            className="mt-2"
                          >
                            <Plus className="h-4 w-4 mr-2" /> Add Event
                          </Button>
                        </div>
                      )}
                      
                      {/* Household Size Criteria */}
                      {field.type === "householdSize" && (
                        <div className="space-y-2">
                          <FormLabel>Household Size Ranges</FormLabel>
                          {form.getValues(`eligibilityCriteria.${index}.sizeRanges`)?.map((_, rangeIndex) => (
                            <div key={rangeIndex} className="flex items-center gap-2">
                              <Input
                                type="number"
                                placeholder="Min size"
                                value={form.getValues(`eligibilityCriteria.${index}.sizeRanges.${rangeIndex}.min`) || ""}
                                onChange={(e) => {
                                  const ranges = [...form.getValues(`eligibilityCriteria.${index}.sizeRanges`)];
                                  ranges[rangeIndex].min = Number(e.target.value);
                                  form.setValue(`eligibilityCriteria.${index}.sizeRanges`, ranges);
                                }}
                              />
                              <span>to</span>
                              <Input
                                type="number"
                                placeholder="Max size"
                                value={form.getValues(`eligibilityCriteria.${index}.sizeRanges.${rangeIndex}.max`) || ""}
                                onChange={(e) => {
                                  const ranges = [...form.getValues(`eligibilityCriteria.${index}.sizeRanges`)];
                                  ranges[rangeIndex].max = Number(e.target.value);
                                  form.setValue(`eligibilityCriteria.${index}.sizeRanges`, ranges);
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const ranges = [...form.getValues(`eligibilityCriteria.${index}.sizeRanges`)];
                                  ranges.splice(rangeIndex, 1);
                                  form.setValue(`eligibilityCriteria.${index}.sizeRanges`, ranges);
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const ranges = [...form.getValues(`eligibilityCriteria.${index}.sizeRanges`) || []];
                              ranges.push({ min: 0, max: 0 });
                              form.setValue(`eligibilityCriteria.${index}.sizeRanges`, ranges);
                            }}
                            className="mt-2"
                          >
                            <Plus className="h-4 w-4 mr-2" /> Add Range
                          </Button>
                        </div>
                      )}
                      
                      {/* Custom Criteria */}
                      {field.type === "custom" && (
                        <div className="space-y-4">
                          <div>
                            <FormLabel>Criteria Name</FormLabel>
                            <Input
                              placeholder="Name for this criteria"
                              value={form.getValues(`eligibilityCriteria.${index}.name`) || ""}
                              onChange={(e) => {
                                form.setValue(`eligibilityCriteria.${index}.name`, e.target.value);
                              }}
                            />
                          </div>
                          
                          <div>
                            <FormLabel>Description</FormLabel>
                            <Textarea
                              placeholder="Describe this eligibility criteria"
                              value={form.getValues(`eligibilityCriteria.${index}.description`) || ""}
                              onChange={(e) => {
                                form.setValue(`eligibilityCriteria.${index}.description`, e.target.value);
                              }}
                            />
                          </div>
                          
                          <div>
                            <FormLabel>Value</FormLabel>
                            <Input
                              placeholder="Value or requirement"
                              value={form.getValues(`eligibilityCriteria.${index}.value`) || ""}
                              onChange={(e) => {
                                form.setValue(`eligibilityCriteria.${index}.value`, e.target.value);
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {(createMutation.isPending || updateMutation.isPending) && (
              <div className="mr-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
            {opportunity ? "Update" : "Create"} Funding Opportunity
          </Button>
        </div>
      </form>
    </Form>
  );
}