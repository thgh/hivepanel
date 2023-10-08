'use client'

import type { ContainerTaskSpec } from 'dockerode'
import { useEffect, useState } from 'react'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { engine, updateService } from '@/lib/docker-client'
import { refreshServices } from '@/lib/useRefresh'

import type { Service } from '../lib/docker'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet'
import { Textarea } from './ui/textarea'

export function EditServiceSheet({
  value,
  children,
}: {
  children: React.ReactNode
  value: Service
}) {
  const [editor, setEditor] = useState(value.Spec)
  const [json, setJSON] = useState('')
  const invalid = json ? !isValidJSON(json) : false
  const label = (key: string, value: string) => {
    if (json) setJSON('')
    setEditor((spec) => ({ ...spec, Labels: { ...spec.Labels, [key]: value } }))
  }

  useEffect(() => {
    if (!invalid && json) setEditor(JSON.parse(json))
  }, [!invalid && json])

  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent
        side="right"
        className="md:max-w-full w-[400px] sm:w-[800px] h-full flex flex-col bg-white"
      >
        <form
          className="contents"
          onSubmit={async (e) => {
            e.preventDefault()
            await updateService(value, () => (json ? JSON.parse(json) : editor))
            refreshServices(6)
            console.log('submit', json)
          }}
        >
          <SheetHeader>
            <SheetTitle>Edit service</SheetTitle>
            <SheetDescription>
              Make changes to the service spec.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Docker image
              </Label>
              <Input
                id="name"
                value={
                  editor.Labels!['hive.deploy.image'] ||
                  (editor.TaskTemplate as ContainerTaskSpec)?.ContainerSpec
                    ?.Image ||
                  ''
                }
                onChange={(evt) => label('hive.deploy.image', evt.target.value)}
                placeholder={
                  (editor.TaskTemplate as ContainerTaskSpec)?.ContainerSpec
                    ?.Image || 'nginxdemos/hello'
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Hostnames
              </Label>
              <Input
                id="name"
                value={editor.Labels!['hive.hostnames'] || ''}
                onChange={(evt) => label('hive.hostnames', evt.target.value)}
                placeholder={
                  (editor.TaskTemplate as ContainerTaskSpec)?.ContainerSpec
                    ?.Image || 'nginxdemos/hello'
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="update" className="text-right">
                Update strategy
              </Label>
              <Select
                onValueChange={(value) => label('hive.update', value)}
                defaultValue={editor.Labels!['hive.update']}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Stop then start" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stop-first">Stop then start</SelectItem>
                  <SelectItem value="start-first">Zero-downtime</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Tint
              </Label>
              <Input
                type="range"
                id="username"
                min={0}
                max={360}
                value={editor.Labels!['hive.tint']}
                onChange={(evt) => label('hive.tint', evt.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <div className="flex flex-col w-full gap-1.5 flex-1">
            <Label htmlFor="message">Spec</Label>
            <Textarea
              className="flex-1 font-mono"
              placeholder="{ ...Spec }"
              id="message"
              value={json || JSON.stringify(editor, null, 2)}
              onChange={(e) => setJSON(e.target.value)}
            />
          </div>
          <SheetFooter>
            <Button
              type="button"
              onClick={async () => {
                if (!confirm('Are you sure?')) return
                await engine.delete('/services/' + value.ID)
                refreshServices(3)
              }}
            >
              Delete
            </Button>
            <SheetClose asChild>
              <Button type="submit" disabled={invalid}>
                Save changes
              </Button>
            </SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function isValidJSON(str: string) {
  try {
    JSON.parse(str)
  } catch (e) {
    return false
  }
  return true
}
