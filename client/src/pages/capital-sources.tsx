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
import { DollarSign, Plus } from "lucide-react";
import { z } from "zod";

const sourceSchema = z.object({
  type: z.enum(["FEMA", "Insurance", "Grant"]),
  name: z.string().min(1, "Name is required"),
  amount: z.string().min(1, "Amount is required"),
  status: z.enum(["current", "projected"]),
  description: z.string().optional(),
});

export default function CapitalSources() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: sources } = useQuery({
    queryKey: ["/api/capital-sources"],
  });

  const form = useForm({
    resolver: zodResolver(sourceSchema),
    defaultValues: {
      type: "FEMA",
      name: "",
      amount: "",
      status: "current",
      description: "",
    },
  });

  const getCurrentTotal = (type: string) => {
    return sources
      ?.filter((s) => s.type === type && s.status === "current")
      .reduce((sum, source) => sum + Number(source.amount), 0) || 0;
  };

  const getProjectedTotal = (type: string) => {
    return sources
      ?.filter((s) => s.type === type && s.status === "projected")
      .reduce((sum, source) => sum + Number(source.amount), 0) || 0;
  };

  async function onSubmit(values: z.infer<typeof sourceSchema>) {
    try {
      await apiRequest("POST", "/api/capital-sources", {
        ...values,
        amount: Number(values.amount),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/capital-sources"] });
      toast({
        title: "Success",
        description: "Capital source added successfully",
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
                <Button type="submit">Add Source</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Tiles */}
      <div className="grid gap-4 md:grid-cols-3">
        {["FEMA", "Insurance", "Grant"].map((type) => (
          <Card key={type}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{type}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-2xl font-bold">
                  ${getCurrentTotal(type).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  Projected: ${getProjectedTotal(type).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* List of Sources */}
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
