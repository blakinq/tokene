"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const css = `:root {
  --color-brand-500: #2f6feb;
  --color-brand-600: #1e54c6;
  --color-bg-surface: #ffffff;
  --color-text-default: #0b0d10;
  --space-2: 8px;
  --space-3: 12px;
  --radius-md: 8px;
}`;

const scss = `$color-brand-500: #2f6feb;
$color-brand-600: #1e54c6;
$color-bg-surface: #ffffff;
$color-text-default: #0b0d10;
$space-2: 8px;
$space-3: 12px;
$radius-md: 8px;`;

const ts = `export const tokens = {
  color: {
    brand: { 500: "#2f6feb", 600: "#1e54c6" },
    bg:    { surface: "#ffffff" },
    text:  { default: "#0b0d10" },
  },
  space:  { 2: 8, 3: 12 },
  radius: { md: 8 },
} as const;`;

const json = `{
  "color": {
    "brand": {
      "500": { "value": "#2f6feb", "type": "color" },
      "600": { "value": "#1e54c6", "type": "color" }
    },
    "bg":   { "surface": { "value": "#ffffff", "type": "color" } },
    "text": { "default": { "value": "#0b0d10", "type": "color" } }
  },
  "space":  { "2": { "value": 8 }, "3": { "value": 12 } },
  "radius": { "md": { "value": 8 } }
}`;

function Block({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md border bg-muted/40 p-5 font-mono text-[12.5px] leading-relaxed text-foreground/90">
      <code>{children}</code>
    </pre>
  );
}

export function ExportsPreview() {
  return (
    <Tabs defaultValue="css" className="w-full">
      <TabsList className="bg-transparent p-0 gap-1">
        <TabsTrigger value="css">CSS</TabsTrigger>
        <TabsTrigger value="scss">SCSS</TabsTrigger>
        <TabsTrigger value="ts">TypeScript</TabsTrigger>
        <TabsTrigger value="json">Style Dictionary</TabsTrigger>
      </TabsList>
      <TabsContent value="css" className="mt-4">
        <Block>{css}</Block>
      </TabsContent>
      <TabsContent value="scss" className="mt-4">
        <Block>{scss}</Block>
      </TabsContent>
      <TabsContent value="ts" className="mt-4">
        <Block>{ts}</Block>
      </TabsContent>
      <TabsContent value="json" className="mt-4">
        <Block>{json}</Block>
      </TabsContent>
    </Tabs>
  );
}
