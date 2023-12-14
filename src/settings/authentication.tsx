import { zodResolver } from '@hookform/resolvers/zod'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const profileFormSchema = z.object({
  username: z.string().min(1).optional(),
  password: z.string().min(12).optional().or(z.string().max(0)),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export default function SettingsAuthentication() {
  // This can come from your database or API.
  const defaultValues: Partial<ProfileFormValues> = {}

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
    mode: 'onBlur',
  })

  // const { fields, append } = useFieldArray({
  //   name: 'username',
  //   control: form.control,
  // })

  async function onSubmit(data: ProfileFormValues) {
    console.log('sbumit', data)
    // patch to /auth/user
    const ok = await axios.patch('/api/auth/user', data)
    alert('ok ' + ok.data?.message)
    // toast({
    //   title: 'You submitted the following values:',
    //   description: (
    //     <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
    //       <code className="text-white">{JSON.stringify(data, null, 2)}</code>
    //     </pre>
    //   ),
    // })
  }

  return (
    <div className="p-6">
      <div className="space-y-0.5 mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Authentication</h2>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 max-w-[40em]"
          autoComplete="off"
        >
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username (or email)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Defaults to 'admin'"
                    autoComplete="username"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Used to sign in. Email address is used to recover access to
                  Hivepanel. It is never collected.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Leave empty to keep same password"
                    type="password"
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Used to sign in. Consider using a password manager.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">Save changes</Button>
        </form>
      </Form>
    </div>
  )
}
