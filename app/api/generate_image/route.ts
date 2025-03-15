// a next.js route that handles a JSON post request with prompt and model
// and calls the Cloudflare Workers AI model

import type { NextRequest } from 'next/server'
import { getRequestContext } from '@cloudflare/next-on-pages'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const context = getRequestContext()
    const { AI, BUCKET } = context.env
    let { prompt, model } = await request.json<{ prompt: string, model: string }>()
    if (!model) model = "@cf/black-forest-labs/flux-1-schnell"

    const inputs = { prompt }
    const response = await AI.run(model, inputs)

    const promptKey = encodeURIComponent(prompt.replace(/\s/g, '-'))
    const binaryString = atob(response.image);

    // @ts-ignore
    const img = Uint8Array.from(binaryString, (m) => m.codePointAt(0));
    try {
      await BUCKET.put(`${promptKey}.jpeg`, img);
      console.log('图像数据已成功保存到 Cloudflare R2 存储桶');
    } catch (error) {
          console.error('保存图像数据到 Cloudflare R2 存储桶时出错:', error);
    }

    return new Response(`data:image/jpeg;base64,${response.image}`, {
      headers: {
        'Content-Type': 'image/jpeg',
      },
    })
  } catch (error: any) {
    console.log(error)
    return new Response(error.message, { status: 500 })
  }
}
