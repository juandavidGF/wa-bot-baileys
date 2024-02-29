import Replicate from "replicate";
require('dotenv').config();

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN as string,
});

export default async function imagine(logoPrompt: string) {
  console.log('genSticker 1')
  const output = await replicate.run(
    "fofr/sticker-maker:58a7099052ed9928ee6a65559caa790bfa8909841261ef588686660189eb9dc8",
    {
      input: {
        steps: 20,
        width: 1024,
        height: 1024,
        prompt: logoPrompt,
        upscale: true,
        upscale_steps: 10,
        negative_prompt: ""
      }
    }
  );

  console.log(output);

  return output;
}