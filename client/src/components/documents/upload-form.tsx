import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface UploadFormProps {
  onSuccess?: () => void;
}

export default function UploadForm({ onSuccess }: UploadFormProps) {
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      name: "",
      file: null as File | null,
    },
  });

  async function onSubmit(values: any) {
    console.log('Form submitted with values:', values); // Debug log

    try {
      const formData = new FormData();
      formData.append("name", values.name);
      if (values.file) {
        console.log('Appending file to form:', values.file.name); // Debug log
        formData.append("file", values.file);
      }

      console.log('Sending request to /api/documents'); // Debug log
      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.text();
        console.error('Upload failed:', error); // Debug log
        throw new Error(`Upload failed: ${error}`);
      }

      const result = await res.json();
      console.log('Upload successful:', result); // Debug log

      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error in upload:', error); // Debug log
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload document",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" encType="multipart/form-data">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="file"
          render={({ field: { value, onChange, ...field } }) => (
            <FormItem>
              <FormLabel>File</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    console.log('File selected:', file?.name); // Debug log
                    onChange(file);
                  }}
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit">Upload</Button>
      </form>
    </Form>
  );
}