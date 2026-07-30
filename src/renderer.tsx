import { jsxRenderer } from 'hono/jsx-renderer'
import { Link, Script, ViteClient } from 'vite-ssr-components/hono'

export const renderer = jsxRenderer(({ children }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Payment Gateway</title>
        <ViteClient />
        <Link href="/src/client/style.css" rel="stylesheet" />
      </head>
      <body>
        <div id="root">{children}</div>
        <Script src="/src/client/main.tsx" />
      </body>
    </html>
  )
})
