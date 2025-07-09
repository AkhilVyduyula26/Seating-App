'use client';

import { useState, useTransition } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { validateFacultyAction } from '@/lib/actions';
import {
  FileUp,
  KeyRound,
  UserCheck,
  Loader2,
  Unlock,
  ShieldAlert,
  Edit,
} from 'lucide-react';
import { Textarea } from './ui/textarea';

const fileToDataUri = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });

const FacultyAuthSchema = z.object({
  facultyPdf: z
    .any()
    .refine((files) => files?.length === 1, 'Faculty PDF is required.'),
  facultyId: z.string().min(1, 'Faculty ID is required.'),
  secureKey: z.string().min(1, 'Secure key is required.'),
});

type FacultyAuthType = z.infer<typeof FacultyAuthSchema>;

export default function FacultyView() {
  const [isPending, startTransition] = useTransition();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const { toast } = useToast();

  const form = useForm<FacultyAuthType>({
    resolver: zodResolver(FacultyAuthSchema),
  });

  const onSubmit: SubmitHandler<FacultyAuthType> = (data) => {
    startTransition(async () => {
      setIsAuthorized(false);
      const facultyFile = data.facultyPdf[0] as File;
      const facultyPdfDataUri = await fileToDataUri(facultyFile);

      const result = await validateFacultyAction(
        facultyPdfDataUri,
        data.facultyId,
        data.secureKey
      );

      if (result.isValid) {
        setIsAuthorized(true);
        toast({
          title: 'Validation Successful',
          description: 'Editing mode has been unlocked.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Validation Failed',
          description:
            result.error ||
            'The provided Faculty ID or Secure Key is incorrect.',
        });
      }
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck />
          Faculty Document Access
        </CardTitle>
        <CardDescription>
          Upload the faculty authorization PDF and enter your credentials to
          unlock editing capabilities.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="facultyPdf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <FileUp /> Faculty Authorization PDF
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => field.onChange(e.target.files)}
                      disabled={isPending || isAuthorized}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="facultyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <UserCheck /> Faculty ID
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your Faculty ID"
                        {...field}
                        disabled={isPending || isAuthorized}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="secureKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <KeyRound /> Secure Key
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter the document's secure key"
                        {...field}
                        disabled={isPending || isAuthorized}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {!isAuthorized && (
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Unlock className="mr-2 h-4 w-4" />
                )}
                Validate & Unlock
              </Button>
            )}
          </form>
        </Form>

        {isPending && (
          <div className="mt-8 flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-medium">
              AI is validating your credentials...
            </p>
            <p className="text-sm">Please wait a moment.</p>
          </div>
        )}

        <div className="mt-8">
          {isAuthorized ? (
            <div className="animate-in fade-in duration-500 space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-green-600">
                <Unlock /> Document in Edit Mode
              </h3>
              <Textarea
                placeholder="You can now edit the document content here..."
                rows={10}
                className="bg-green-50/50 border-green-200 focus:ring-green-500"
              />
              <Button
                className="w-full"
                onClick={() => {
                  /* Handle save logic here */
                  toast({
                    title: 'Saved',
                    description: 'Your changes have been saved.',
                  });
                }}
              >
                <Edit className="mr-2" /> Save Changes
              </Button>
            </div>
          ) : (
            <div className="text-center p-4 rounded-lg bg-secondary border border-dashed">
              <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <h3 className="font-semibold">Document is Read-Only</h3>
              <p className="text-sm text-muted-foreground">
                Please provide valid credentials to unlock editing.
              </p>
            </div>
          )}
        </div>
      </CardContent>
      {isAuthorized && (
        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setIsAuthorized(false);
              form.reset({
                facultyPdf: null,
                facultyId: '',
                secureKey: '',
              });
              toast({
                title: 'Locked',
                description: 'The document is now in read-only mode.',
              });
            }}
          >
            Lock Document & Reset
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
