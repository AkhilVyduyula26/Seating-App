
'use client';

import { useState, useTransition, useEffect } from 'react';
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
import { validateFacultyAction, getFacultyAuthDataAction, updateFacultyAuthDataAction } from '@/lib/actions';
import {
  KeyRound,
  UserCheck,
  Loader2,
  Unlock,
  ShieldAlert,
  Edit,
} from 'lucide-react';
import { Textarea } from './ui/textarea';


const FacultyAuthSchema = z.object({
  facultyId: z.string().min(1, 'Faculty ID is required.'),
  secureKey: z.string().min(1, 'Secure key is required.'),
});

type FacultyAuthType = z.infer<typeof FacultyAuthSchema>;

export default function FacultyView() {
  const [isPending, startTransition] = useTransition();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [facultyData, setFacultyData] = useState('');
  const { toast } = useToast();

  const form = useForm<FacultyAuthType>({
    resolver: zodResolver(FacultyAuthSchema),
    defaultValues: {
      facultyId: '',
      secureKey: '',
    },
  });

  const fetchFacultyData = () => {
      startTransition(async () => {
        const result = await getFacultyAuthDataAction();
        if(result.success && result.data){
            setFacultyData(result.data);
        } else {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: result.error || 'Could not load faculty data.',
            });
        }
      });
  }

  const onSubmit: SubmitHandler<FacultyAuthType> = (data) => {
    startTransition(async () => {
      setIsAuthorized(false);
      
      const result = await validateFacultyAction(
        data.facultyId,
        data.secureKey
      );

      if (result.isValid) {
        setIsAuthorized(true);
        fetchFacultyData();
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

  const handleSave = () => {
    startTransition(async () => {
        const result = await updateFacultyAuthDataAction(facultyData);
        if (result.success) {
            toast({
                title: 'Saved',
                description: 'Your changes have been saved.',
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Save Failed',
                description: result.error || 'An unexpected error occurred.',
            });
        }
    });
  }

  return (
    <div className="w-full mx-auto">
      <CardHeader className="p-0 mb-4">
        <CardDescription>
          To edit the faculty access list, enter valid credentials to unlock the editor.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="facultyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-xs">
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
                    <FormLabel className="flex items-center gap-2 text-xs">
                      <KeyRound /> Secure Key
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter the secure key"
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

        {isPending && !facultyData && !isAuthorized &&(
          <div className="mt-4 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Validating...</p>
          </div>
        )}

        <div className="mt-4">
          {isAuthorized ? (
            <div className="animate-in fade-in duration-500 space-y-4">
               <Textarea
                placeholder="Loading document content..."
                value={facultyData}
                onChange={(e) => setFacultyData(e.target.value)}
                rows={8}
                className="bg-green-50/50 border-green-200 focus:ring-green-500 font-mono text-xs"
                disabled={isPending}
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                    className="w-full"
                    onClick={handleSave}
                    disabled={isPending}
                >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Edit className="mr-2 h-4 w-4" />}
                    Save Changes
                </Button>
                 <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                    setIsAuthorized(false);
                    setFacultyData('');
                    form.reset({
                        facultyId: '',
                        secureKey: '',
                    });
                    toast({
                        title: 'Locked',
                        description: 'The document is now in read-only mode.',
                    });
                    }}
                >
                    Lock Document
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center p-4 rounded-lg bg-secondary border border-dashed mt-4">
              <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <h3 className="font-semibold">Editor is Locked</h3>
              <p className="text-sm text-muted-foreground">
                Provide credentials to edit.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </div>
  );
}
