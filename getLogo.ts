import OpenAI from 'openai';
import { ImagesResponse } from 'openai/resources';

require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function imagine(logoPrompt: string) {

  const resGenerate: ImagesResponse = await generate(logoPrompt)
  // const resGenerate = mockGenerate()

  console.log(resGenerate)

  const images: string[] = resGenerate.data.map((urlObj) => urlObj.url as string);

  return images
}

async function generate(logoPrompt: string): Promise<ImagesResponse> {
  try {
    const response = await openai.images.generate({
      prompt: logoPrompt,
      n: 4,
      size: "1024x1024",
    });
    return response
  } catch (error: any) {
    console.log('getLogo.ts error: ', error.message)
    throw new Error('Failed to generate image');
  }
}

function mockGenerate() {
  return {
    created: 1694024254,
    data: [
      {
        url: 'https://oaidalleapiprodscus.blob.core.windows.net/private/org-BqXX3Qz89sJD3J1nPpCEopAX/user-GyANiu1SyORPmXo5Z62TWeru/img-JXKFnJrrkvBHNlaJYtUk0Gkr.png?st=2023-09-06T17%3A17%3A33Z&se=2023-09-06T19%3A17%3A33Z&sp=r&sv=2021-08-06&sr=b&rscd=inline&rsct=image/png&skoid=6aaadede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2023-09-06T17%3A25%3A20Z&ske=2023-09-07T17%3A25%3A20Z&sks=b&skv=2021-08-06&sig=3sl6hB6F50UrC9LoQD1pFCCfhnU03U%2B7yecfvCHzafM%3D'
      },
      {
        url: 'https://oaidalleapiprodscus.blob.core.windows.net/private/org-BqXX3Qz89sJD3J1nPpCEopAX/user-GyANiu1SyORPmXo5Z62TWeru/img-Gh2ajbGvE5r85VKt8OsuNAwj.png?st=2023-09-06T17%3A17%3A34Z&se=2023-09-06T19%3A17%3A34Z&sp=r&sv=2021-08-06&sr=b&rscd=inline&rsct=image/png&skoid=6aaadede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2023-09-06T17%3A25%3A20Z&ske=2023-09-07T17%3A25%3A20Z&sks=b&skv=2021-08-06&sig=8c8kuYwR5nPgkPusjzTvqTdcSbTrqG/UrUOnQWNPT2M%3D'
      },
      {
        url: 'https://oaidalleapiprodscus.blob.core.windows.net/private/org-BqXX3Qz89sJD3J1nPpCEopAX/user-GyANiu1SyORPmXo5Z62TWeru/img-ExFqs4CxzpjKRakgvXJmeR42.png?st=2023-09-06T17%3A17%3A34Z&se=2023-09-06T19%3A17%3A34Z&sp=r&sv=2021-08-06&sr=b&rscd=inline&rsct=image/png&skoid=6aaadede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2023-09-06T17%3A25%3A20Z&ske=2023-09-07T17%3A25%3A20Z&sks=b&skv=2021-08-06&sig=uCFneWu7s8aqJcs2Fgr5b/eeCXNs8yHw3XOv6UIBB3U%3D'
      },
      {
        url: 'https://oaidalleapiprodscus.blob.core.windows.net/private/org-BqXX3Qz89sJD3J1nPpCEopAX/user-GyANiu1SyORPmXo5Z62TWeru/img-Pz40cpFT5s3cx8myKKqe7xy8.png?st=2023-09-06T17%3A17%3A33Z&se=2023-09-06T19%3A17%3A33Z&sp=r&sv=2021-08-06&sr=b&rscd=inline&rsct=image/png&skoid=6aaadede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2023-09-06T17%3A25%3A20Z&ske=2023-09-07T17%3A25%3A20Z&sks=b&skv=2021-08-06&sig=Cus4En2dFvwFlqg62vanvG2Jm3sBwjb%2BkeEuw5GwFcQ%3D'
      }
    ]
  }
}

