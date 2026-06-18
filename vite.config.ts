import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { tanstackRouter } from '@tanstack/router-plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import ttsHandler from './api/tts'
import voixHandler from './api/voix'
import askHandler from './api/ask'

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch {
        resolve({})
      }
    })
    req.on('error', () => resolve({}))
  })
}

function adaptResponse(res: ServerResponse) {
  return {
    status(code: number) {
      res.statusCode = code
      return this
    },
    json(body: unknown) {
      if (!res.headersSent) res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(body))
    },
    send(body: Buffer) {
      res.end(body)
    },
    setHeader(name: string, value: string) {
      res.setHeader(name, value)
    },
  }
}

function localApiPlugin(): Plugin {
  return {
    name: 'pulse-local-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (!req.url?.startsWith('/api/')) {
          next()
          return
        }

        const path = req.url.split('?')[0]
        const body = await readJson(req)
        const adaptedReq = { method: req.method, body }
        const adaptedRes = adaptResponse(res)

        if (path === '/api/tts') {
          await ttsHandler(adaptedReq, adaptedRes)
          return
        }

        if (path === '/api/voix') {
          await voixHandler(adaptedReq, adaptedRes)
          return
        }

        if (path === '/api/ask') {
          await askHandler(adaptedReq, adaptedRes)
          return
        }

        next()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const key of ['OPENAI_API_KEY', 'OPENAI_TTS_MODEL', 'OPENAI_TTS_VOICE', 'OPENROUTER_KEY', 'OPENROUTER_MODEL']) {
    if (!process.env[key] && env[key]) process.env[key] = env[key]
  }

  return {
    resolve: { tsconfigPaths: true },
    plugins: [
      devtools(),
      tailwindcss(),
      localApiPlugin(),
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      viteReact(),
    ],
  }
})
