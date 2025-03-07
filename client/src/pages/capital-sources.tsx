import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DollarSign, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { Label } from "@/components/ui/label";

const sourceSchema = z.object({
  type: z.enum(["FEMA", "Insurance", "Grant"]),
  name: z.string().min(1, "Name is required"),
  amount: z.string().min(1, "Amount is required"),
  status: z.enum(["current", "projected"]),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof sourceSchema>;

export default function CapitalSources() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: sources } = useQuery({
    queryKey: ["/api/capital-sources"],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(sourceSchema),
    defaultValues: {
      type: "FEMA",
      name: "",
      amount: "",
      status: "current",
      description: "",
    },
  });

  const getAllCurrentTotal = () => {
    return sources
      ?.filter((s) => s.status === "current")
      .reduce((sum, source) => sum + Number(source.amount), 0) || 0;
  };

  const getAllProjectedTotal = () => {
    return sources
      ?.filter((s) => s.status === "projected")
      .reduce((sum, source) => sum + Number(source.amount), 0) || 0;
  };

  const getAllTotal = () => {
    return getAllCurrentTotal() + getAllProjectedTotal();
  };

  async function onSubmit(values: FormValues) {
    try {
      const source = await apiRequest("POST", "/api/capital-sources", {
        ...values,
        amount: Number(values.amount),
      });

      const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
      if (fileInput?.files?.length) {
        const formData = new FormData();
        formData.append("file", fileInput.files[0]);
        formData.append("name", fileInput.files[0].name);
        formData.append("capitalSourceId", source.id.toString());

        const uploadRes = await fetch("/api/documents", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload document");
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/capital-sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });

      toast({
        title: "Success",
        description: "Capital source and documents added successfully",
      });
      form.reset();
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add capital source",
      });
    }
  }

  async function deleteSource(id: number) {
    try {
      await apiRequest("DELETE", `/api/capital-sources/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/capital-sources"] });
      toast({
        title: "Success",
        description: "Capital source deleted successfully",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete capital source",
      });
    }
  }

  // Sample funding opportunities data
  const fundingOpportunities = [
    {
      id: 1,
      name: "Disaster Recovery Grant",
      agency: "State Emergency Management",
      deadline: "2025-04-01",
      maxAmount: 25000,
      description: "Emergency assistance for households affected by natural disasters",
    },
    {
      id: 2,
      name: "Home Repair Program",
      agency: "Housing Department",
      deadline: "2025-03-31",
      maxAmount: 15000,
      description: "Funding for essential home repairs due to disaster damage",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Capital Sources</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Source
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Capital Source</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="FEMA">FEMA</SelectItem>
                          <SelectItem value="Insurance">Insurance</SelectItem>
                          <SelectItem value="Grant">Grant</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Source name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="current">Current</SelectItem>
                          <SelectItem value="projected">Projected</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Additional details about this source"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <Label htmlFor="document">Supporting Document</Label>
                  <Input
                    id="document"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                  />
                  <p className="text-sm text-muted-foreground">
                    Upload any supporting documentation for this capital source
                  </p>
                </div>
                <Button type="submit">Add Source</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Current</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${getAllCurrentTotal().toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Projected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${getAllProjectedTotal().toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ${getAllTotal().toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Capital Sources Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Your Capital Sources</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sources?.map((source) => (
            <Card key={source.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{source.name}</h3>
                    <p className="text-sm text-muted-foreground">{source.type}</p>
                    <p className="text-sm font-medium">
                      ${Number(source.amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {source.status}
                    </p>
                    {source.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {source.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteSource(source.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Funding Opportunities Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Available Funding Opportunities</h2>
          <Button 
            variant="outline"
            onClick={() => window.location.href = 'mailto:support@chasarnold.com?subject=New Funding Opportunity'}
          >
            <Plus className="mr-2 h-4 w-4" />
            Report New Opportunity
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {fundingOpportunities.map((opportunity) => (
            <Card key={opportunity.id}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="font-semibold">{opportunity.name}</h3>
                    <p className="text-sm text-muted-foreground">{opportunity.agency}</p>
                    <p className="text-sm font-medium">
                      Up to ${opportunity.maxAmount.toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">Deadline:</span>{" "}
                      {new Date(opportunity.deadline).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {opportunity.description}
                    </p>
                  </div>
                  <Button className="w-full">
                    Begin Application
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}